# Tycoons SEO/GEO foundation

This branch adds an indexable layer around the existing packed single-page app without replacing its design or voice-search experience.

## New public routes

- `/ar/` and `/en/`: server-rendered project directories.
- `/ar/projects/:slug` and `/en/projects/:slug`: project pages grouped from confirmed Supabase inventory.
- `/ar/areas/:slug` and `/en/areas/:slug`: location landing pages.
- `/ar/developers/:slug` and `/en/developers/:slug`: developer landing pages.
- `/sitemap.xml`: dynamic sitemap generated from current inventory.
- `/robots.txt`: crawler policy with OAI-SearchBot access and sitemap discovery.

## Inventory publishing rules

The SEO pages use the existing public, read-only Supabase Data API policy. They exclude `review_only`, `not_confirmed`, and sold rows, and require a project name plus a positive starting price. Only the columns required for public pages are selected; internal notes and lead data are never requested.

## Homepage improvements

- Crawlable Arabic content is present before JavaScript runs.
- Description, robots, canonical, hreflang, Open Graph and Twitter metadata are present in both the outer bundle page and runtime template.
- Organization, RealEstateAgent and WebSite JSON-LD are included.
- Project titles and footer locations now expose real crawlable links.
- Property images receive descriptive alt text, dimensions, async decoding and lazy loading.

## Validation

Run:

```bash
node scripts/validate-seo.js
node --check netlify/functions/_seo-utils.js
node --check netlify/functions/seo-page.js
node --check netlify/functions/sitemap.js
```

The Netlify build still runs `patch_tycoons_build.py`. The patch now adds the crawlable outer metadata and fallback at build time, synchronizes `template.html` into both embedded bundle files, and escapes closing script tags before updating the manifest. This keeps the generated `index.html` out of hand-edited source changes.

## After deployment

1. Verify `robots.txt`, `sitemap.xml`, one Arabic project URL and one English project URL.
2. Validate JSON-LD and canonical/hreflang output.
3. Submit the sitemap in Google Search Console.
4. Request indexing for the homepage, one area page and several priority project pages.
5. Monitor Google Search Console and ChatGPT referrals tagged with `utm_source=chatgpt.com`.
