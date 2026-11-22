import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { once } from "node:events";
import { copyFile, cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
const root = fileURLToPath(new URL("..", import.meta.url));
const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));
const writeJson = (file, object) => writeFile(file, JSON.stringify(object, null, 2) + "\n");
const npmCli = process.env.npm_execpath;
assert(npmCli, "Run via npm run smoke:package");
const npm = (args, cwd) => run(process.execPath, [npmCli, ...args], { cwd, maxBuffer: 64 * 1024 * 1024 });
const npmRegistry = "https://registry.npmjs.org";

const temp = await mkdtemp(join(tmpdir(), "mingpan-package-"));
try {
  const staging = join(temp, "staging");
  const consumer = join(temp, "consumer");
  await mkdir(staging);
  await mkdir(consumer);
  // Both installs below use an empty user config and a fresh cache, so no
  // earlier run or local setting can answer them.
  const npmConfig = join(temp, "npmrc");
  await writeFile(npmConfig, "");
  const isolated = [
    "--ignore-scripts", "--no-audit", "--no-fund", "--no-update-notifier",
    "--userconfig", npmConfig, "--cache", join(temp, "npm-cache"),
  ];

  const manifest = await readJson(join(root, "package.json"));
  const lock = await readJson(join(root, "package-lock.json"));
  assert.equal(lock.lockfileVersion, 3, "Expected a v3 npm lockfile");
  assert.equal(lock.version, manifest.version);
  assert.deepEqual(lock.packages[""].dependencies, manifest.dependencies);
  const production = Object.fromEntries(Object.entries(lock.packages).filter(([, entry]) => !entry.dev));
  for (const [name, version] of Object.entries(manifest.dependencies)) {
    assert.equal(version, production[`node_modules/${name}`]?.version, `Expected pinned ${name}`);
  }
  const bundledPaths = Object.keys(production).filter(Boolean);
  // The bundle is installed once, without scripts, on the release runner.
  for (const path of bundledPaths) {
    const needs = ["hasInstallScript", "os", "cpu", "libc"].filter((key) => key in production[path]);
    assert.deepEqual(needs, [], `${path} cannot be bundled from one platform`);
  }
  delete production[""].devDependencies;
  delete manifest.devDependencies;
  // The build is complete. npm 10 can run prepare even on an ignore-scripts pack.
  delete manifest.scripts.prepare;
  // Only the published manifest bundles. In the repository it would make
  // npm mark the build lock's entries inBundle, which the Worker build
  // does not need. npm packs the named packages with their dependencies.
  manifest.bundleDependencies = Object.keys(manifest.dependencies);

  // Install the production part of the build lock and bundle it in the
  // package. npm installs bundled packages as shipped, so every npm version
  // gets the tree the Worker was built with. npm 12 ignores a shrinkwrap
  // inside a dependency, so shipping the lock alone would not hold. npm ci
  // checks each download against the lock's integrity.
  await writeJson(join(staging, "package.json"), manifest);
  await writeJson(join(staging, "package-lock.json"), { ...lock, packages: production });
  await npm(["ci", "--omit=dev", ...isolated, "--registry", npmRegistry], staging);
  await cp(join(root, "dist"), join(staging, "dist"), { recursive: true });
  const documentation = ["LICENSE", "README.md", "README.en.md", "README.ja.md"];
  for (const name of documentation) {
    await copyFile(join(root, name), join(staging, name));
  }
  const { stdout: packReport } = await npm(["pack", "--ignore-scripts", "--json"], staging);
  // npm 10 and 11 report an array, npm 12 an object keyed by package name.
  const report = JSON.parse(packReport);
  const pack = Array.isArray(report) ? report[0] : report[manifest.name];
  assert.equal(pack?.name, manifest.name);
  assert.equal(pack.version, manifest.version);
  const packedFiles = new Set(pack.files.map(({ path }) => path));
  const packageFiles = [...documentation, "package.json"];
  for (const name of [...packageFiles, manifest.bin.mingpan.replace(/^\.\//, ""), manifest.types]) {
    assert(packedFiles.has(name), `Release package is missing ${name}`);
  }
  for (const path of bundledPaths) {
    assert(packedFiles.has(`${path}/package.json`), `Release package does not bundle ${path}`);
  }
  for (const name of packedFiles) {
    assert(
      packageFiles.includes(name) || name.startsWith("dist/") ||
        bundledPaths.some((path) => name.startsWith(`${path}/`)),
      `Unexpected release file ${name}`,
    );
  }

  const tarball = await readFile(join(staging, pack.filename));
  const integrity = "sha512-" + createHash("sha512").update(tarball).digest("base64");
  assert.equal(integrity, pack.integrity);
  const packageUrl = "/" + manifest.name;
  const archiveUrl = packageUrl + "/-/" + pack.filename;
  const unexpectedRequests = [];
  const server = createServer((request, response) => {
    if (request.url === packageUrl) {
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({
        name: manifest.name,
        "dist-tags": { latest: manifest.version },
        versions: {
          [manifest.version]: { ...manifest, dist: { tarball: registry + archiveUrl, integrity } },
        },
      }));
    } else if (request.url === archiveUrl) {
      response.setHeader("content-type", "application/octet-stream");
      response.end(tarball);
    } else {
      // A bundled install has nothing else to fetch.
      unexpectedRequests.push(request.url);
      response.writeHead(404);
      response.end();
    }
  });

  let registry;
  try {
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    registry = `http://127.0.0.1:${server.address().port}`;
    await writeJson(join(consumer, "package.json"), { name: "mingpan-package-smoke", private: true });
    await npm(["install", ...isolated, "--registry", registry, `${manifest.name}@${manifest.version}`], consumer);
  } finally {
    server.close();
  }
  assert.deepEqual(unexpectedRequests, [], "The install requested packages outside the bundle");

  const installedRoot = `node_modules/${manifest.name}`;
  const installed = await readJson(join(consumer, "package-lock.json"));
  assert.equal(installed.packages[installedRoot]?.integrity, integrity);
  const installedPaths = Object.keys(installed.packages).filter((path) => path && path !== installedRoot);
  assert.deepEqual(
    installedPaths.sort(),
    bundledPaths.map((path) => `${installedRoot}/${path}`).sort(),
    "Installed dependencies differ from the bundled build lock",
  );
  for (const path of bundledPaths) {
    const entry = installed.packages[`${installedRoot}/${path}`];
    assert.equal(entry.version, production[path].version, `${path} differs from the build lock`);
    assert.equal(entry.inBundle, true, `${path} was not installed from the bundle`);
  }

  const bin = process.platform === "win32"
    ? join(consumer, installedRoot, manifest.bin.mingpan)
    : join(consumer, "node_modules", ".bin", "mingpan");
  const { stdout } = await run(process.execPath, [
    join(root, "scripts", "smoke-stdio.mjs"), join(consumer, installedRoot), bin,
  ]);
  process.stdout.write(stdout);
  console.log(`Verified ${pack.filename}: ${packedFiles.size} files, ${bundledPaths.length} bundled dependencies`);
  for (const path of bundledPaths) {
    console.log(`  ${path.replace(/^node_modules\//, "")}@${production[path].version}`);
  }
  if (process.argv[2]) {
    const destination = resolve(process.argv[2]);
    await mkdir(destination, { recursive: true });
    await copyFile(join(staging, pack.filename), join(destination, pack.filename));
    console.log(`Wrote verified tarball to ${join(destination, pack.filename)}`);
  }
} finally {
  await rm(temp, { recursive: true, force: true });
}
