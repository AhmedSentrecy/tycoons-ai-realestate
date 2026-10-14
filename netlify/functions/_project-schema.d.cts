export interface ProjectSchemaUnit {
  id?: string; unit_type?: string; bedrooms_text?: string;
  starting_price?: number | string | null; area_sqm?: number | string | null;
}
export interface ProjectSchemaRange {
  unit_type?: string; min_price?: number | string | null; max_price?: number | string | null;
}
export interface ProjectSchemaInput {
  url: string; name: string; location: string; description?: string; title?: string;
  language?: "ar" | "en"; images?: string[]; modified?: string | null; published?: string | null;
  units?: ProjectSchemaUnit[]; ranges?: ProjectSchemaRange[]; articleSections?: unknown[];
}
export function buildProjectSchemas(input: ProjectSchemaInput): Record<string, unknown>[];
export function hasEditorialContent(sections: unknown): boolean;
