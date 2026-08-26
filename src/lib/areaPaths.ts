const LEGACY_REGION_SLUGS: Record<string, string> = {
  capital: "new-capital",
  sahel: "north-coast",
  sokhna: "ain-sokhna",
  zayed: "sheikh-zayed",
};

export function arabicAreaPath(slug: string) {
  return `/ar/areas/${LEGACY_REGION_SLUGS[slug] ?? slug}`;
}
