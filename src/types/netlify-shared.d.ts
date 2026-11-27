// Type declarations belong outside Netlify's function entrypoint directory.
// .d.cts files there are discovered as functions ending in ".d" and fail deployment.
// Keep these exact module contracts in sync with the shared CommonJS implementations.
declare module "*netlify/functions/_article-render.cjs" {
  export function escapeHtml(value: unknown): string;
  export function renderSafeMarkdown(markdown: unknown, options?: { liveUnitIds?: Iterable<string> | Set<string> | null }): string;
  export function hasPrices(markdown: unknown): boolean;
  export function priceDateNoteHtml(options: { markdown: unknown; reviewedAt?: string | null; ar?: boolean; unitsHref?: string }): string;
}

declare module "*netlify/functions/_project-schema.cjs" {
  export interface ProjectSchemaUnit {
    id?: string; unit_type?: string; bedrooms_text?: string; project_name?: string;
    starting_price?: number | string | null; area_sqm?: number | string | null;
  }
  export interface ProjectSchemaRange {
    unit_type?: string; min_price?: number | string | null; max_price?: number | string | null;
  }
  export interface ProjectSchemaInput {
    url: string; name: string; location: string; description?: string; title?: string;
    language?: "ar" | "en"; images?: string[]; modified?: string | null; published?: string | null;
    units?: ProjectSchemaUnit[]; ranges?: ProjectSchemaRange[]; articleSections?: unknown[];
    /** Project slug, used to build readable unit URLs. */
    projectSlug?: string;
  }
  export function buildProjectSchemas(input: ProjectSchemaInput): Record<string, unknown>[];
  export function hasEditorialContent(sections: unknown): boolean;
}

declare module "*/_project-facts.cjs" {
  export interface ProjectFactInput { developer?: string; developerHref?: string; area?: string; areaHref?: string; units?: Array<{ unit_type?: string; starting_price?: number | string | null; last_updated_at?: string | null }> }
  export function projectFacts(input: ProjectFactInput): Array<{ label: string; value: string; href?: string; datetime?: string }>;
  export function projectFactsHtml(facts: Array<{ label: string; value: string; href?: string; datetime?: string }>, title: string): string;
  export function lastPriceUpdate(units: Array<{ last_updated_at?: string | null }>, fallback?: string | null): string;
  export function arabicType(value: string): string;
}

declare module "*/_unit-labels.cjs" {
  export function unitTypeAr(value: unknown): string;
  export function unitBaseAr(value: unknown): string;
  export function tidyArabicName(value: string): string;
  export function arabicKeywords(list: string[], names?: { areaAr?: string; developer?: string; developerAr?: string; name?: string }): string[];
  export function defaultHeroLine(nameAr: string, areaAr: string): string;
  export function unitsCountAr(n: number): string;
  export function bedroomsAr(value: unknown): string;
  export function arabicHeroLine(value: unknown, names?: { name?: string; nameAr?: string; location?: string; areaAr?: string; developer?: string; developerAr?: string }): string;
  export function hasLatinWords(value: unknown, allowed?: string[]): boolean;
}

declare module "*/_project-showcase.cjs" {
  export interface ShowcaseUnit {
    unit_type?: string | null; bedrooms_text?: string | null;
    area_sqm?: number | string | null; starting_price?: number | string | null;
    down_payment_text?: string | null; installments_text?: string | null;
  }
  /** HTML of the project "showcase" block (photo walk-through, current offer, down-payment calculator); "" for projects without one. */
  export function showcaseHtml(input: { slug: string; images?: string[]; units?: ShowcaseUnit[]; lang?: "ar" | "en"; now?: number }): string;
  export function showcaseConfig(slug: string): Record<string, unknown> | null;
}

declare module "*netlify/functions/_inventory-facts.cjs" {
  export function publicUnit(row: Record<string, unknown>): Record<string, unknown>;
  export function canonicalProjectSlug(slug: string): string;
  export function unitInquiry(unit: { id: string; starting_price: number; area_sqm?: number | null }, slug?: string, lang?: string): string;
}

declare module "*netlify/functions/_project-offers.cjs" {
  export interface ProjectOfferRow {
    project_id?: string;
    kind: string;
    title_ar: string;
    body_ar?: string | null;
    valid_until?: string | null;
    created_at?: string;
    active?: boolean;
  }
  export const OFFER_LABELS_AR: Record<string, string>;
  export function liveOffers<T extends ProjectOfferRow>(rows: T[] | null | undefined, today?: string): T[];
  export function untilAr(value: string | null | undefined): string;
  export function offerKeywords(rows: ProjectOfferRow[] | null | undefined, projectName: string): string[];
  export function offersSectionHtml(rows: ProjectOfferRow[] | null | undefined, options: { projectName: string; escapeHtml: (value: unknown) => string }): string;
}

declare module "*netlify/functions/_numbers-faq.cjs" {
  export interface NumbersFaqFact {
    category: string;
    kind?: string | null;
    statement_ar: string;
    source_label?: string | null;
    source_date?: string | null;
    valid_until?: string | null;
    project_id?: string | null;
  }
  export interface NumbersFaqItem { question: string; answer: string }
  export function numbersFaq(input: { projectName: string; developer?: string | null; card: unknown; facts?: NumbersFaqFact[] }): NumbersFaqItem[];
  export function numbersFaqUpdated(input: { card: unknown; facts?: NumbersFaqFact[] }): string;
  export function numbersFaqHtml(items: NumbersFaqItem[], options: { projectName: string; updated: string; escapeHtml: (value: unknown) => string }): string;
  export const LISTING_SITES: RegExp;
}
