// "Expert per project" cards: reviewed facts per project (payment plans, units, rent, yield, resale, developer).
// Source: content/project-experts/<project>.json — one reviewed card per project, keyed by the project slug.
// Used by the MCP (netlify/functions/mcp.js) so phone/voice agents can answer with numbers.
import iCityNewCairo from "../../content/project-experts/mountain-view-icity-new-cairo.json";

type Card = {
  card_version: string;
  project: { slug: string; name_en: string; name_ar: string; aliases?: string[]; not_to_confuse_with?: string[] };
  summary: {
    key_facts: string[];
    advantage: string;
    disadvantage: { text: string; say_only_if_client_asks: boolean };
  };
  assistant_rules: string[];
  rent?: { basis?: string; segments?: Array<Record<string, unknown>> };
  [key: string]: unknown;
};

const CARDS: Card[] = [iCityNewCairo as unknown as Card];
const BY_SLUG = new Map(CARDS.map((card) => [card.project.slug, card]));

export const PROJECT_EXPERT_NOTICE =
  "Reviewed Tycoons expert card for this project. Rent figures are asking prices from listings; quote low, average and high. " +
  "Yield is on the amount paid until handover only. Never volunteer the disadvantage or ask_only_if_client_asks items unless the client asks about that topic.";

export type ProjectExpertSummary = {
  project: string;
  card_version: string;
  key_facts: string[];
  advantage: string;
  disadvantage: { text: string; say_only_if_client_asks: boolean };
  rules: string[];
  full_card: string;
  notice: string;
};

export function hasProjectExpert(slug: string | null | undefined): boolean {
  return BY_SLUG.has(String(slug || "").trim());
}

/** Short card for search results: key facts, advantage, disadvantage (ask-only). */
export function projectExpertSummary(slug: string | null | undefined): ProjectExpertSummary | null {
  const card = BY_SLUG.get(String(slug || "").trim());
  if (!card) return null;
  return {
    project: card.project.name_ar,
    card_version: card.card_version,
    key_facts: card.summary.key_facts,
    advantage: card.summary.advantage,
    disadvantage: card.summary.disadvantage,
    rules: card.assistant_rules,
    full_card: "Call get_property_details with a unit_id from this project for the full expert card.",
    notice: PROJECT_EXPERT_NOTICE,
  };
}

/** Full card for get_property_details. */
export function projectExpertFull(slug: string | null | undefined): (Card & { notice: string }) | null {
  const card = BY_SLUG.get(String(slug || "").trim());
  if (!card) return null;
  return { ...card, notice: PROJECT_EXPERT_NOTICE };
}

export type ProjectExpertVoice = {
  project: string;
  card_version: string;
  key_facts: string[];
  advantage: string;
  disadvantage: { text: string; say_only_if_client_asks: boolean };
  payment_plans?: unknown;
  rent?: unknown;
  yield_spoken?: string;
  ask_only_if_client_asks?: unknown;
  rules: string[];
};

/** Card for the site's voice assistant: the short summary plus rent, plans, the spoken yield and ask-only answers. */
export function projectExpertForVoice(slug: string | null | undefined): ProjectExpertVoice | null {
  const card = BY_SLUG.get(String(slug || "").trim());
  if (!card) return null;
  const plans = card.payment_plans as { phases?: unknown; delivery?: string; mega_offer_note?: string } | undefined;
  const yieldExample = card.yield_example as { spoken?: string } | undefined;
  return {
    project: card.project.name_ar,
    card_version: card.card_version,
    key_facts: card.summary.key_facts,
    advantage: card.summary.advantage,
    disadvantage: card.summary.disadvantage,
    payment_plans: plans ? { phases: plans.phases, delivery: plans.delivery, note: plans.mega_offer_note } : undefined,
    rent: card.rent,
    yield_spoken: yieldExample?.spoken,
    ask_only_if_client_asks: card.ask_only_if_client_asks,
    rules: card.assistant_rules,
  };
}
