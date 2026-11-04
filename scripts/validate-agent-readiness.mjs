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
const mcpCatalogEntry = catalog.linkset.find((entry) => entry.anchor === "https://tycoons-inv.com/mcp");
assert.ok(mcpCatalogEntry);
assert.equal(
  mcpCatalogEntry.describedby?.[0]?.href,
  "https://tycoons-inv.com/.well-known/mcp/server-card.json",
);
assert.equal(mcpCatalogEntry.status?.[0]?.href, "https://tycoons-inv.com/mcp/health");

const openapi = json("public/api/openapi.json");
assert.equal(openapi.openapi, "3.1.0");
assert.ok(openapi.paths["/"]);
assert.ok(openapi.paths["/.well-known/api-catalog"]);
assert.ok(openapi.paths["/mcp"]);
assert.ok(openapi.paths["/mcp/health"]);

const serverCard = json("public/.well-known/mcp/server-card.json");
assert.equal(serverCard.serverInfo.name, "tycoons-property-search");
assert.equal(serverCard.serverInfo.version, "1.1.0");
assert.equal(serverCard.transport.type, "streamable-http");
assert.equal(serverCard.transport.endpoint, "https://tycoons-inv.com/mcp");
assert.equal(serverCard.authentication.required, false);
assert.equal(serverCard.capabilities.tools.listChanged, false);
assert.deepEqual(serverCard.tools, [
  "get_inventory_summary",
  "search_properties",
  "get_property_details",
  "compare_properties",
  "calculate_payment_plan",
  "create_whatsapp_inquiry",
]);

const aiCatalog = json("public/.well-known/ai-catalog.json");
assert.ok(typeof aiCatalog.specVersion === "string" && aiCatalog.specVersion.length > 0);
assert.equal(aiCatalog.host.identifier, "did:web:tycoons-inv.com");
assert.ok(Array.isArray(aiCatalog.entries) && aiCatalog.entries.length > 0);
for (const entry of aiCatalog.entries) {
  assert.match(entry.identifier, /^urn:air:tycoons-inv\.com:[a-z0-9-]+:[a-z0-9-]+$/);
  assert.ok(entry.displayName);
  assert.match(entry.type, /^[a-z]+\/[a-z0-9.+-]+$/);
  assert.ok(("url" in entry) !== ("data" in entry), `${entry.identifier} needs exactly one of url or data`);
  if (entry.url) {
    assert.match(entry.url, /^https:\/\/tycoons-inv\.com\//);
    const localPath = path.join("public", new URL(entry.url).pathname);
    assert.ok(fs.existsSync(path.join(root, localPath)), `${entry.url} must exist in public/`);
  }
  assert.ok(entry.representativeQueries.length >= 2 && entry.representativeQueries.length <= 5);
}

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
assert.match(netlify, /\.well-known\/mcp\/server-card\.json/);

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
