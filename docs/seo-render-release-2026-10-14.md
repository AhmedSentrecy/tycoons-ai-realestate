# Approved SEO rendering release — 14 October 2026

This release implements the first agreed batch on PR #49 above the developer updates in PR #48. It does not replace those developer pages, change inventory prices/payment plans, enable paid article generation or migrate production data.

## Actual changes
- One pure project schema builder is called by build-time project pages, SSR project pages and React. Real property facts stay consistent; missing prices are not described as zero. Real editorial sections keep Article metadata without invented publication dates.
- React manages the existing page graph instead of adding a conflicting second graph after the application loads.
- The HTML page shell receives the guide language explicitly. English receives `lang=en`, `dir=ltr`, its own canonical and English locale. Translation alternates are emitted only when a real published, reviewed pair exists.
- English guide interface labels, regional navigation and project links follow the English locale.
- One escaped, same-site-only article renderer serves SSR and React, including accessible, horizontally scrollable comparison tables. Raw HTML and external source links are not enabled.
- Source names remain visible; external source links are not rendered in guide source sections or their citation metadata. Original source records are not deleted or changed by this code release.
- Focused regression tests are included in normal `test:seo`; a full `yarn run check` is executed in the GitHub runner. Rendered Chrome smoke tests cover English home, project schema after React loads, public search UI and unauthenticated War Room entry.

## Scope of validation
Local contract tests cover actual renderer modules with a TypeScript loader, without substituting dependencies. The complete production build and browser tests are run in the CI release job; their logs/evidence are the release record. Offline article/provider tests do not make paid OpenAI calls. War Room smoke testing does not authenticate or inspect private leads. Voice network calls are not made by the browser smoke test.

## Unchanged / remaining
The existing canonical project URLs, available inventory, paid generation controls, database permissions and the most recent developer content remain unchanged. Publishing new researched project articles, running a scheduled editorial pipeline, new GA4/AI report data and monthly inventory reports are separate follow-on batches; this release does not claim they have been executed.

## Interpretation
Titles or missing optional fields are not called penalties. A short page is not removed solely for its word count. Test assertions validate rendering, correct language/links and actual facts, not an external tool's score.
