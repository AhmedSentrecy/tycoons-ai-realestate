const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};

const SUPABASE_URL =
  viteEnv.VITE_SUPABASE_URL || "https://coqnjymekrkoausiiytm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  viteEnv.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_6VFTijqKQB6RD7nIsSj_JQ_eEdoibGg";

export interface ProjectArticleSection {
  heading: string;
  paragraphs: string[];
}

export interface ProjectFaq {
  question: string;
  answer: string;
}

export interface ProjectPageContent {
  name: string;
  slug: string;
  developer: string;
  location: string;
  description: string;
  hero_text: string;
  seo_title: string;
  seo_description: string;
  article_sections: ProjectArticleSection[];
  faq: ProjectFaq[];
  highlights: string[];
  seo_keywords: string[];
  targeting: Record<string, unknown>;
  image_url: string;
  gallery_urls: string;
  video_url: string;
  last_updated_at: string;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(text).filter(Boolean) : [];
}

function articleSections(value: unknown): ProjectArticleSection[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const heading = text(record.heading);
    const paragraphs = stringArray(record.paragraphs);
    return heading && paragraphs.length ? [{ heading, paragraphs }] : [];
  });
}

function faqs(value: unknown): ProjectFaq[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const question = text(record.question);
    const answer = text(record.answer);
    return question && answer ? [{ question, answer }] : [];
  });
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function loadProjectPage(slug: string): Promise<ProjectPageContent | null> {
  const columns = [
    "name",
    "slug",
    "developer",
    "location",
    "description",
    "hero_text",
    "seo_title",
    "seo_description",
    "article_sections",
    "faq",
    "highlights",
    "seo_keywords",
    "targeting",
    "image_url",
    "gallery_urls",
    "video_url",
    "last_updated_at",
  ].join(",");
  const params = new URLSearchParams({
    select: columns,
    slug: `eq.${slug}`,
    status: "eq.available",
    limit: "1",
  });
  const response = await fetch(`${SUPABASE_URL}/rest/v1/projects?${params}`, {
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`project page ${response.status}`);
  const [row] = (await response.json()) as Record<string, unknown>[];
  if (!row) return null;
  return {
    name: text(row.name),
    slug: text(row.slug),
    developer: text(row.developer),
    location: text(row.location),
    description: text(row.description),
    hero_text: text(row.hero_text),
    seo_title: text(row.seo_title),
    seo_description: text(row.seo_description),
    article_sections: articleSections(row.article_sections),
    faq: faqs(row.faq),
    highlights: stringArray(row.highlights),
    seo_keywords: stringArray(row.seo_keywords),
    targeting: objectValue(row.targeting),
    image_url: text(row.image_url),
    gallery_urls: text(row.gallery_urls),
    video_url: text(row.video_url),
    last_updated_at: text(row.last_updated_at),
  };
}
