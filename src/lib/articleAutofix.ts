// Pure helpers for the "fix publish blockers" button in the articles editor.
// No network here: the editor saves (server re-review) and calls the rewrite
// endpoint; these functions only decide what to change.
import type { AdminProject, ArticleReviewIssue, ArticleSourceRef, ArticleValues } from "./adminApi";

const norm = (value: string | null | undefined) => String(value || "").normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/** Projects an article can be grounded on: only rows with a public page (slug). */
export function articleProjects(projects: AdminProject[]): AdminProject[] {
  return projects.filter((project) => Boolean(project.slug));
}

/**
 * The project row that has a public page. Older imports left duplicate rows without
 * a slug (e.g. two "Mountain View 1.1"); an article on such a row can never be verified.
 */
export function canonicalProject(projects: AdminProject[], projectId: string | null | undefined): AdminProject | null {
  const current = projects.find((project) => project.id === projectId) ?? null;
  if (!current || current.slug) return current;
  const sameName = projects.filter((project) => project.slug && norm(project.name) === norm(current.name));
  if (!sameName.length) return current;
  const developer = norm(current.developer);
  return sameName.find((project) => developer && norm(project.developer).startsWith(developer.split(" ")[0])) ?? sameName[0];
}

const BROKER_HOST_RE = /(?:^|\.)(?:propertyfinder|aqarmap|nawy|shary|bayut|dubizzle|olx|sakneen|egyptrealestate|propertysorted|realestate-eg|aqar|aqarat|bezaat|opensooq|zillow|homzmart|coldwell|remax|redcon-?properties)\./i;
const SALES_TITLE_RE = /(?:price|payment|installment|down ?payment|delivery|handover|availab|discount|offer|سعر|أسعار|اسعار|جنيه|مليون|مقدم(?!ة)|تقسيط|أقساط|اقساط|سداد|تسليم|استلام|متاح|خصم|عرض)/i;

/** Competitor portals, brokers and sales landing pages are never article sources. */
export function isBrokerSource(ref: Pick<ArticleSourceRef, "url" | "label">): boolean {
  let host = "";
  try { host = new URL(ref.url).hostname.toLowerCase(); } catch { return true; }
  return BROKER_HOST_RE.test(host) || SALES_TITLE_RE.test(ref.label || "");
}

