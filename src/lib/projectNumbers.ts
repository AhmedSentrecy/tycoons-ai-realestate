import { useEffect, useMemo, useState } from "react";
import { numbersFaq, numbersFaqUpdated, type NumbersFaqFact, type NumbersFaqItem } from "../../netlify/functions/_numbers-faq.cjs";
import { projectExpertCard } from "./projectExperts";

// «أسئلة بالأرقام» on the React project page — the same questions and answers as the pre-rendered page
// (scripts/lib/data-pages.cjs), from the same data: the expert card (Supabase project_experts, pulled at
// build) and the active sales facts (Supabase sales_facts_public, read live here).

const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};
const SUPABASE_URL = viteEnv.VITE_SUPABASE_URL || "https://coqnjymekrkoausiiytm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = viteEnv.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_6VFTijqKQB6RD7nIsSj_JQ_eEdoibGg";

type Fact = NumbersFaqFact & { project_id: string };
let allFacts: Promise<Map<string, Fact[]>> | null = null;

/** Every active sales fact linked to a project (one small request per visit), grouped by project id. Never throws. */
function loadSalesFacts(): Promise<Map<string, Fact[]>> {
  allFacts ??= fetch(
    `${SUPABASE_URL}/rest/v1/sales_facts_public?${new URLSearchParams({ select: "project_id,category,kind,statement_ar,source_label,source_date,valid_until", project_id: "not.is.null", limit: "3000" })}`,
    { headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Accept: "application/json" } },
  )
    .then((response) => (response.ok ? response.json() : []))
    .then((rows: Fact[]) => {
      const map = new Map<string, Fact[]>();
      for (const row of Array.isArray(rows) ? rows : []) map.set(row.project_id, [...(map.get(row.project_id) ?? []), row]);
      return map;
    })
    .catch(() => new Map<string, Fact[]>());
  return allFacts;
}

export function useProjectNumbers(input: { projectId?: string | null; slug?: string | null; projectName: string; developer?: string | null }): { items: NumbersFaqItem[]; updated: string } {
  const [map, setMap] = useState<Map<string, Fact[]> | null>(null);
  useEffect(() => {
    let active = true;
    void loadSalesFacts().then((next) => { if (active) setMap(next); });
    return () => { active = false; };
  }, []);
  const { projectId, slug, projectName, developer } = input;
  return useMemo(() => {
    const card = projectExpertCard(slug);
    const facts = (projectId && map?.get(projectId)) || [];
    return { items: numbersFaq({ projectName, developer, card, facts }), updated: numbersFaqUpdated({ card, facts }) };
  }, [map, projectId, slug, projectName, developer]);
}
