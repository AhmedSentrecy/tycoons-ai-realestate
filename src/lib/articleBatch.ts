// "اكتب مسودات لأول 5": writes draft articles for the first projects of the missing-articles list,
// one after the other, from the admin's own browser session (nothing runs unattended).
// Each project = "اكتب المقال" (Google data + web research + draft, one request) + save as draft. Nothing is published: every draft still
// goes through the normal review and "نشر" in the articles tab.
import { AdminApiError, adminApi, type AdminArticle, type AdminProject, type ArticleValues } from "./adminApi";

export type BatchLanguage = "ar" | "en";
export interface BatchItem {
  project: AdminProject;
  language: BatchLanguage;
  /** Published article in the other language, linked as its translation (hreflang). */
  translationOf?: string;
}
export type BatchStep = "waiting" | "write" | "save" | "done" | "failed" | "skipped";
export interface BatchProgress {
  step: BatchStep;
  /** Seconds left while waiting for the generation limit (6 requests / 10 minutes). */
  waitSeconds?: number;
  articleId?: string;
  error?: string;
}

export const BATCH_SIZE = 5;

/** Default topic, same wording as "اكتب المقال". */
export function batchTopic(project: AdminProject, language: BatchLanguage) {
  return language === "ar"
    ? `${project.name}${project.developer ? ` من ${project.developer}` : ""}`
    : `${project.name}${project.developer ? ` by ${project.developer}` : ""}`;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs `call`, and when the generation limit is reached waits the time the server asks for
 * (counting down through `onWait`) and tries again. `stopped()` ends the wait early.
 */
async function withLimit<T>(call: () => Promise<T>, onWait: (seconds: number) => void, stopped: () => boolean): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await call();
    } catch (error) {
      const limited = error instanceof AdminApiError && (error.code === "generation_rate_limited" || error.code === "generation_provider_rate_limited");
      if (!limited || attempt >= 3 || stopped()) throw error;
      const seconds = Math.min(660, Math.max(30, Number(error.retryAfterSeconds) || 600));
      for (let left = seconds; left > 0; left -= 1) {
        if (stopped()) throw error;
        onWait(left);
        await sleep(1000);
      }
    }
  }
}

export async function runArticleBatch(
  token: string,
  items: BatchItem[],
  onProgress: (projectId: string, progress: BatchProgress) => void,
  stopped: () => boolean,
): Promise<AdminArticle[]> {
  const saved: AdminArticle[] = [];
  for (const item of items) {
    const id = item.project.id;
    if (stopped()) {
      onProgress(id, { step: "skipped" });
      continue;
    }
    const target = { language: item.language, target_type: "project" as const, project_id: id, area_name: null };
    const run = crypto.randomUUID();
    const wait = (step: BatchStep) => (seconds: number) => onProgress(id, { step, waitSeconds: seconds });
    try {
      onProgress(id, { step: "write" });
      const draft = await withLimit(() => adminApi.articleWrite(token, `write:${run}`, target), wait("write"), stopped);
      onProgress(id, { step: "save" });
      const values: ArticleValues = {
        ...target,
        title: draft.title,
        slug: draft.slug,
        excerpt: draft.excerpt,
        body_markdown: draft.body_markdown,
        meta_title: draft.meta_title,
        meta_description: draft.meta_description,
        source_refs: draft.source_refs,
        focus_keyword: draft.focus_keyword ?? "",
        key_takeaways: Array.isArray(draft.key_takeaways) ? draft.key_takeaways : [],
        faq: Array.isArray(draft.faq) ? draft.faq : [],
        hero_image_url: null,
        review_issues: draft.review_issues ?? [],
      };
      const { article } = await adminApi.articleSave(token, null, values, null, item.translationOf);
      saved.push(article);
      onProgress(id, { step: "done", articleId: article.id });
    } catch (error) {
      onProgress(id, { step: "failed", error: error instanceof AdminApiError ? error.code : error instanceof Error ? error.message : "failed" });
    }
  }
  return saved;
}

export interface PublishResult { language: BatchLanguage; articleId?: string; published: boolean; error?: string }

/**
 * «انشر» on a new WhatsApp project: the site's writing tool writes the Arabic article, then the English one
 * (linked as its translation). Each is published right away when the server's review passes (the admin
 * pressed «انشر» for exactly this); otherwise it stays a draft in «مقالات ناقصة» with the reasons.
 */
export async function writeAndPublishProjectArticles(
  token: string,
  projectId: string,
  onStep: (language: BatchLanguage, step: BatchStep, waitSeconds?: number) => void,
): Promise<PublishResult[]> {
  const results: PublishResult[] = [];
  let arabicId: string | undefined;
  for (const language of ["ar", "en"] as const) {
    const target = { language, target_type: "project" as const, project_id: projectId, area_name: null };
    try {
      onStep(language, "write");
      const draft = await withLimit(() => adminApi.articleWrite(token, `write:${crypto.randomUUID()}`, target), (seconds) => onStep(language, "write", seconds), () => false);
      onStep(language, "save");
      const values: ArticleValues = {
        ...target,
        title: draft.title, slug: draft.slug, excerpt: draft.excerpt, body_markdown: draft.body_markdown,
        meta_title: draft.meta_title, meta_description: draft.meta_description, source_refs: draft.source_refs,
        focus_keyword: draft.focus_keyword ?? "",
        key_takeaways: Array.isArray(draft.key_takeaways) ? draft.key_takeaways : [],
        faq: Array.isArray(draft.faq) ? draft.faq : [],
        hero_image_url: null,
        review_issues: draft.review_issues ?? [],
      };
      const { article } = await adminApi.articleSave(token, null, values, null, language === "en" ? arabicId : undefined);
      try {
        const { article: live } = await adminApi.articlePublish(token, article.id, article.revision, article.content_hash);
        if (language === "ar") arabicId = live.id;
        results.push({ language, articleId: live.id, published: true });
      } catch (error) {
        results.push({ language, articleId: article.id, published: false, error: error instanceof AdminApiError ? error.code : "publish_failed" });
      }
      onStep(language, "done");
    } catch (error) {
      results.push({ language, published: false, error: error instanceof AdminApiError ? error.code : error instanceof Error ? error.message : "failed" });
      onStep(language, "failed");
    }
  }
  return results;
}
