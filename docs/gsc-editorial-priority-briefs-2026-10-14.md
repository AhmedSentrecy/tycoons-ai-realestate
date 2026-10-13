# GSC-backed editorial briefs — 2026-10-14

**Purpose:** Prioritize improvements to existing canonical project/developer/area URLs before creating duplicate guides. These are source briefs, NOT verified live inventory feeds and NOT approval to auto-publish. The currently connected GSC property yielded only 645 impressions in the last settled 28 days, so volume/CTR estimates are very uncertain.

## 1. `mostakbal city map`, `mostakbal city developers map`
- GSC: 11 impressions / average position 16.5, 8 impressions / position 17, respectively; no measured clicks in the period.
- Existing canonical landing page `/en/areas/mostakbal-city`, 146 impressions / 0 clicks (all queries). Existing content already covers road access, master-plan phases, prices/project list, Google Maps location and user caveat about not being a surveyed development map. **Do not duplicate generic history or copy existing FAQs.**
- **Material missing user value:** verify *project-level* geolocations and masterplan plots from original developer sources. Add selectable map pins only where official coordinates/parcel references are verified; otherwise a labelled indicative city map plus grouped verified project list, clearly not a masterplan.
- Essential comparison fields: project / developer / phase / connection or entrance where sourced / actual unit prices from latest verified feed / updated date / unit type / finishing / delivery / payment length / source URL. Use `Date verified` and `Unknown` explicitly. Add shareable comparison snippets linked back to canonical project pages.
- Before publish: verify price counts, source dates, link destinations, no claim of independent boundaries without GIS and licensing.

## 2. `el patio hills`
- GSC: 7 impressions / avg position 16.9 / 0 clicks (sample too small for a reliable CTR benchmark).
- Official developer evidence: https://www.la-vista-development.com/property/elpatiohills and https://www.la-vista-development.com/newcairo
- Verified public description as of review: La Vista, Sixth Settlement in New Cairo; development reported under construction; townhouses, twin houses and standalone villas; project amenities include landscaped gardens and lagoons. Developer describes adjacency to Middle Ring Road and other routes. **No price, delivery year, finishing or payment plan was verified from this official page in this research.** Commercial/reseller values conflict; don't use them as fact without documented inventory proof.
- Proposed canonical page improvement (locate existing DB project slug before writing): bilingual direct answer summary; price and sizes only from approved inventory; types and difference in privacy/garden/fees; access map with clearly approximate travel times; handover source; comparative cards El Patio Hills vs the same-budget villa/townhouse projects in Sixth Settlement; first-party verification date and official-source link; `Is this the right choice?` section comparing delivery urgency, finishing and maintenance costs. Preserve buyer qualification CTA.

## 3. `jade park`
- GSC: 6 impressions / avg position 6.7 / 0 clicks.
- Primary source: City Edge Developments https://cityedgedevelopments.com/project/jade-park/ (Arabic version https://cityedgedevelopments.com/ar/project/jade-park-ar/).
- Official site lists Duplex, Penthouse Duplex and Apartments; security, FTTH connectivity, intercom, firefighting, masterplan/photo/brochure resources and a 2025 construction progress gallery. **No current live price or definitive delivery was established** through the source.
- Avoid confusion with `El Patio Jade` by La Vista — a **different** project, https://lavista-developments.com/portfolio/el-patio-jade/.
- Improve the **existing project canonical** rather than creating duplicate pages: short facts panel; accurate developer branding; project/map and phases with source; explain differences between units with comparison table; prices/finishing/payment figures only from Tycoons verified database; last-confirmed date; naturally link to City Edge developer and location hubs. Target phrasing both `جايد بارك سيتي إيدج` and `jade park city edge` where relevant to user intent.

## 4. `kleek developments`
- GSC: query 14 impressions / avg position 25.4 / 0 clicks. Existing `/en/developers/kleek-developments` had **124 words** in live crawl and lacks depth.
- Developer website: https://kleekdevelopments.com/projects/noll-new-cairo/
- Source identifies Noll in New Cairo, apartments 1–4 bedrooms and duplexes, promoted as fully finished, but size/amenity claims are *developer statements* subject to latest verification. Avoid copying developer marketing superlatives and projected returns. Do not invent past-delivery track record based on vague developer claims.
- Enrich existing developer page with evidence-backed corporate context (separate self-reported history from proven dates), complete relevant project relationships, accurate locations and price ranges from verified inventory, delivered-vs-offplan project status, source date, and a useful question: `What to verify before buying from Kleek`. Link `/en/developers/kleek-developments` to validated Noll project page if present.

## 5. Data story that will outperform boilerplate if provenance is solved
Create **monthly verified inventory snapshot** (not `Egypt average market price`) by area, project, unit type and finishing. Report sample size n, median listing price per sqm, distribution/quantiles, payment-plan rules, and direct methodology/coverage. Separate asking/inventory prices from actual transactions; no causal returns/ROI without rent/outflow evidence. Snapshot stable historical rows — current inventory alone is insufficient for trend claims.
- MVP source = approved Tycoons structured units `project_id, unit_type, area_sqm, starting_price, finishing, availability_status, last_updated_at, source_reference` linked to a verified entity and pricing timestamp.
- Editorial publish gate: deduplicate units; remove invalid/unverified listings; record source/license; verify currency, finishing, location and delivery; exclude absent prices/areas; check unusual units; freeze data snapshot; disclose net sample size; attach data timestamp; cite original official developer sources where possible.
- Buyer-first articles based on first-party data: `Mostakbal City project comparison by verified price per square meter`, `New Cairo near-delivery four-bedroom homes: verified availability`, `North Coast chalets: compare 5% down payment vs total installment obligation`. **Proposals, not published pages or validated traffic-volume estimates.**

## Internal link and quality checklist for each touched page
One preferred canonical per project and locale; unique useful intent; descriptive title/H1; direct answer above the fold; authoritative links with date; internal links area → developer → project → unit → alternatives and back; author/editor if verified; substantive visible price caveat; index only eligible and genuinely useful URLs; structured data matching visible facts; images with permission, descriptive alt and meaningful dimensions; GA4/WhatsApp conversion; resubmit only when deployed.

## Performance acceptance signals
- Track impressions and clicks by query AND exact URL for at least two comparable 28-day windows; check Google-selected canonical and indexability; treat under-10 impressions as weak/unstable.
- For location map tasks: measure project visits after map interactions and qualified WhatsApp or call leads; clicks alone are insufficient.
- GEO benchmark: reproducible factual buyer prompts (EN and AR), check if answers can cite the relevant canonical page with correct price caveats. Absence of mention in an answer is not by itself an SEO failure. Avoid fabricated AI visibility statistics.

References: official property/developer pages above; Google: https://developers.google.com/search/docs/appearance/ai-features ; https://developers.google.com/search/docs/fundamentals/creating-helpful-content
