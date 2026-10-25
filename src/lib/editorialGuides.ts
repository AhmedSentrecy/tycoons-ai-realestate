// Published buyer-question guides (editorial articles) for the public site.
// Reads only the public view `published_editorial_articles` and public project rows.
const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};
const SUPABASE_URL = viteEnv.VITE_SUPABASE_URL || "https://coqnjymekrkoausiiytm.supabase.co";
const SUPABASE_KEY = viteEnv.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_6VFTijqKQB6RD7nIsSj_JQ_eEdoibGg";

export const WHATSAPP_NUMBER = "201110100025";

export interface GuideFaq { question: string; answer: string }
export interface GuideSourceRef { type: string; id: string; label: string; url: string }

export interface PublishedGuide {
  id: string;
  language: "ar" | "en";
  title: string;
  slug: string;
  excerpt: string;
  body_markdown: string;
  meta_title: string;
  meta_description: string;
  target_type: "project" | "area";
  project_id: string | null;
  area_name: string | null;
  source_refs: GuideSourceRef[];
  focus_keyword?: string;
  key_takeaways?: string[];
  faq?: GuideFaq[];
  hero_image_url?: string | null;
  reviewed_at: string;
  reviewed_by_name?: string | null;
  published_at: string;
  updated_at: string;
}

export interface GuideLink { title: string; slug: string; excerpt: string; language: "ar" | "en"; project_id: string | null; hero_image_url?: string | null }

export interface GuideProject { id: string; name: string; slug: string; developer: string; location: string; image_url: string | null }

async function rest<T>(path: string, params: Record<string, string>): Promise<T[]> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}?${new URLSearchParams(params)}`, {
    headers: { apikey: SUPABASE_KEY, Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`${path} ${response.status}`);
  const rows = await response.json();
  return Array.isArray(rows) ? rows as T[] : [];
}

export function guidePath(guide: Pick<GuideLink, "slug" | "language">) {
  return guide.language === "en" ? `/en/guides/${guide.slug}/` : `/guides/${guide.slug}/`;
}

export async function loadGuide(slug: string, language: "ar" | "en"): Promise<PublishedGuide | null> {
  const rows = await rest<PublishedGuide>("published_editorial_articles", { select: "*", slug: `eq.${slug}`, language: `eq.${language}`, limit: "1" });
  return rows[0] ?? null;
}

export async function loadGuideProject(projectId: string): Promise<GuideProject | null> {
  const rows = await rest<GuideProject>("projects", { select: "id,name,slug,developer,location,image_url", id: `eq.${projectId}`, limit: "1" });
  return rows[0]?.slug ? rows[0] : null;
}

/** Published guides about one project (by id), newest first. */
export async function loadProjectGuides(projectId: string, language: "ar" | "en" = "ar"): Promise<GuideLink[]> {
  return rest<GuideLink>("published_editorial_articles", {
    select: "title,slug,excerpt,language,project_id,hero_image_url",
    project_id: `eq.${projectId}`, language: `eq.${language}`, order: "published_at.desc", limit: "12",
  });
}

/**
 * The newest published article about a project, shown in full on the project page
 * (its own /guides/ URL then points its canonical at the project page).
 */
export async function loadProjectArticleBySlug(slug: string, language: "ar" | "en" = "ar"): Promise<PublishedGuide | null> {
  const projects = await rest<{ id: string }>("projects", { select: "id", slug: `eq.${slug}`, limit: "1" });
  if (!projects[0]) return null;
  const rows = await rest<PublishedGuide>("published_editorial_articles", {
    select: "*", project_id: `eq.${projects[0].id}`, language: `eq.${language}`, order: "published_at.desc", limit: "1",
  });
  return rows[0] ?? null;
}

/** Guides for a project page addressed by its public slug. */
export async function loadProjectGuidesBySlug(slug: string, language: "ar" | "en" = "ar"): Promise<GuideLink[]> {
  const rows = await rest<{ id: string }>("projects", { select: "id", slug: `eq.${slug}`, limit: "1" });
  return rows[0] ? loadProjectGuides(rows[0].id, language) : [];
}

/** Same cleanup as the server: no internal review wording, readable prices. */
export function publicMarkdown(markdown: string, ar: boolean) {
  const money = (value: string) => value.replace(/(\d{4,})\s*EGP/g, (_, digits: string) => `${Number(digits).toLocaleString("en-US")} ${ar ? "جنيه" : "EGP"}`);
  return String(markdown || "").split("\n").map((line) => {
    if (/^##\s+حقائق تجارية موثقة للمراجعة\s*$/.test(line)) return "## الأسعار وخطط السداد (تُؤكَّد وقت الطلب)";
    if (/^##\s+Sourced commercial facts for review\s*$/i.test(line)) return "## Prices and payment terms (reconfirmed on request)";
    const next = line
      .replace(/\s—\s(?:الحالة في بيانات المصدر|source status):\s*available\s(?=—)/, " ")
      .replace(/\s—\s(?:يجب التحقق منه قبل النشر|must be verified before publication)\.?\s*$/, "")
      .replace(/(?:تاريخ المصدر):\s*(\d{4}-\d{2}-\d{2})\.?/, "آخر تحديث: $1")
      .replace(/(?:source updated):\s*(\d{4}-\d{2}-\d{2})\.?/, "last updated: $1");
    return /^-\s/.test(next) ? money(next) : next;
  }).join("\n");
}

/** Internal links a guide may render as links; anything else stays text. */
export const SAFE_GUIDE_LINK = /^\/(?:(?:(?:(?:ar|en)\/)?(?:projects|guides|units)|(?:ar|en)\/(?:areas|developers))\/[a-z0-9-]+\/?|(?:about|contact|methodology|corrections)\/?)$/;
