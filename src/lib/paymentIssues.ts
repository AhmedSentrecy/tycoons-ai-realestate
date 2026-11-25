/**
 * Spots unit payment plans that don't follow the site format:
 * down payment = a single percentage ("10%"), installments = a duration ("8 years").
 * Anything else gets a short Arabic reason so the admin knows what to clarify.
 */

const SUPABASE_URL = "https://coqnjymekrkoausiiytm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_6VFTijqKQB6RD7nIsSj_JQ_eEdoibGg";

export const DOWN_PAYMENT_OK = /^\d+(\.\d+)?%$/;
export const INSTALLMENTS_OK = /^\d+(\.\d+)? years?$/;

// Same rules as above, written for Postgres (PostgREST "match" = ~).
const DOWN_PAYMENT_OK_SQL = "^[0-9]+(\\.[0-9]+)?%$";
const INSTALLMENTS_OK_SQL = "^[0-9]+(\\.[0-9]+)? years?$";

export interface PaymentIssue {
  field: "down_payment" | "installments";
  value: string;
  reason: string;
}

function downPaymentReason(value: string): string {
  const text = value.toLowerCase();
  const percents = value.match(/\d+(?:\.\d+)?\s*%/g) ?? [];
  if (/cash|كاش/.test(text) && !percents.length) return "مكتوب كاش — مفيش مقدم بالنسبة";
  if (/cash|كاش/.test(text)) return "ده خصم الكاش مش مقدم — محتاج نسبة المقدم";
  if (percents.length >= 2 && /dp over|years?|سن/.test(text)) return "فيه أكتر من خطة بمقدمات مختلفة — حدد خطة واحدة";
  if (percents.length >= 2 && /[–-]/.test(value) && !/\bor\b|أو/.test(text)) return "مكتوب مدى نسب مش نسبة واحدة — محتاج المقدم الفعلي للوحدة";
  if (percents.length >= 2) return "فيه أكتر من نسبة مقدم — حدد خطة واحدة";
  if (/تبدأ|يبدأ|حسب|depending|starting|from/.test(text)) return "جملة عامة من غير نسبة محددة للوحدة";
  if (/\d{1,3}(,\d{3})+|\d{5,}/.test(value) && !percents.length) return "المقدم مكتوب مبلغ بالجنيه مش نسبة — النسبة مش رقم مظبوط من السعر";
  if (/discount|خصم/.test(text) && !percents.length) return "مكتوب «مقدمك = خصمك» من غير نسبة";
  if (/resale/.test(text)) return "ريسيل والمقدم مكتوب مبلغ — محتاج نسبة من السعر";
  if (/^\s*[\d.,]+\s*[km]?\s*[-–]\s*[\d.,]+\s*[km]?\s*$/i.test(value)) return "مكتوب مدى مبالغ بالجنيه — محتاج نسبة واحدة";
  if (/\d/.test(value) && !percents.length) return "المقدم مكتوب مبلغ بالجنيه مش نسبة — النسبة مش رقم مظبوط من السعر";
  return "صيغة المقدم مش واضحة";
}

function installmentsReason(value: string): string {
  const text = value.toLowerCase();
  if (/cash|كاش/.test(text)) return "مكتوب كاش — مفيش مدة تقسيط";
  if (/flexible|مرن/.test(text)) return "مكتوب «مرن» من غير مدة";
  if (/^\s*\d+(\.\d+)?%\s*after/.test(text)) return "ده دفعة بعد المقدم مش مدة تقسيط";
  const planYears = text.match(/(\d+(?:\.\d+)?)[-\s]year plan/);
  if (planYears) return `المدة (${planYears[1]} سنين) موجودة جوه تفاصيل طويلة — محتاجة تتكتب لوحدها`;
  const quarters = text.match(/(\d+)\s*quarterly installments/);
  if (quarters) return `مكتوب ${quarters[1]} قسط ربع سنوي (يعني ${Number(quarters[1]) / 4} سنين) — محتاج يتكتب كمدة`;
  if (/\bmonths?\b|شهر/.test(text) && !/quarterly|monthly installments? of|egp/.test(text)) return "المدة مكتوبة بالشهور — محتاج تتحول لسنين";
  if (/quarterly|monthly|egp|\d{3},?\d{3}|\d+k\b/.test(text)) return "مكتوب قيمة القسط بالجنيه من غير مدة التقسيط";
  return "صيغة التقسيط مش واضحة";
}

export function paymentIssues(unit: { down_payment_text?: string | null; installments_text?: string | null }): PaymentIssue[] {
  const issues: PaymentIssue[] = [];
  const dp = (unit.down_payment_text ?? "").trim();
  const inst = (unit.installments_text ?? "").trim();
  if (dp && !DOWN_PAYMENT_OK.test(dp)) issues.push({ field: "down_payment", value: dp, reason: downPaymentReason(dp) });
  if (inst && !INSTALLMENTS_OK.test(inst)) issues.push({ field: "installments", value: inst, reason: installmentsReason(inst) });
  return issues;
}

export interface PaymentIssueUnit {
  id: string;
  project_id: string | null;
  project_name: string | null;
  unit_type: string | null;
  area_sqm: number | null;
  starting_price: number | null;
  down_payment_text: string | null;
  installments_text: string | null;
  issues: PaymentIssue[];
}

const SELECT = "id,project_id,project_name,unit_type,area_sqm,starting_price,down_payment_text,installments_text";

async function fetchNotMatching(column: string, pattern: string): Promise<Omit<PaymentIssueUnit, "issues">[]> {
  const params = new URLSearchParams({ select: SELECT, [column]: `not.match.${pattern}`, limit: "1000" });
  const response = await fetch(`${SUPABASE_URL}/rest/v1/units?${params.toString()}`, {
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}` },
  });
  if (!response.ok) throw new Error(`payment_issues_${response.status}`);
  return (await response.json()) as Omit<PaymentIssueUnit, "issues">[];
}

/** All units on the site whose down payment or installments need clarifying. */
export async function loadPaymentIssueUnits(): Promise<PaymentIssueUnit[]> {
  const [badDown, badInst] = await Promise.all([
    fetchNotMatching("down_payment_text", DOWN_PAYMENT_OK_SQL),
    fetchNotMatching("installments_text", INSTALLMENTS_OK_SQL),
  ]);
  const byId = new Map<string, Omit<PaymentIssueUnit, "issues">>();
  for (const row of [...badDown, ...badInst]) byId.set(row.id, row);
  return [...byId.values()]
    .map((row) => ({ ...row, issues: paymentIssues(row) }))
    .filter((row) => row.issues.length > 0)
    .sort((a, b) => String(a.project_name).localeCompare(String(b.project_name), "ar"));
}
