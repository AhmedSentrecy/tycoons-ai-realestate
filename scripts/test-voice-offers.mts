// Voice: Arabic project names find the project, and confirmed offers reach the assistant.
import assert from "node:assert/strict";
import { searchInventory } from "../src/lib/propertySearch";
import { withVoiceOffers, voiceOfferFor } from "../src/lib/voiceOffers";

const base = { developer: "Mountain View", location: "Mostakbal City", unit_type: "Apartment", bedrooms_text: "3", area_sqm: 150, starting_price: 10_510_474, down_payment_text: "3%", installments_text: "12 years", delivery_text: "", finishing: "", availability_status: "available", description: "", image_url: "", gallery_urls: "", brochure_url: "", video_url: "", last_updated_at: "", images: [], project_id: "1" } as any;
const units = [
  { ...base, project_name: "Mountain View Aliva", project_slug: "mountain-view-aliva--mountain-view" },
  { ...base, project_name: "Mountain View iCity October", project_slug: "mountain-view-icity-october--mountain-view", location: "October" },
  { ...base, project_name: "Creek Town", developer: "Il Cazar", project_slug: "creek-town--il-cazar-developments" },
];
for (const query of ["انا بدور على اليفا ماونتن فيو", "أليفا", "عروض اليفا", "اوفر اليفا الجديد", "انظمة سداد أليفا"]) {
  const result = searchInventory(units, query);
  assert.equal(result.exact[0]?.unit.project_name, "Mountain View Aliva", `${query} should find Aliva first`);
}
assert.equal(searchInventory(units, "آي سيتي أكتوبر").exact[0]?.unit.project_name, "Mountain View iCity October");

const beforeEnd = Date.parse("2026-11-24T12:00:00+02:00");
const offer = voiceOfferFor("mountain-view-aliva--mountain-view", beforeEnd);
assert.equal(offer?.kind, "confirmed_offer");
assert.match(offer!.down_payment_breakdown!, /6% مقسّم على 3 دفعات: 2% أول دفعة، 2% بعد 3 شهور، 2% بعد 6 شهور/);
assert.match(offer!.spoken, /اتنين في المية/);
assert.doesNotMatch(JSON.stringify(offer), /2026-12-31|ديسمبر/, "the offer end date is never told to the assistant");
assert.equal(voiceOfferFor("mountain-view-aliva--mountain-view", Date.parse("2027-01-02T00:00:00+02:00")), null, "an expired offer is dropped");
assert.equal(voiceOfferFor("mountain-view-crysta--mountain-view", beforeEnd)?.kind, "fixed_plan");
assert.equal(voiceOfferFor("creek-town--il-cazar-developments", beforeEnd), null);

const payload = withVoiceOffers({ options: [{ project_slug: "mountain-view-aliva--mountain-view" }, { project_slug: "creek-town--il-cazar-developments" }] }, beforeEnd) as any;
assert.equal(payload.options[0].current_offer, "confirmed_offer");
assert.equal(payload.options[1].current_offer, undefined);
assert.equal(payload.project_offers.length, 1);
assert.match(payload.offer_instruction, /متقولش أبدًا إن مفيش عروض/);
// Expert card: iCity New Cairo reaches the voice assistant once, short enough to speak from.
const ICITY = "mountain-view-icity-new-cairo--mountain-view";
const withExpert = withVoiceOffers({ options: [{ project_slug: ICITY }, { project_slug: ICITY }, { project_slug: "creek-town--il-cazar-developments" }] }, beforeEnd) as any;
assert.equal(withExpert.options[0].has_project_expert, true);
assert.equal(withExpert.options[2].has_project_expert, undefined);
assert.equal(withExpert.project_experts.length, 1, "one card per project");
const card = withExpert.project_experts[0];
assert.equal(card.project, "ماونتن فيو آي سيتي التجمع");
assert.equal(card.disadvantage.say_only_if_client_asks, true);
assert.ok(card.rent.segments.some((s: any) => s.bedrooms === 3 && s.furnished === false));
assert.match(card.yield_spoken, /المدفوع|دفعت/);
assert.match(withExpert.expert_instruction, /إلا لو العميل سأل/);
assert.equal("available_units" in card, false, "the voice card leaves out unit lists");
assert.equal(withVoiceOffers({ options: [{ project_slug: "creek-town--il-cazar-developments" }] }, beforeEnd).hasOwnProperty("project_experts"), false);

const icityUnits = [...units, { ...base, project_name: "Mountain View iCity New Cairo", project_slug: ICITY, location: "Fifth Settlement, New Cairo" }];
assert.equal(searchInventory(icityUnits, "آي سيتي التجمع").exact[0]?.unit.project_name, "Mountain View iCity New Cairo");
console.log("Voice offers and Arabic project names checks passed");
