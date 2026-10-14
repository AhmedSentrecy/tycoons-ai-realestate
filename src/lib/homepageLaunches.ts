// Homepage "بتتطرح دلوقتي" carousel: the projects the admin picked (projects.targeting.homepage_launch),
// with live prices from available units. Falls back to the built-in list when nothing is picked.
import type { Project } from "@/data/projects";
import { arabicField } from "@/lib/arabicFields";

const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};
const SUPABASE_URL = viteEnv.VITE_SUPABASE_URL || "https://coqnjymekrkoausiiytm.supabase.co";
const SUPABASE_KEY = viteEnv.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_6VFTijqKQB6RD7nIsSj_JQ_eEdoibGg";

type Row = Record<string, unknown>;
const text = (value: unknown) => String(value ?? "").trim();
const num = (value: unknown) => {
  const parsed = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const AREAS: [RegExp, string, string][] = [
  [/mostakbal|مستقبل/i, "mostakbal-city", "مستقبل سيتي"],
  [/new alamein|العلمين الجديد/i, "new-alamein", "العلمين الجديدة"],
  [/new cairo|fifth settlement|tagamo|التجمع|القاهرة الجديدة/i, "new-cairo", "التجمع / القاهرة الجديدة"],
  [/north coast|sahel|ras el|الساحل|alamein|العلمين/i, "north-coast", "الساحل الشمالي"],
  [/sokhna|galala|السخنة|الجلالة/i, "ain-sokhna", "العين السخنة"],
  [/zayed|زايد/i, "sheikh-zayed", "الشيخ زايد"],
  [/capital|العاصمة/i, "new-capital", "العاصمة الإدارية"],
  [/october|أكتوبر|اكتوبر/i, "october", "6 أكتوبر"],
];

async function rest(path: string, params: URLSearchParams) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}?${params}`, {
    headers: { apikey: SUPABASE_KEY, Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`${path} ${response.status}`);
  const rows = await response.json();
  return Array.isArray(rows) ? (rows as Row[]) : [];
}

function range(values: number[], suffix = "") {
  const clean = values.filter((value) => value > 0).sort((a, b) => a - b);
  if (!clean.length) return "—";
  const low = clean[0];
  const high = clean[clean.length - 1];
  return low === high ? `${low}${suffix}` : `${low}–${high}${suffix}`;
}

function delivery(texts: string[]) {
  if (texts.some((value) => /ready|immediate|فوري|جاهز/i.test(value))) return "فوري";
  const years = texts.map((value) => (value.match(/20\d\d/) || [])[0]).filter(Boolean).sort();
  if (years.length) return years[0] as string;
  const inYears = texts.map((value) => Number((value.match(/(\d+(?:\.\d+)?)\s*years?/i) || [])[1])).filter(Boolean).sort((a, b) => a - b)[0];
  return inYears ? `${inYears} سنين` : "—";
}

export async function loadHomepageLaunches(): Promise<Project[]> {
  const projects = await rest("projects", new URLSearchParams({
    select: "id,name,slug,developer,location,image_url,gallery_urls,targeting",
    "targeting->homepage_launch": "not.is.null",
    limit: "12",
  }));
  if (!projects.length) return [];
  const ids = projects.map((row) => text(row.id)).filter(Boolean);
  const units = await rest("units", new URLSearchParams({
    select: "project_id,unit_type,bedrooms_text,area_sqm,starting_price,delivery_text",
    availability_status: "eq.available",
    project_id: `in.(${ids.join(",")})`,
    limit: "1000",
  })).catch(() => [] as Row[]);
  return projects
    .map((row) => {
      const launch = ((row.targeting as Row | null)?.homepage_launch ?? {}) as Row;
      const own = units.filter((unit) => text(unit.project_id) === text(row.id));
      const prices = own.map((unit) => num(unit.starting_price)).filter((value) => value > 0);
      const min = prices.length ? Math.min(...prices) : 0;
      const location = text(row.location);
      const [, regionSlug, areaAr] = AREAS.find(([pattern]) => pattern.test(location)) ?? [null, "new-cairo", location];
      const types = own.map((unit) => text(unit.unit_type)).filter(Boolean);
      const commonType = types.sort((a, b) => types.filter((t) => t === b).length - types.filter((t) => t === a).length)[0] ?? "";
      const gallery = text(row.gallery_urls).split(",").map((value) => value.trim()).find(Boolean) ?? "";
      const project: Project & { rank: number } = {
        id: text(row.id),
        projectSlug: text(row.slug) || undefined,
        image: text(launch.image_url) || text(row.image_url) || gallery || "/images/project-apartment.webp",
        badge: text(launch.badge) || "جديد",
        type: arabicField(commonType, commonType) || "وحدات",
        developer: text(row.developer),
        title: text(row.name),
        location: areaAr,
        regionSlug,
        price: min ? `${(Math.round((min / 1e6) * 10) / 10).toString()} مليون جنيه` : "السعر عند الطلب",
        priceM: min / 1e6,
        beds: range(own.map((unit) => num(String(unit.bedrooms_text ?? "").match(/\d+/)?.[0]))),
        area: range(own.map((unit) => Math.round(num(unit.area_sqm))), " م²"),
        delivery: delivery(own.map((unit) => text(unit.delivery_text))),
        rank: num(launch.rank) || 99,
      };
      return project;
    })
    .sort((a, b) => a.rank - b.rank);
}
