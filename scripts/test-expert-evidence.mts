// Expert cards carry two kinds of text:
// - sales text (numbers, plans, facts): Sara on the phone, WhatsApp, the MCP and the site voice assistant;
// - evidence (how a number was collected: basis, listings, confidence): the website only.
// This test checks the sales side never says how a figure was collected, and the website still does.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { projectExpertCard, projectExpertForVoice, projectExpertFull, projectExpertSummary, PROJECT_EXPERT_NOTICE } from "../src/lib/projectExperts.ts";
import { withVoiceOffers } from "../src/lib/voiceOffers.ts";

const require = createRequire(import.meta.url);
const { cards } = require("../content/project-experts/cards.json");
const { numbersFaq } = require("../netlify/functions/_numbers-faq.cjs");

// Words that explain how a figure was collected — fine on the website, odd in a call or a WhatsApp message.
const COLLECTION_WORDS = ["إعلان", "إعلانين", "اتقفلت", "مطلوبة في", "listings", "confidence"];
// The two rules Ahmed wrote mention «إعلان» to forbid it; they are instructions, not something said to the client.
const RULES_ALLOWED = [
  "الإيجار: قول المتوسط ومعاه سعر تحت وسعر فوق بس، من غير ما تقول اتجمع إزاي أو من كام إعلان.",
  "متذكرش للعميل أسماء مواقع الإعلانات أو أي مصدر خارجي.",
];

function salesText(value: unknown): string {
  const text = JSON.stringify(value);
  return RULES_ALLOWED.reduce((acc, rule) => acc.split(JSON.stringify(rule).slice(1, -1)).join(""), text);
}

function assertClean(label: string, value: unknown) {
  const text = salesText(value);
  for (const word of COLLECTION_WORDS) assert.equal(text.includes(word), false, `${label}: says «${word}»`);
  assert.equal(text.includes("\"evidence\""), false, `${label}: carries evidence`);
  assert.equal(text.includes("\"sources\""), false, `${label}: carries the internal sources`);
}

assert.ok(cards.length >= 2, "expert cards pulled from Supabase");
assert.doesNotMatch(PROJECT_EXPERT_NOTICE, /asking prices|listings/i, "MCP notice explains no collection method");

for (const card of cards) {
  const slug = card.project.slug;

  // Same filter as the Supabase view project_experts_public (card − evidence − sources): what Sara reads.
  const { evidence, sources, ...publicView } = card as Record<string, unknown>;
  void sources;
  assertClean(`${slug} project_experts_public`, publicView);

  // MCP: search_properties (summary) and get_property_details (full card).
  assertClean(`${slug} MCP search_properties`, projectExpertSummary(slug));
  assertClean(`${slug} MCP get_property_details`, projectExpertFull(slug));
  // Key facts carry no source brackets such as «(متوسط الأسعار المطلوبة في السوق، يوليو–أغسطس 2026)».
  for (const fact of card.summary.key_facts) assert.doesNotMatch(fact, /\((?:[^()]*(?:السوق|سداد المطور|عرض ماونتن فيو|عينة))[^()]*\)/, `${slug}: key fact without source brackets`);

  // Site voice assistant.
  assertClean(`${slug} voice card`, projectExpertForVoice(slug));
  const unit = { id: `u-${slug}`, project_name: card.project.name_en, project_slug: slug, developer: "Mountain View" };
  const voiceExperts = (withVoiceOffers({ options: [unit] } as never) as { project_experts?: unknown[] }).project_experts;
  assert.equal(voiceExperts?.length, 1, `${slug}: voice search carries the expert card`);
  assertClean(`${slug} voice offers`, voiceExperts);

  // Rules: rent is numbers only; the site-names rule stays.
  assert.ok(card.assistant_rules.includes(RULES_ALLOWED[0]), `${slug}: rent rule is numbers only`);
  assert.ok(card.assistant_rules.includes(RULES_ALLOWED[1]), `${slug}: no listing-site names rule kept`);
  assert.equal(card.assistant_rules.some((rule: string) => /وتاريخها|الأسعار المطلوبة في السوق/.test(rule)), false, `${slug}: no rule asks to explain the source`);

  // Website: the documentation is still there, from evidence.
  assert.ok(evidence && (evidence as { rent?: { basis?: string } }).rent?.basis, `${slug}: evidence.rent.basis kept for the website`);
  const site = JSON.stringify(numbersFaq({ projectName: card.project.name_en, developer: "Mountain View", card: projectExpertCard(slug), facts: [] }));
  assert.ok(site.includes((evidence as { rent: { basis: string } }).rent.basis), `${slug}: website shows the rent basis`);
  assert.match(site, /إعلان/, `${slug}: website shows how many listings`);
}

// One card per main project: every phase page (project.phase_slugs) gets the main project's card.
for (const card of cards) {
  for (const phase of card.project.phase_slugs || []) {
    assert.equal(projectExpertCard(phase)?.project.slug, card.project.slug, `${phase}: uses ${card.project.slug}'s card`);
    assert.equal(projectExpertForVoice(phase)?.project, projectExpertForVoice(card.project.slug)?.project, `${phase}: voice gets the same card`);
  }
}

console.log("Expert cards: sales text clean, website evidence kept, phases share the main card");
