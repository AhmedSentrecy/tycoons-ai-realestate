// Type declarations belong outside Netlify's function entrypoint directory.
// .d.cts files there are discovered as functions ending in ".d" and fail deployment.
// Keep these exact module contracts in sync with the shared CommonJS implementations.
declare module "*netlify/functions/_article-render.cjs" {
  export function escapeHtml(value: unknown): string;
  export function renderSafeMarkdown(markdown: unknown, options?: { liveUnitIds?: Iterable<string> | Set<string> | null }): string;
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
