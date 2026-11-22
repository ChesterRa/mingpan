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

const descriptor = JSON.parse(await readFile(path.join(rootDir, "server.json"), "utf8"));
if (!manifest.mcpName || manifest.mcpName !== descriptor.name) {
  throw new Error("MCP Registry name must match package.json mcpName");
}
const npmPackage = descriptor.packages.find((entry) => entry.registryType === "npm");
if (
  descriptor.version !== manifest.version ||
  npmPackage?.identifier !== manifest.name ||
  npmPackage.version !== manifest.version
) {
  throw new Error("MCP Registry npm metadata must match package.json name and version");
}

console.log(`Release version verified: ${tag}`);
