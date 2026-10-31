// Developer brands from Supabase `developers` (logo, Arabic name, short intro), loaded once
// per page view and matched by name or any alias. The developer's logo is shown on every
// one of its projects (search cards, project pages).
import { useEffect, useState } from "react";

const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};
const SUPABASE_URL = viteEnv.VITE_SUPABASE_URL || "https://coqnjymekrkoausiiytm.supabase.co";
const SUPABASE_KEY = viteEnv.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_6VFTijqKQB6RD7nIsSj_JQ_eEdoibGg";

export interface DeveloperBrand {
  slug: string;
  name: string;
  name_ar: string | null;
  aliases: string[] | null;
  logo_path: string | null;
  logo_on_dark: boolean | null;
  about_ar: string | null;
  about_en: string | null;
}

let cache: Promise<DeveloperBrand[]> | null = null;

// Public URL slug when it differs from the Supabase key (same map as netlify/functions/_seo-utils.cjs):
// "People & Places" is stored as `people-places` but its page lives at /developers/people-and-places.
const DEVELOPER_PUBLIC_SLUGS: Record<string, string> = { "people-places": "people-and-places" };

export function loadDevelopers(): Promise<DeveloperBrand[]> {
  if (!cache) {
    const params = new URLSearchParams({ select: "slug,name,name_ar,aliases,logo_path,logo_on_dark,about_ar,about_en", limit: "500" });
    cache = fetch(`${SUPABASE_URL}/rest/v1/developers?${params}`, { headers: { apikey: SUPABASE_KEY, Accept: "application/json" } })
      .then((response) => (response.ok ? response.json() : []))
      .then((rows) => (Array.isArray(rows) ? (rows as DeveloperBrand[]) : []))
      .then((rows) => rows.map((row) => (DEVELOPER_PUBLIC_SLUGS[row.slug] ? { ...row, slug: DEVELOPER_PUBLIC_SLUGS[row.slug] } : row)))
      .catch(() => []);
  }
  return cache;
}

const key = (value: unknown) => String(value ?? "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, "-").replace(/^-+|-+$/g, "");

export function findDeveloper(rows: DeveloperBrand[], name: unknown): DeveloperBrand | null {
  const wanted = key(name);
  if (!wanted) return null;
  return rows.find((row) => row.slug === wanted || key(row.name) === wanted || (row.aliases ?? []).some((alias) => key(alias) === wanted)) ?? null;
}

export function developerLogoUrl(row: DeveloperBrand | null) {
  const path = row?.logo_path;
  return path ? `${SUPABASE_URL}/storage/v1/object/public/brand-logos/${path.split("/").map(encodeURIComponent).join("/")}` : "";
}

/** The developer brand for a developer name (null until loaded or when unknown). */
export function useDeveloper(name: unknown): DeveloperBrand | null {
  const [row, setRow] = useState<DeveloperBrand | null>(null);
  useEffect(() => {
    let active = true;
    void loadDevelopers().then((rows) => { if (active) setRow(findDeveloper(rows, name)); });
    return () => { active = false; };
  }, [name]);
  return row;
}
