import { useEffect, useState } from "react";
import { liveOffers, type ProjectOfferRow } from "../../netlify/functions/_project-offers.cjs";

const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};
const SUPABASE_URL = viteEnv.VITE_SUPABASE_URL || "https://coqnjymekrkoausiiytm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = viteEnv.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_6VFTijqKQB6RD7nIsSj_JQ_eEdoibGg";

export type ProjectOffer = ProjectOfferRow & { project_id: string };
export { OFFER_LABELS_AR, liveOffers, untilAr } from "../../netlify/functions/_project-offers.cjs";

let allOffers: Promise<Map<string, ProjectOffer[]>> | null = null;

/** Every live offer on the site (one small request per visit), grouped by project id. Never throws. */
export function loadLiveOffers(): Promise<Map<string, ProjectOffer[]>> {
  allOffers ??= fetch(
    `${SUPABASE_URL}/rest/v1/project_offers?${new URLSearchParams({ select: "project_id,kind,title_ar,body_ar,valid_until,created_at", limit: "2000" })}`,
    { headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Accept: "application/json" } },
  )
    .then((response) => (response.ok ? response.json() : []))
    .then((rows: ProjectOffer[]) => {
      const map = new Map<string, ProjectOffer[]>();
      for (const row of liveOffers(Array.isArray(rows) ? rows : [])) map.set(row.project_id, [...(map.get(row.project_id) ?? []), row]);
      return map;
    })
    .catch(() => new Map<string, ProjectOffer[]>());
  return allOffers;
}

/** The live offers of one project ([] while loading or when there are none). */
export function useProjectOffers(projectId: string | null | undefined): ProjectOffer[] {
  const [map, setMap] = useState<Map<string, ProjectOffer[]> | null>(null);
  useEffect(() => {
    let active = true;
    void loadLiveOffers().then((next) => { if (active) setMap(next); });
    return () => { active = false; };
  }, []);
  return (projectId && map?.get(projectId)) || [];
}
