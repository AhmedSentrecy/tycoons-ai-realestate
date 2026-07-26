---
name: search-properties
description: Search Tycoons Investments' currently available Egyptian property inventory using natural-language buyer criteria.
---

# Search Tycoons property inventory

Use this skill when a buyer wants to find or compare developer-direct property options in Egypt.

## Preferred workflow

1. On `https://tycoons-inv.com/`, use the read-only WebMCP tool `search_properties`.
2. Pass the buyer's request as a natural-language `query`. It may include location, budget, unit type, bedrooms, area, delivery, finishing, down payment, or installment duration.
3. Present exact matches before alternatives.
4. For alternatives, state every returned difference instead of describing the option as an exact match.
5. Keep prices in EGP and preserve the returned project, developer, location, delivery, and payment-plan fields.
6. Limit the first response to the most relevant options and ask which ones the buyer wants to compare.

## Safety and accuracy

- Treat availability, prices, payment plans, delivery dates, and finishing as time-sensitive.
- Do not invent missing fields or promise investment returns.
- ROI, rent, appreciation, and resale figures are scenarios, not guarantees.
- Ask the buyer to reconfirm the final price and availability with Tycoons Investments before making a decision.

## Fallback

If WebMCP is unavailable, use the Arabic directory at `https://tycoons-inv.com/ar/`, the English directory at `https://tycoons-inv.com/en/`, or the site's normal search interface.
