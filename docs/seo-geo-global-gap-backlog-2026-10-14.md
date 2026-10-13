# Tycoons SEO/GEO gap-based research and execution backlog — 2026-10-14

## Measured baseline, not assumptions
- GSC domain property: last 28 settled days through 2026-10-11: **8 organic web clicks, 645 impressions, 1.24% CTR, 41.79 average position**. Previous 28 days: 16 clicks, 2,549 impressions. These are small absolute samples, not proof that one change caused decline.
- Sitemap `https://tycoons-inv.com/sitemap.xml` submitted ~1,199 URLs, 0 indexed in its sitemap report. **Do not interpret this as sitewide zero indexed pages**: GSC URL Inspection on 2026-10-14 reports /en/, /en/areas/mostakbal-city, /projects/hyde-park-new-cairo-new-launch as **Submitted and indexed**, mobile crawled, canonical matches.
- Live on-page crawler: 6 selected pages, HTTP 200 / indexable with self canonical, H1 and structured data. 33 issues (27 medium, 6 low, 0 high/critical). Most medium issues originate from poorly typed/incomplete Product and Article schema on the Hyde Park static project page, not missing entire SEO infrastructure. Other gaps: English homepage 62 words/4 internal links, Kleek developer page 124 words, Mostakbal title 97 chars.
- Field Core Web Vitals not available from GSC Wizard; CrUX API key not configured. No GA4 LLM referral observations available from tool at review time.
- Stronger early intent signals: mostakbal city map (11 impressions, avg position 16.5); mostakbal city developers map (8, avg 17); el patio hills (7, avg 16.9); jade park (6, avg 6.7); kleek developments (14, avg 25.4). All 0 clicks in observed query sample. Volume estimates unavailable; do not invent.

## Do NOT rebuild what already exists
- Existing SSR/static page paths for projects, units, developers and areas; bilingual /en/ /ar/ area, developer and project pages.
- Canonical/hreflang support, sitemap function, breadcrumb / collection / real-estate schema, robots.txt and OAI-SearchBot allow, internal links on many collections, source-methodology/about/contact/corrections/FAQ pages.
- Live Mostakbal area content already covers location, phases, project/developer intent and links to Google Maps. Improve source-fidelity/user experience rather than rewriting a second generic article.
- Existing articles CMS, guides and bilingual editorial worker **scaffolding**, NOT a fully enabled/verified automated research and publication pipeline. See docs/editorial-workflow-release.md. Never represent disabled worker or source review as live. No paid generation or automated publication without approvals and staging validation.

## Applied in this SEO review branch
1. English homepage: add ~300 words of crawlable purchase-comparison guidance and 17 crawlable area/developer/guide/trust links in build-time output, while preserving React hydration and canonical metadata.
2. Mostakbal City English title: align with map/projects intent without pushing huge dynamic price/count into title.
3. Real-estate project JSON-LD: keep RealEstateListing, ItemList, FAQPage, BreadcrumbList and verified aggregate offers. Remove invalid Product children and undated Article from inventory landing pages instead of inventing mandatory review, image or publication-date fields. Individual unit page metadata remains unchanged.
4. Add first-party favicon to Netlify SSR pages.
5. Add regression checks for English homepage and inventory schema.
6. GSC Wizard: start tracking 8 canonical URL examples and register two keyword clusters, Mostakbal map/project discovery and developer-project discovery.

## Remaining priorities (do in this order)
### P0 — production verification and measurement
- Run full `yarn run check` and Netlify deploy-preview QA: routes, SEO status, lang/hreflang, canonical, schema JSON validity, script hydration, `/en/` redirect loop, `/ar/areas/*`, `/en/areas/*`, project/unit cards, privacy/admin routes, mobile search. The current connector session does not support a complete remote build/test against production Supabase.
- Verify actual canonical HTTP redirects, sitemap served content and counts via HTTP client outside the browsing layer, and monitor indexing for sampled URLs. Investigate GSC sitemap index-count discrepancy before interpreting it as 0 indexed.
- Connect CrUX/PageSpeed field data and GA4 conversions (WhatsApp click, lead_submit, voice lead), including organic landing page and LLM referrers; maintain consent/privacy compliance.
- Diagnose impressions drop by comparing pages/queries for the two 28-day windows and reviewing crawl/index alerts, publishing timeline, and Google algorithm updates; do not assign causal attribution without evidence.