/** Rebuild source references around the canonical project; keep only clean web citations. */
export function repairSources(values: Pick<ArticleValues, "target_type" | "source_refs">, project: AdminProject | null, projectChanged: boolean): ArticleSourceRef[] {
  const web = values.source_refs.filter((ref) => ref.type === "web" && !isBrokerSource(ref));
  const units = projectChanged ? [] : values.source_refs.filter((ref) => ref.type === "unit");
  const otherProjects = values.target_type === "area" ? values.source_refs.filter((ref) => ref.type === "project") : [];
  const main = values.target_type === "project" && project?.slug
    ? [{ type: "project" as const, id: project.id, label: project.name, url: `/projects/${project.slug}` }]
    : [];
  const seen = new Set<string>();
  return [...main, ...otherProjects, ...units, ...web].filter((ref) => {
    const key = `${ref.type}:${ref.type === "web" ? ref.url : ref.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 30);
}

const PLACEHOLDER_RE = /\{\{[^{}]*\}\}|\$\{[^{}]*\}|\b(?:TODO|TBD)\b|\[(?:insert|add|ضع|أدخل)\b[^\]]*\]/gi;
const TYPED_FACT_RE = /(?:source updated|تاريخ المصدر|source status|الحالة في بيانات المصدر)|^-\s*(?:Price|Down payment|Installments|Delivery|Availability|السعر|الدفعة المقدمة|التقسيط|التسليم|التوافر):/i;

/** Internal links to project/unit pages that are not current sources become plain text. */
export function unlinkUnknown(text: string, allowedUrls: Set<string>): string {
  return String(text || "").replace(/\[([^\]]*)\]\((\/(?:projects|units)\/[^)\s]+)\)/g, (match, label: string, url: string) => allowedUrls.has(url) ? match : label);
}

export function cleanText(text: string, allowedUrls: Set<string>): string {
  return unlinkUnknown(String(text || "").replace(PLACEHOLDER_RE, "").replace(/[ \t]{2,}/g, " "), allowedUrls);
}

export function cleanBody(body: string, allowedUrls: Set<string>): string {
  return String(body || "").split("\n").filter((line) => !TYPED_FACT_RE.test(line.trim())).map((line) => cleanText(line, allowedUrls)).join("\n");
}

/** Remove project names (and allowed link URLs) before looking for digits, like the server review. */
export function hasUnverifiedNumber(line: string, projectNames: string[]): boolean {
  let text = String(line || "").replace(/\]\([^)]*\)/g, "]");
  for (const name of projectNames.filter(Boolean).sort((a, b) => b.length - a.length)) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    text = text.replace(new RegExp(escaped, "giu"), " ");
  }
  return /\p{N}/u.test(text.replace(/^\s*\d+[.)]\s+/, ""));
}

export type LineRef = { field: "body_markdown" | "excerpt" | "meta_title" | "meta_description" | "title" | "key_takeaways" | "faq_question" | "faq_answer"; index: number; text: string };

const ISSUE_FIELD_MAP: Record<string, LineRef["field"][]> = {
  body_markdown: ["body_markdown"], excerpt: ["excerpt"], meta_title: ["meta_title"], meta_description: ["meta_description"], title: ["title"],
  key_takeaways: ["key_takeaways"], faq: ["faq_question", "faq_answer"],
};

/** Lines that still carry unverified numbers in the fields the review flagged. */
export function numericLines(values: ArticleValues, issues: ArticleReviewIssue[], projectNames: string[]): LineRef[] {
  const fields = new Set(issues.filter((issue) => issue.severity === "blocker" && issue.code === "unsupported_numeric_claim").flatMap((issue) => ISSUE_FIELD_MAP[issue.field] ?? []));
  const out: LineRef[] = [];
  const push = (field: LineRef["field"], index: number, text: string) => { if (text.trim() && hasUnverifiedNumber(text, projectNames)) out.push({ field, index, text }); };
  if (fields.has("body_markdown")) values.body_markdown.split("\n").forEach((line, index) => push("body_markdown", index, line));
  for (const field of ["excerpt", "meta_title", "meta_description", "title"] as const) if (fields.has(field)) push(field, 0, values[field] || "");
  if (fields.has("key_takeaways")) (values.key_takeaways ?? []).forEach((item, index) => push("key_takeaways", index, item));
  if (fields.has("faq_question")) (values.faq ?? []).forEach((item, index) => { push("faq_question", index, item.question); push("faq_answer", index, item.answer); });
  return out.slice(0, 20);
}

/**
 * Last resort when a rewrite still has digits: drop the sentences that carry an
 * unverified number (headings keep their text without the number tokens).
 */
export function stripNumbers(line: string, projectNames: string[]): string {
  if (!hasUnverifiedNumber(line, projectNames)) return line;
  const heading = line.match(/^(\s*#{1,6}\s+)(.*)$/);
  if (heading) {
    const names = projectNames.filter(Boolean).sort((a, b) => b.length - a.length);
    const kept: string[] = [];
    let text = heading[2];
    names.forEach((name) => { text = text.replace(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "giu"), () => { kept.push(name); return String.fromCharCode(0xE100 + kept.length - 1); }); });
    text = text.replace(/\p{N}[\p{N},.%]*/gu, "").replace(/[\uE100-\uE1FF]/g, (char) => kept[char.charCodeAt(0) - 0xE100]).replace(/[ \t]{2,}/g, " ").trim();
    return `${heading[1]}${text}`;
  }
  const prefix = line.match(/^\s*(?:[-*]\s+)?/)?.[0] ?? "";
  const sentences = line.slice(prefix.length).split(/(?<=[.!?؟。])\s+/);
  const kept = sentences.filter((sentence) => !hasUnverifiedNumber(sentence, projectNames));
  return kept.length ? `${prefix}${kept.join(" ")}` : "";
}

/** A slug may only carry digits that belong to the project name; otherwise drop digit words. */
export function safeSlug(slug: string, projectSlug: string | null | undefined): string {
  const base = String(projectSlug || "").split("--")[0];
  if (base && slug.startsWith(`${base}-`) && !/\d/.test(slug.slice(base.length))) return slug;
  return slug.split("-").filter((part) => part && !/\d/.test(part)).join("-") || "guide";
}

export function applyLines(values: ArticleValues, refs: LineRef[], replacements: string[]): ArticleValues {
  const next: ArticleValues = { ...values, key_takeaways: [...(values.key_takeaways ?? [])], faq: (values.faq ?? []).map((item) => ({ ...item })) };
  const body = next.body_markdown.split("\n");
  refs.forEach((ref, i) => {
    const text = replacements[i] ?? ref.text;
    if (ref.field === "body_markdown") body[ref.index] = text;
    else if (ref.field === "key_takeaways") next.key_takeaways![ref.index] = text;
    else if (ref.field === "faq_question") next.faq![ref.index].question = text;
    else if (ref.field === "faq_answer") next.faq![ref.index].answer = text || (values.language === "en" ? "The Tycoons team confirms the current details on request." : "فريق Tycoons يقدر يأكد لك التفاصيل دي عند الطلب.");
    else next[ref.field] = text;
  });
  next.body_markdown = body.join("\n").replace(/\n{3,}/g, "\n\n");
  next.key_takeaways = next.key_takeaways!.filter((item) => item.trim());
  return next;
}

/** Plain-Arabic explanation of each review note: what it means and what to do. */
export function issueInArabic(issue: ArticleReviewIssue): string {
  const quote = issue.message.match(/“([^”]+)”/)?.[1];
  switch (issue.code) {
    case "unsupported_numeric_claim": return `فيه رقم مش موجود في بيانات الموقع${quote ? `: «${quote.slice(0, 120)}»` : ""}. زرار التصليح بيعيد صياغة الجملة من غير الرقم.`;
    case "source_grounding_missing": return "المقال مش مربوط بمشروع ليه صفحة على الموقع، فمفيش حاجة يتأكد منها. زرار التصليح بيربطه بالنسخة الصح من المشروع.";
    case "source_reference_invalid": return "في مصدر أو لينك لمشروع أو وحدة مش موجودة دلوقتي. زرار التصليح بيحدّث المصادر ويشيل اللينكات القديمة.";
    case "unresolved_placeholder": return "فيه كلام ناقص زي {{...}} لسه متكتبش. زرار التصليح بيشيله.";
    case "invalid_typed_fact": return "سطر سعر أو تسليم أو توافر مبقاش مطابق لبيانات الوحدة. زرار التصليح بيشيله.";
    case "source_fact_review": return "بيانات الوحدات اللي في المقال مطابقة للموقع. اتأكد بس إن تاريخها مناسب قبل النشر.";
    case "qualitative_claim_review": return "فيه وصف (مميزات، خدمات، أسعار، متاح) راجعه إنه مظبوط. ده تذكير ومش بيمنع النشر.";
    case "editorial_review_required": return "اقرا المقال كله مرة قبل ما تنشر. ده تذكير ومش بيمنع النشر.";
    default: return issue.message;
  }
}
