// "Expert per project" cards: reviewed facts per project (payment plans, units, rent, yield, resale, developer).
// Source: Supabase table project_experts (the single source). scripts/sync-project-experts.cjs pulls the
// active cards into content/project-experts/cards.json before every test run and build — edit the cards
// in Supabase, not in that file. The internal source list never leaves Supabase.
// Used by the site search, the voice assistant and the MCP (netlify/functions/mcp.js).
//
// Two kinds of text live in a card:
// - sales text (numbers, plans, facts): what Sara, WhatsApp, the MCP and the voice assistant say;
// - `evidence` (how a number was collected: basis, listings, confidence, source notes): website only.
// Everything that leaves for an assistant goes through salesCard(), which drops `evidence` and `sources`.
import cardsFile from "../../content/project-experts/cards.json";

type Card = {
  card_version: string;
  project: { slug: string; name_en: string; name_ar: string; location?: string; aliases?: string[]; not_to_confuse_with?: string[]; phase_slugs?: string[] };
  summary: {
    key_facts: string[];
    advantage: string;
    disadvantage: { text: string; say_only_if_client_asks: boolean };
  };
  assistant_rules: string[];
  rent?: { basis?: string; segments?: Array<Record<string, unknown>> };
  evidence?: CardEvidence;
  [key: string]: unknown;
};

export type CardEvidence = {
  rent?: { basis?: string; missing?: string; segments?: Array<{ bedrooms?: number; furnished?: boolean; listings?: number; confidence?: string }> };
  resale?: { basis?: string; listings?: number; confidence?: string };
  key_facts_sources?: string[];
  [key: string]: unknown;
};

const CARDS: Card[] = (cardsFile as unknown as { cards: Card[] }).cards;
// One card per main project (Sarai, Taj City…): its phases' pages (project.phase_slugs) use the same card.
const BY_SLUG = new Map(CARDS.flatMap((card) => [card.project.slug, ...(card.project.phase_slugs ?? [])].map((slug) => [slug, card] as const)));

export const PROJECT_EXPERT_NOTICE =
  "Reviewed Tycoons expert card for this project. Quote rent as low, average and high only, without explaining how the figures were collected. " +
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

/** The card as assistants may say it: no `evidence` (collection notes) and no internal `sources`. */
function salesCard(card: Card): Card {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { sources, evidence, ...rest } = card as Card & { sources?: unknown };
  return rest as Card;
}

/** Website only: how the card's numbers were collected (for «أسئلة بالأرقام» and the search boxes). */
export function projectExpertEvidence(slug: string | null | undefined): CardEvidence | null {
  return BY_SLUG.get(String(slug || "").trim())?.evidence ?? null;
}

/** The whole reviewed card for the project page's «أسئلة بالأرقام» (website): with `evidence`, without internal sources. */
export function projectExpertCard(slug: string | null | undefined): Card | null {
  const card = BY_SLUG.get(String(slug || "").trim());
  if (!card) return null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { sources, ...publicCard } = card;
  return publicCard as Card;
}

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

/** Full card for get_property_details. The internal source list (listing websites) stays in Supabase only. */
export function projectExpertFull(slug: string | null | undefined): (Card & { notice: string }) | null {
  const card = BY_SLUG.get(String(slug || "").trim());
  if (!card) return null;
  return { ...salesCard(card), notice: PROJECT_EXPERT_NOTICE };
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
  const found = BY_SLUG.get(String(slug || "").trim());
  if (!found) return null;
  const card = salesCard(found);
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