### P1 — leverage observed intent and real-estate information advantage
- `/en/areas/mostakbal-city`: add/verify an *actual interactive map with project pin locations*, or clearly separate indicative Google Maps area view from verified project geocoordinates. Publish verified phase, developer, project links, freshness timestamp and evidence citations; avoid claiming an unsurveyed map is a masterplan.
- `/en/developers/kleek-developments`: enrich from official developer site with independent evidence, project facts, delivery status, locations, payment plan ranges and source/updated date. Current ~124-word page is too thin to act as trustworthy research.
- `jade park`, `el patio hills`: identify verified project canonical pages, avoid slug variants and develop focused facts-based landing content: location, developer, units, delivery, finish, total price, instalment examples, verified inventory freshness, risks and alternatives. Do not publish if not sourced.
- Build connected comparison hubs: area > developer > project > unit; project > alternatives, location, payment plans, maintenance fees, delivery and expected use case. Each comparison must have a human-readable decision matrix and explicit source dates.
- Revenue-oriented query clusters (validate with GSC/keyword tools): `شقق التجمع الخامس بالتقسيط`, `فلل التجمع الخامس استلام قريب`, `شاليهات الساحل الشمالي مقدم 5%`, `كمبوندات مستقبل سيتي`, `سعر المتر في التجمع الخامس`, and matching English variants. These are **hypotheses**, not measured volume or ranking claims.

### P2 — global standard content engine
- Model the useful *formats*, not scale or wording, of Redfin data releases, Zillow regional research, idealista market history and Bayut cost/ROI comparisons. Publish dated primary-data snapshots from Tycoons *with provenance* (available-unit sample count, coverage, filters, exclusions, methodology, last updated, missing data) before calculating median EGP/m² and price distributions. Listing ask prices are NOT closed transaction prices.
- Monthly data note for New Cairo / Mostakbal / Sheikh Zayed / North Coast: price distribution by unit type, delivered vs off-plan, down-payment and instalment comparison, changes vs prior verified inventory snapshots. Do not invent rental yields, project coordinates, or market prices.
- Add buyer-first, real questions per project rather than boilerplate SEO articles: who should shortlist/skip; same-budget alternatives; nearby infrastructure with sources; delivery/finishing caveats; buying steps and fees; risk/ROI scenarios with formulas and disclosure.
- Incorporate dated first-party expertise (team's inspection notes, firsthand photos, verified brochures with reuse permissions), named reviewers, correction policy, transparent commercial interest and citations. Avoid automated thin programmatic pages and synthetic review ratings.
- Strengthen offsite authority legitimately: licensed citations/data partnerships, relevant articles from reputable publications, Google Business Profile factual consistency, developer backlinks where editorially valid. No bought link spam.
- GEO: make critical facts crawlable in initial HTML, concise answer sections, accessible comparisons/tables, entity links and consistent structured data; OpenAI Search bot should remain crawlable. Google says no special AI-only schema or llms.txt is required for AI Overviews. MCP/tools are optional agent experiences, **not evidence of automatic chatbot citation**.

## KPI scorecard / experimental baseline
- Primary 28-day reporting: nonbranded organic clicks, impressions, CTR, avg position split by page type and language; indexed/canonical URL samples; organic leads and lead quality; search-to-WhatsApp and search-to-voice conversion.
- Emerging GEO: verified ChatGPT/Perplexity/Bing Copilot referral sessions where GA4 connected, plus a small controlled prompt benchmark with reproducible dated queries and cited links. No guaranteed AI citations.
- Editorial QA: published guides with dated sources, fact conflicts/expired data, nonduplicate intent, clicks and qualified leads; not word count alone.
- Release gate: no automatically generated price/location/delivery fact without a dated source; no schedule/paid provider switch until reviewed release controls permit it.

## References
- Google Search Central AI Optimization Guide: https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- Google Search Central JavaScript and static rendering: https://developers.google.com/search/docs/crawling-indexing/javascript/dynamic-rendering
- Google structured data policies: https://developers.google.com/search/docs/appearance/structured-data/sd-policies
- OpenAI crawlers: https://developers.openai.com/api/docs/bots
- Redfin: https://www.redfin.com/news/data-center/
- Zillow: https://www.zillow.com/research/data/
- idealista: https://www.idealista.com/sala-de-prensa/informes-precio-vivienda/
- Bayut: https://www.bayut.com/mybayut/dubai-sales-market-report-h1-2026/
