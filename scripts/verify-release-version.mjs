import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(await readFile(path.join(rootDir, "package.json"), "utf8"));
const tag = process.env.GITHUB_REF_NAME ?? process.argv[2];

if (!tag) {
  throw new Error("Release tag is required through GITHUB_REF_NAME or argv[2]");
}

const expectedTag = `v${manifest.version}`;
if (tag !== expectedTag) {
  throw new Error(`Release tag ${tag} does not match package version ${manifest.version}`);
}

console.log(`Release version verified: ${tag}`);
