"use strict";

// Developer reputation order (best-known first). Area pages, the directory and the
// project lists show the biggest names first instead of the cheapest project first.
// Matched on the normalized developer name, so name variants ("La Vista", "Lavista
// Developments") land on the same rank. Developers not listed come after, by size.
const DEVELOPER_RANK = [
  // Tier 1 — the biggest, best-known names
  /\btalaat (?:moustafa|mostafa)\b|\btmg\b/,
  /\bpalm hills?\b/,
  /\bemaar\b/,
  /\bmountain view\b/,
  /\bsodic\b/,
  /^hyde ?park|^hydepark/,
  /\bcity edge\b/,
  /\bmadinet (?:masr|nasr)\b/,
  /\bla ?vista\b/,
  /\btatweer misr\b/,
  /\bora\b/,
  /\borascom\b/,
  /\b(?:qatari )?diar\b/,
  // Tier 2 — strong, well-known developers
  /\bal ahly sabbour\b/,
  /\bmarakez\b/,
  /\bhassan allam\b/,
  /\bpre group\b|^pre\b/,
  /\bil cazar\b/,
  /\bhdp\b|housing and development/,
  /\bsaudi egyptian developers\b|\bsed\b/,
  /\bwaterway\b/,
  /\bfounders by hyde park\b/,
  /\blmd\b/,
  /\bstm\b/,
  /\bnations of sky\b/,
  /\barab developers holding\b|\badh\b/,
  // Tier 3 — growing names
  /\bpeople (?:&|and) places\b/,
  /\bmadaar\b/,
  /\bnaia\b/,
  /\binertia\b/,
  /^mass\b/,
  /\bgates\b/,
  /\bsky ad\b/,
  /\bal qamzi\b/,
  /^n developments\b/,
  /\bmain marks\b/,
  /\bdubai misr\b/,
  /\bmisr italia\b/,
  /\bdorra\b/,
  /\bmarasem\b/,
  /\btameer\b/,
  /\barabella\b/,
  /\breportage\b/,
  /\bakam alrajhi\b/,
  /\bal ?- ?borouj\b|\babm\b/,
  /\bnakheel\b/,
];

function normalized(name) {
  return String(name || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9& ]+/g, " ").replace(/\s+/g, " ").trim();
}

/** 0 for the best-known developer; unknown developers get a large number. */
function developerRank(name) {
  const value = normalized(name);
  const index = DEVELOPER_RANK.findIndex((pattern) => pattern.test(value));
  return index === -1 ? 1000 : index;
}

module.exports = { developerRank, DEVELOPER_RANK };
