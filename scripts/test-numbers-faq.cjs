// «أسئلة بالأرقام»: numbers come straight from the expert card / sales facts, the disadvantage and the
// ask-only answers never appear, and no listing-website name is ever published.
const assert = require("node:assert/strict");
const { numbersFaq, numbersFaqHtml, numbersFaqUpdated, LISTING_SITES } = require("../netlify/functions/_numbers-faq.cjs");
const { cards } = require("../content/project-experts/cards.json");

const escapeHtml = (value) => String(value).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const byName = (items, start) => items.find((item) => item.question.startsWith(start));

assert.ok(cards.length >= 2, "expert cards pulled from Supabase");
for (const card of cards) {
  assert.equal("sources" in card, false, `${card.project.slug}: the internal source list never ships`);
  const facts = [
    { category: "offer", statement_ar: `${card.project.name_en} (Mountain View): خصم 15% على 12 سنة`, source_label: "حسب المطور، 2026-11-16", source_date: "2026-11-16" },
    { category: "track_record", statement_ar: "سلّمت مرحلة Club Park", source_label: "حسب المطور، 2026-11-20", source_date: "2026-11-20" },
  ];
  const items = numbersFaq({ projectName: card.project.name_en, developer: "Mountain View", card, facts });
  const all = JSON.stringify(items);

  // Rent: every segment's low / average / high exactly as in the card.
  const rent = byName(items, "إيجار الشقق");
  assert.ok(rent, `${card.project.slug}: rent question`);
  for (const seg of card.rent.segments) {
    for (const value of [seg.low_egp, seg.average_egp, seg.high_egp]) assert.ok(rent.answer.includes(new Intl.NumberFormat("en-US").format(value)), `${card.project.slug}: rent ${value}`);
  }
  // The website keeps the documentation, from card.evidence: basis and how many listings.
  assert.ok(card.evidence?.rent?.basis, `${card.project.slug}: rent evidence`);
  assert.ok(rent.answer.includes(card.evidence.rent.basis), `${card.project.slug}: rent basis shown on the website`);
  assert.match(rent.answer, /إعلان/, `${card.project.slug}: listings count shown on the website`);
  // Yield: the card's own sentence (on the amount paid until handover), when the card has an example.
  if (card.yield_example) {
    assert.ok(byName(items, "العائد").answer.endsWith(card.yield_example.spoken), "yield: the card's own sentence");
    assert.ok(byName(items, "العائد").answer.startsWith(`مثال: ${card.yield_example.unit}`), "yield: names the example unit");
  } else {
    assert.equal(byName(items, "العائد"), undefined, `${card.project.slug}: no yield question without an example`);
  }
  // Resale per sqm, with its evidence basis; resale.note is assistant guidance, not page text.
  if (card.resale) {
    assert.equal(all.includes(card.resale.note), false, "resale note is assistant guidance, not page text");
    const resale = byName(items, "سعر الريسيل").answer;
    assert.ok(resale.includes(new Intl.NumberFormat("en-US").format(card.resale.price_per_sqm_egp.average)));
    if (card.evidence?.resale?.basis) assert.ok(resale.includes(card.evidence.resale.basis), `${card.project.slug}: resale basis shown on the website`);
  }
  // Plans, offers (prefix "<project> (dev): " dropped, source kept), developer record.
  assert.ok(byName(items, "إيه أنظمة السداد"));
  const offers = byName(items, "إيه العروض الحالية");
  assert.equal(offers.answer, "خصم 15% على 12 سنة (حسب المطور، 2026-11-16)");
  assert.match(byName(items, "Mountain View سلّمت").answer, /2005/);
  assert.match(byName(items, "Mountain View سلّمت").answer, /Club Park/);

  // Never published: the disadvantage, the ask-only answers, listing-site names.
  assert.equal(all.includes(card.summary.disadvantage.text), false, `${card.project.slug}: disadvantage hidden`);
  for (const hidden of card.ask_only_if_client_asks || []) assert.equal(all.includes(hidden.answer), false, `${card.project.slug}: ask-only hidden (${hidden.topic})`);
  assert.equal(LISTING_SITES.test(all), false, `${card.project.slug}: no listing-site names`);

  const html = numbersFaqHtml(items, { projectName: card.project.name_ar, updated: numbersFaqUpdated({ card, facts }), escapeHtml });
  assert.match(html, /id="numbers"/);
  assert.match(html, /آخر تحديث/);
}

// A project without a card still gets its live offers and rental facts; a fact naming a listing site is dropped.
const plain = numbersFaq({
  projectName: "The Residence",
  developer: "Salam Properties",
  card: null,
  facts: [
    { category: "offer", statement_ar: "The Residence (Salam Properties): نظام تقسيط على 11 سنة", source_label: "حسب المطور، 2026-11-23" },
    { category: "rental", statement_ar: "عائد 18% لـ 22% لوحدات Hilton", source_label: "حسب المطور، 2026-11-19" },
    { category: "track_record", statement_ar: "حسب Nawy سلّمت مشروعين" },
  ],
});
assert.deepEqual(plain.map((item) => item.question), ["إيه العروض الحالية في The Residence؟", "الإيجار والعائد في The Residence كام؟"]);
assert.deepEqual(numbersFaq({ projectName: "X", card: null, facts: [] }), []);
assert.equal(numbersFaqHtml([], { projectName: "X", updated: "", escapeHtml }), "");

console.log("Numbers FAQ checks passed");
