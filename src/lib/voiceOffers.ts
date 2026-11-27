// Confirmed offers and fixed payment plans for the voice assistant.
// Source: content/project-showcase.json (the same file the project pages use).
// Loaded lazily from the voice session only, so it never enters the main bundle.
import showcase from "../../content/project-showcase.json";
import { projectExpertForVoice, type ProjectExpertVoice } from "./projectExperts";

type Plan = { tag?: string; title?: string; big?: string; big_label?: string; items?: string[] };
type Offer = {
  hide_after?: string;
  title?: string;
  years?: number;
  down_payment_parts?: Array<[string, number]>;
  plans?: Plan[];
  note?: string;
};
type Config = { name_ar?: string; offer?: Offer; plan?: { down_payment?: string; years?: number } };

const PROJECTS = ((showcase as unknown as { projects?: Record<string, Config> }).projects || {}) as Record<string, Config>;

const ARABIC_NUMBER_WORDS: Record<number, string> = {
  1: "واحد", 2: "اتنين", 3: "تلاتة", 4: "أربعة", 5: "خمسة", 6: "ستة", 7: "سبعة", 8: "تمانية",
  9: "تسعة", 10: "عشرة", 12: "اتناشر", 14: "أربعتاشر", 15: "خمستاشر", 20: "عشرين", 45: "خمسة وأربعين",
};

/** "2%" → "اتنين في المية" so the voice never reads "+2%" as a correction. */
function spokenPercent(value: number): string {
  return `${ARABIC_NUMBER_WORDS[value] || String(value)} في المية`;
}

function spokenText(text: string): string {
  return text.replace(/(\d+(?:\.\d+)?)\s*%/g, (_, n) => spokenPercent(Number(n)));
}

function offerIsLive(offer: Offer | undefined, now: number): offer is Offer {
  if (!offer || !Array.isArray(offer.plans) || !offer.plans.length) return false;
  if (!offer.hide_after) return true;
  const end = Date.parse(`${offer.hide_after}T23:59:59+02:00`);
  return !Number.isFinite(end) || now <= end;
}

function planLine(plan: Plan): string {
  const head = [plan.title, plan.big && plan.big_label ? `${plan.big_label} ${plan.big}` : ""].filter(Boolean).join(": ");
  return [head, ...(plan.items || [])].filter(Boolean).join("، ");
}

export type VoiceOffer = {
  kind: "confirmed_offer" | "fixed_plan";
  project: string;
  title: string;
  plans: string[];
  down_payment_breakdown?: string;
  spoken: string;
  note: string;
};

export function voiceOfferFor(slug: string | null | undefined, now = Date.now()): VoiceOffer | null {
  const config = PROJECTS[String(slug || "").trim()];
  if (!config) return null;
  const project = config.name_ar || String(slug);
  const offer = config.offer;
  if (offerIsLive(offer, now)) {
    const plans = (offer.plans || []).map(planLine);
    const parts = offer.down_payment_parts || [];
    const total = parts.reduce((sum, [, value]) => sum + Number(value || 0), 0);
    const breakdown = parts.length > 1
      ? `المقدم ${total}% مقسّم على ${parts.length} دفعات: ${parts.map(([label, value]) => `${value}% ${label}`).join("، ")}`
      : undefined;
    const spokenBreakdown = parts.length > 1
      ? `المقدم ${spokenPercent(total)} على ${parts.length === 3 ? "تلات" : parts.length} دفعات: ${parts.map(([label, value]) => `${spokenPercent(Number(value))} ${label}`).join("، ")}`
      : "";
    return {
      kind: "confirmed_offer",
      project,
      title: offer.title || `عرض ${project}`,
      plans,
      down_payment_breakdown: breakdown,
      spoken: [spokenBreakdown, ...plans.map(spokenText)].filter(Boolean).join(". "),
      note: "عرض المطور الساري دلوقتي ومؤكد. ده بيكسب على نص المقدم والتقسيط المكتوب على الوحدة. متذكرش تاريخ انتهاء العرض. الأرقام النهائية بتتأكد وقت الحجز.",
    };
  }
  if (config.plan?.down_payment && config.plan?.years) {
    const line = `مقدم ${config.plan.down_payment} وتقسيط على ${config.plan.years} سنين`;
    return {
      kind: "fixed_plan",
      project,
      title: `نظام السداد في ${project}`,
      plans: [line],
      spoken: spokenText(line),
      note: "نظام السداد المؤكد للمشروع، وبيكسب على نص المقدم والتقسيط المكتوب على الوحدة.",
    };
  }
  return null;
}

/**
 * Marks options with current_offer and lists each project's offer once in project_offers.
 * Also adds each project's expert card once in project_experts (content/project-experts).
 */
export function withVoiceOffers<T extends Record<string, unknown>>(payload: T, now = Date.now()): T {
  const options = Array.isArray(payload.options) ? (payload.options as Array<Record<string, unknown>>) : [];
  const seen = new Map<string, VoiceOffer>();
  const experts = new Map<string, ProjectExpertVoice>();
  const enriched = options.map((option) => {
    const slug = typeof option.project_slug === "string" ? option.project_slug : "";
    const offer = voiceOfferFor(slug, now);
    // Phases of one project (Sarai, Taj City…) share one card: keep it once, keyed by the project.
    const expert = projectExpertForVoice(slug);
    let next = option;
    if (offer) {
      seen.set(slug, offer);
      next = { ...next, current_offer: offer.kind, current_offer_project: offer.project };
    }
    if (expert) {
      experts.set(expert.project, expert);
      next = { ...next, has_project_expert: true };
    }
    return next;
  });
  return {
    ...payload,
    options: enriched,
    ...(seen.size
      ? {
          project_offers: [...seen.values()],
          offer_instruction:
            "فيه عرض أو نظام سداد مؤكد في project_offers للمشاريع اللي عليها current_offer. قدّمه للعميل كأنظمة السداد الحالية للمشروع، ومتقولش أبدًا إن مفيش عروض. اقرأ النسب زي ما هي في spoken.",
        }
      : {}),
    ...(experts.size
      ? {
          project_experts: [...experts.values()],
          expert_instruction:
            "فيه كارت خبير للمشروع في project_experts. استخدم أرقامه لما العميل يسأل عن الإيجار أو العائد أو أنظمة السداد أو الاستلام. الإيجار قوله متوسط ومعاه سعر تحت وسعر فوق، والعائد على المدفوع لحد الاستلام بس. العيب وask_only_if_client_asks متقولش منهم حاجة إلا لو العميل سأل عن نفس الموضوع.",
        }
      : {}),
  };
}
