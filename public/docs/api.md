# Tycoons Investments public discovery interface

This is an unauthenticated, read-only interface for discovering and searching Tycoons Investments' public property inventory. It does not provide access to private inventory administration or customer data, and it does not submit leads or send messages.

## Discovery

- API catalog: `https://tycoons-inv.com/.well-known/api-catalog`
- OpenAPI description: `https://tycoons-inv.com/api/openapi.json`
- Agent Skills index: `https://tycoons-inv.com/.well-known/agent-skills/index.json`
- Machine-readable site guide: `https://tycoons-inv.com/llms.txt`
- Sitemap: `https://tycoons-inv.com/sitemap.xml`
- MCP endpoint: `https://tycoons-inv.com/mcp`
- MCP Server Card: `https://tycoons-inv.com/.well-known/mcp/server-card.json`
- MCP health: `https://tycoons-inv.com/mcp/health`

## Remote MCP server

The MCP endpoint uses Streamable HTTP with JSON responses and supports protocol versions `2025-03-26`, `2025-06-18`, and `2025-11-25`. It is public, unauthenticated, and rate-limited to 60 requests per minute per IP and domain.

Available tools:

- `get_inventory_summary`: summarize current inventory coverage and freshness;
- `search_properties`: search the current public inventory in Arabic or English;
- `get_property_details`: retrieve one unit by the `unit_id` returned by search;
- `compare_properties`: compare two to five returned unit IDs;
- `calculate_payment_plan`: calculate an illustrative equal-installment scenario, monthly commitment, and optional present-value cash equivalent;
- `create_whatsapp_inquiry`: create a WhatsApp URL without opening it, sending a message, or storing a lead.

Every MCP request is a JSON-RPC 2.0 `POST` to `/mcp`. Initialize first:

```http
POST /mcp
Content-Type: application/json
Accept: application/json, text/event-stream

{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"example-client","version":"1.0.0"}}}
```

For subsequent calls, send the negotiated version in `MCP-Protocol-Version`.

## Markdown content negotiation

Send this header when requesting an HTML page:

```http
Accept: text/markdown
```

The response uses `Content-Type: text/markdown; charset=utf-8`. Normal browser requests continue to receive HTML.

## Browser tools

On WebMCP-capable browsers, the homepage registers the same six public tool names,
stable `unit_id` values, and provenance fields as the remote MCP server.

Public property results include the developer-owned data source label, source type,
source/update date, verification status, and confidence. Private source references
and internal notes are never returned.

Prices, availability, payment plans, finishing, and delivery dates must be reconfirmed before a purchase decision.
