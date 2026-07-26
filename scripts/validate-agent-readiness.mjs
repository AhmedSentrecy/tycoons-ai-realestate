import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(import.meta.dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const json = (relativePath) => JSON.parse(read(relativePath));

const robots = read("public/robots.txt");
assert.match(robots, /Content-Signal:\s*ai-train=no,\s*search=yes,\s*ai-input=yes/);

const catalog = json("public/.well-known/api-catalog");
assert.ok(Array.isArray(catalog.linkset) && catalog.linkset.length > 0);
assert.equal(catalog.linkset[0].anchor, "https://tycoons-inv.com/");
assert.ok(catalog.linkset[0]["service-desc"]?.[0]?.href);
assert.ok(catalog.linkset[0]["service-doc"]?.[0]?.href);

const openapi = json("public/api/openapi.json");
assert.equal(openapi.openapi, "3.1.0");
assert.ok(openapi.paths["/"]);
assert.ok(openapi.paths["/.well-known/api-catalog"]);

const skillPath = "public/.well-known/agent-skills/search-properties/SKILL.md";
const skill = read(skillPath);
const skillDigest = `sha256:${createHash("sha256").update(fs.readFileSync(path.join(root, skillPath))).digest("hex")}`;
const index = json("public/.well-known/agent-skills/index.json");
assert.equal(index.$schema, "https://schemas.agentskills.io/discovery/0.2.0/schema.json");
assert.equal(index.skills.length, 1);
assert.equal(index.skills[0].name, "search-properties");
assert.equal(index.skills[0].type, "skill-md");
assert.equal(index.skills[0].digest, skillDigest);
assert.match(skill, /^---\nname: search-properties\n/);

const netlify = read("netlify.toml");
assert.match(netlify, /rel="api-catalog"/);
assert.match(netlify, /rel="service-doc"/);
assert.match(netlify, /application\/linkset\+json/);

const edgeModule = await import(
  `${pathToFileURL(path.join(root, "netlify/edge-functions/markdown-for-agents.js")).href}?test=${Date.now()}`
);
const html = `<!doctype html><html><body><main><h1>Tycoons</h1><p>Property search</p><a href="/ar/">Directory</a></main></body></html>`;
const context = {
  next: async () =>
    new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    }),
};

const markdownResponse = await edgeModule.default(
  new Request("https://tycoons-inv.com/", {
    headers: { Accept: "text/markdown" },
  }),
  context,
);
assert.equal(markdownResponse.status, 200);
assert.match(markdownResponse.headers.get("Content-Type"), /^text\/markdown/);
assert.match(markdownResponse.headers.get("Vary"), /Accept/);
assert.match(markdownResponse.headers.get("Link"), /rel="api-catalog"/);
assert.match(await markdownResponse.text(), /^# Tycoons/);
assert.match(await (async () => {
  const response = await edgeModule.default(
    new Request("https://tycoons-inv.com/", { headers: { Accept: "text/markdown" } }),
    context,
  );
  return response.text();
})(), /\[Directory\]\(https:\/\/tycoons-inv\.com\/ar\/\)/);

const htmlPassThrough = await edgeModule.default(
  new Request("https://tycoons-inv.com/", { headers: { Accept: "text/html" } }),
  context,
);
assert.equal(htmlPassThrough, undefined);

console.log("Agent-readiness validation passed");
