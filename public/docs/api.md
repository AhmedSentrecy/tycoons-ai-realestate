# Tycoons Investments public discovery interface

This is an unauthenticated, read-only interface for discovering Tycoons Investments' public web resources. It does not provide access to private inventory administration, customer data, or lead submission.

## Discovery

- API catalog: `https://tycoons-inv.com/.well-known/api-catalog`
- OpenAPI description: `https://tycoons-inv.com/api/openapi.json`
- Agent Skills index: `https://tycoons-inv.com/.well-known/agent-skills/index.json`
- Machine-readable site guide: `https://tycoons-inv.com/llms.txt`
- Sitemap: `https://tycoons-inv.com/sitemap.xml`

## Markdown content negotiation

Send this header when requesting an HTML page:

```http
Accept: text/markdown
```

The response uses `Content-Type: text/markdown; charset=utf-8`. Normal browser requests continue to receive HTML.

## Browser tools

On WebMCP-capable browsers, the homepage registers read-only tools for:

- searching current property inventory with natural-language criteria;
- reading a summary of current inventory coverage;
- creating a WhatsApp inquiry link without opening it or sending a message.

Prices, availability, payment plans, finishing, and delivery dates must be reconfirmed before a purchase decision.
