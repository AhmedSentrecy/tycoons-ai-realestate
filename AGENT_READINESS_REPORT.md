# Tycoons Agent Readiness — Implementation Report

Source reviewed: `AhmedSentrecy/tycoons-ai-realestate` `main`

Base commit: `3bb80cb9bc38319b7efa3c70a9da1b51b33cfd92`

Date: 2026-07-26

## Implemented

1. **RFC 8288 Link response headers**
   - Homepage advertises the API catalog, `llms.txt`, and Agent Skills index.
   - `Vary: Accept` is declared for homepage content negotiation.

2. **Markdown for Agents**
   - A Netlify Edge Function returns `text/markdown; charset=utf-8` when an HTML page is requested with `Accept: text/markdown`.
   - Normal browser requests still receive HTML.
   - The conversion runs only for `GET` and `HEAD` HTML responses.

3. **Content Signals**
   - `robots.txt` now declares:
     `ai-train=no, search=yes, ai-input=yes`
   - This permits search and live AI answer/input use while declining model training.

4. **RFC 9727 API catalog**
   - `/.well-known/api-catalog`
   - Correct media type: `application/linkset+json` with the RFC 9727 profile.
   - Links to a real OpenAPI description and human-readable documentation for the site's public, read-only discovery interface.

5. **Agent Skills Discovery RFC v0.2.0**
   - `/.well-known/agent-skills/index.json`
   - One real skill: `search-properties`
   - The index contains a SHA-256 digest of the exact served `SKILL.md` bytes.

6. **WebMCP**
   - Registers three read-only browser tools on page load:
     - `search_properties`
     - `get_inventory_summary`
     - `create_whatsapp_inquiry_link`
   - The property tool reuses the site's existing inventory loader and ranking engine.
   - WhatsApp link creation does not open a page or send a message.
   - Supports the current `document.modelContext.registerTool()` draft and older `navigator.modelContext` implementations.

## Intentionally not published

### OAuth/OIDC, OAuth Protected Resource Metadata, and auth.md

Tycoons does not currently expose an external protected agent API or operate an OAuth/OIDC authorization server for third-party agents. Publishing issuer, token, JWKS, registration, or scope metadata without real endpoints would misrepresent the service and create broken authentication discovery.

### MCP Server Card

There is no hosted MCP transport endpoint. A server card must not be published until a real MCP server is deployed and its tools, resources, prompts, transport, and authentication have been tested.

### DNS-AID

DNS-AID discovers network agent endpoints such as A2A or MCP. WebMCP is an in-browser tool surface, not a network agent protocol endpoint, so an `_a2a` or `_mcp` record would be false advertising.

The live DNS check on 2026-07-26 found:

- `_index._agents.tycoons-inv.com` SVCB: `NXDOMAIN`
- `tycoons-inv.com` DNSKEY: no answer
- DNSSEC authenticated-data flag: false

When Tycoons deploys a real A2A or MCP endpoint, publish the matching DNS-AID SVCB record and enable DNSSEC in Cloudflare before advertising it.

## Validation evidence

The following completed successfully:

- Property search tests: 766 units, 168 projects, 60 developers
- Realtime function tests
- SEO regression tests
- Agent-readiness schema, digest, header, and Markdown negotiation tests
- TypeScript production build
- ESLint: 0 errors; 12 existing warnings outside this change
- `netlify.toml` TOML parse
- `git diff --check`

## Production verification after deployment

```bash
curl -I https://tycoons-inv.com/
curl -H 'Accept: text/markdown' -D - https://tycoons-inv.com/
curl -D - https://tycoons-inv.com/.well-known/api-catalog
curl https://tycoons-inv.com/.well-known/agent-skills/index.json
curl https://tycoons-inv.com/robots.txt
```

Then rescan `https://tycoons-inv.com/` with IsItAgentReady.
