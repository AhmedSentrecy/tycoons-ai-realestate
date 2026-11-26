// Smart search on the client: asks /api/search-understand (OpenAI) for a clean query and the
// buyer's question, and builds a short answer from the project's reviewed expert card.
// Every number shown comes from the card or the inventory, never from the AI.
import { projectExpertFull } from "@/lib/projectExperts";

export type SearchQuestion = "rent" | "yield" | "price" | "payment" | "delivery" | "none";

export type SearchUnderstanding = {
  search_query: string;
  question: SearchQuestion;
  bedrooms: number | null;
  furnished: boolean | null;
};

const memo = new Map<string, Promise<SearchUnderstanding | null>>();

export function understandQuery(query: string, fetchImpl: typeof fetch = fetch): Promise<SearchUnderstanding | null> {
  const key = query.trim().toLowerCase();
  if (key.length < 2) return Promise.resolve(null);
  const existing = memo.get(key);
  if (existing) return existing;
  const request = fetchImpl("/api/search-understand", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: query.trim() }),
    signal: AbortSignal.timeout(7000),
  })
    .then((response) => (response.ok ? response.json() : null))
    .then((data) => (data?.ok && typeof data.search_query === "string" ? (data as SearchUnderstanding) : null))
    .catch(() => null);
  memo.set(key, request);
  return request;
}

const QUESTION_WORDS: Array<[SearchQuestion, RegExp]> = [
  ["rent", /(ايجار|إيجار|الايجار|الإيجار|للايجار|بالايجار|\brent|\brental)/i],
  ["yield", /(عائد|العائد|\byield|\broi\b)/i],
  ["payment", /(نظام السداد|انظمة السداد|أنظمة السداد|التقسيط|المقدم|payment plan|installments?)/i],
  ["delivery", /(الاستلام|التسليم|امتى الاستلام|handover|delivery date)/i],
];

/** Works without the AI: finds the question topic from plain keywords. */
export function detectQuestion(query: string): SearchQuestion {
  for (const [question, pattern] of QUESTION_WORDS) if (pattern.test(query)) return question;
  return "none";
}

export function detectBedrooms(query: string): number | null {
  const match = query.match(/(\d)\s*(غرف|غرفة|اوض|أوض|bed|br)/i);
  const value = match ? Number(match[1]) : NaN;
  return value > 0 && value < 10 ? value : null;
}

type RentSegment = { bedrooms: number; furnished: boolean; low_egp: number; average_egp: number; high_egp: number };
type Phase = { phase: string; down_payment: string; years: number; cash_discount?: string };

const egp = (value: number) => value.toLocaleString("en-US");

function rentLine(segment: RentSegment): string {
  return `${segment.bedrooms} غرف ${segment.furnished ? "مفروشة" : "مش مفروشة"}: المتوسط حوالي ${egp(segment.average_egp)} جنيه في الشهر، من ${egp(segment.low_egp)} لـ ${egp(segment.high_egp)}`;
}

export type ExpertAnswer = { project: string; title: string; lines: string[]; note: string };

/** Short answer for the search page from the project's expert card, or null when there is nothing reviewed to say. */
export function expertAnswer(
  projectSlug: string | null | undefined,
  question: SearchQuestion,
  bedrooms: number | null = null,
  furnished: boolean | null = null,
): ExpertAnswer | null {
  const card = projectExpertFull(projectSlug);
  if (!card || question === "none" || question === "price") return null;
  const project = card.project.name_ar;

  if (question === "rent") {
    const rent = card.rent as { basis?: string; segments?: RentSegment[] } | undefined;
    const segments = rent?.segments ?? [];
    if (!segments.length) return null;
    const picked = segments.filter(
      (segment) => (bedrooms == null || segment.bedrooms === bedrooms) && (furnished == null || segment.furnished === furnished),
    );
    return {
      project,
      title: `الإيجار في ${project}`,
      lines: (picked.length ? picked : segments).map(rentLine),
      note: rent?.basis ? `${rent.basis}.` : "أسعار مطلوبة في الإعلانات.",
    };
  }

  if (question === "yield") {
    const spoken = (card.yield_example as { spoken?: string } | undefined)?.spoken;
    if (!spoken) return null;
    return { project, title: `العائد في ${project}`, lines: [spoken], note: "العائد محسوب على المدفوع لحد الاستلام، وبالإيجارات المطلوبة في الإعلانات. مش وعد بعائد." };
  }

  const plans = card.payment_plans as { phases?: Phase[]; delivery?: string; source?: string } | undefined;
  if (question === "payment") {
    const phases = plans?.phases ?? [];
    if (!phases.length) return null;
    return {
      project,
      title: `أنظمة السداد في ${project}`,
      lines: phases.map((phase) => `${phase.phase}: مقدم ${phase.down_payment} على ${phase.years} سنين${phase.cash_discount ? `، وخصم الكاش ${phase.cash_discount}` : ""}`),
      note: plans?.source ? `المصدر: ${plans.source}. اتأكد من المستشار قبل الحجز.` : "اتأكد من المستشار قبل الحجز.",
    };
  }

  if (question === "delivery" && plans?.delivery) {
    return { project, title: `الاستلام في ${project}`, lines: [plans.delivery], note: "اتأكد من ميعاد الاستلام لكل وحدة مع المستشار." };
  }
  return null;
}
