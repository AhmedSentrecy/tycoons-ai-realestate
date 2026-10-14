"use strict";

// Developer reputation order (best-known first). Area pages, the directory and the
// project lists show the biggest names first instead of the cheapest project first.
// Matched on the normalized developer name, so name variants ("La Vista", "Lavista
// Developments") land on the same rank. Developers not listed come after, by size.
const DEVELOPER_RANK = [
  /\bemaar\b/,
  /\bsodic\b/,
  /\bpalm hills?\b/,
  /\bmountain view\b/,
  /\bora\b/,
  /\bhassan allam\b/,
  /\btalaat (?:moustafa|mostafa)\b|\btmg\b/,
  /^hyde ?park|^hydepark/,
  /\bmadinet (?:masr|nasr)\b/,
  /\bla ?vista\b/,
  /\btatweer misr\b/,
  /\b(?:qatari )?diar\b/,
  /\bcity edge\b/,
  /\bmarakez\b/,
  /\bal ahly sabbour\b/,
  /\bmisr italia\b/,
  /\bil cazar\b/,
  /\bdorra\b/,
  /\binertia\b/,
  /\blmd\b/,
  /\bpre group\b/,
  /\bdubai misr\b/,
  /\borascom\b/,
  /\bmarasem\b/,
  /\btameer\b/,
  /\barabella\b/,
  /\breportage\b/,
  /\bwaterway\b/,
  /\bfounders by hyde park\b/,
  /\bakam alrajhi\b/,
  /\bpeople (?:&|and) places\b/,
  /\bsaudi egyptian developers\b/,
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
