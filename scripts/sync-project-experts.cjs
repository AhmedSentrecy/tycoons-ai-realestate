// Pulls the expert cards (rent, yield, resale, payment plans, developer facts) from Supabase into
// content/project-experts/cards.json before tests and build. Supabase is the single source:
// edit the cards in the project_experts table, then rebuild the site («حدّث الموقع»).
// The public view project_experts_public never carries the internal source list (listing websites).
// If Supabase can't be reached, the last pulled copy stays as it is, so the site never loses its cards.
const fs = require("node:fs");
const path = require("node:path");

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://coqnjymekrkoausiiytm.supabase.co";
const KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "sb_publishable_6VFTijqKQB6RD7nIsSj_JQ_eEdoibGg";
const OUT = path.join(__dirname, "..", "content", "project-experts", "cards.json");

async function main() {
  const url = `${SUPABASE_URL}/rest/v1/project_experts_public?select=slug,card_version,card,updated_at&order=slug`;
  let rows;
  try {
    const response = await fetch(url, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Accept: "application/json" }, signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    rows = await response.json();
  } catch (error) {
    console.warn(`[sync-project-experts] Supabase not reachable (${error.message}); keeping the last copy in ${path.relative(process.cwd(), OUT)}`);
    return;
  }
  if (!Array.isArray(rows) || !rows.length) {
    console.warn("[sync-project-experts] Supabase returned no cards; keeping the last copy");
    return;
  }
  const cards = rows
    .map((row) => row.card)
    .filter((card) => card && card.project && card.project.slug && card.summary)
    .map((card) => {
      const { sources, ...rest } = card; // never ship the internal source list
      void sources;
      return rest;
    });
  const body = {
    generated_from: "Supabase project_experts_public — don't edit this file by hand",
    cards,
  };
  fs.writeFileSync(OUT, JSON.stringify(body, null, 1) + "\n");
  console.log(`[sync-project-experts] ${cards.length} expert cards pulled from Supabase`);
}

main();
