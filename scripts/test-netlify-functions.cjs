"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const root = path.resolve(__dirname, "..");
const functionsDir = path.join(root, "netlify/functions");
const validName = /^[A-Za-z0-9_-]+$/;
const supportedExtension = /\.(?:[cm]?js|[cm]?ts|tsx)$/i;

async function main() {
  const files = fs.readdirSync(functionsDir, { withFileTypes: true });
  for (const entry of files) {
    if (!entry.isFile() || !supportedExtension.test(entry.name)) continue;
    assert.ok(!/\.d\.[cm]?ts$/i.test(entry.name),
      `Move ${entry.name} out of netlify/functions: declaration files are not deployable functions.`);
    const name = entry.name.replace(supportedExtension, "");
    assert.match(name, validName, `Invalid Netlify function entrypoint: ${entry.name}`);
  }
  for (const helper of ["_article-render.cjs", "_project-schema.cjs"]) {
    assert.ok(fs.existsSync(path.join(functionsDir, helper)), `Shared runtime helper must remain available: ${helper}`);
  }
  console.log("Netlify function entrypoint names and declaration placement passed.");

  if (!process.argv.includes("--bundle")) return;
  const moduleUrl = process.env.NETLIFY_ZISI_MODULE
    ? pathToFileURL(path.resolve(process.env.NETLIFY_ZISI_MODULE)).href
    : "@netlify/zip-it-and-ship-it";
  const { zipFunctions } = await import(moduleUrl);
  const outputDir = process.env.NETLIFY_BUNDLE_OUTPUT
    ? path.resolve(process.env.NETLIFY_BUNDLE_OUTPUT)
    : fs.mkdtempSync(path.join(os.tmpdir(), "tycoons-netlify-bundle-"));
  fs.mkdirSync(outputDir, { recursive: true });
  const manifest = path.join(outputDir, "manifest.json");
  const archives = await zipFunctions(functionsDir, outputDir, {
    basePath: root,
    archiveFormat: "zip",
    config: { "*": { nodeVersion: "20" } },
    manifest,
  });
  assert.ok(archives.length > 0, "Netlify must discover and bundle the actual functions.");
  const names = new Set();
  for (const archive of archives) {
    assert.equal(typeof archive.name, "string", "A packaged function must have a name.");
    assert.match(archive.name, validName, `Netlify produced an invalid function name: ${archive.name}`);
    assert.ok(!names.has(archive.name), `Duplicate function name: ${archive.name}`);
    assert.ok(fs.existsSync(archive.path), `Missing function archive: ${archive.name}`);
    names.add(archive.name);
  }
  for (const required of ["seo-page", "sitemap", "mcp", "openai-realtime-connect"]) {
    assert.ok(names.has(required), `Production endpoint missing from bundle: ${required}`);
  }
  fs.writeFileSync(path.join(outputDir, "summary.json"), JSON.stringify({
    functionCount: archives.length,
    names: [...names].sort(),
    invalidNames: [],
    manifest,
  }, null, 2) + "\n");
  console.log(`Netlify packaged ${archives.length} functions; all deployment names are valid.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
