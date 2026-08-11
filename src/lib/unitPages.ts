const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};

const SUPABASE_URL =
  viteEnv.VITE_SUPABASE_URL || "https://coqnjymekrkoausiiytm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  viteEnv.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_6VFTijqKQB6RD7nIsSj_JQ_eEdoibGg";

export interface UnitPageData {
  id: string;
  project_id: string;
  project_slug: string;
  project_name: string;
  developer: string;
  location: string;
  unit_type: string;
  bedrooms_text: string;
  area_sqm: number;
  starting_price: number;
  down_payment_text: string;
  installments_text: string;
  delivery_text: string;
  finishing: string;
  description: string;
  image_url: string;
  gallery_urls: string;
  brochure_url: string;
  video_url: string;
  last_updated_at: string;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function numberValue(value: unknown) {
  const parsed = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function slugify(value: unknown) {
  return text(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function getRows(table: string, params: URLSearchParams) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`${table} ${response.status}`);
  return (await response.json()) as Record<string, unknown>[];
}

export interface SiblingUnitRow {
  id: string;
  unit_type: string;
  bedrooms_text: string;
  area_sqm: number;
  starting_price: number;
}

export async function loadUnitSiblings(projectId: string, excludeId: string): Promise<SiblingUnitRow[]> {
  if (!projectId) return [];
  const params = new URLSearchParams({
    select: "id,unit_type,bedrooms_text,area_sqm,starting_price",
    project_id: `eq.${projectId}`,
    id: `neq.${excludeId}`,
    availability_status: "eq.available",
    limit: "20",
  });
  try {
    const rows = await getRows("units", params);
    return rows.map((row) => ({
      id: text(row.id),
      unit_type: text(row.unit_type),
      bedrooms_text: text(row.bedrooms_text),
      area_sqm: numberValue(row.area_sqm),
      starting_price: numberValue(row.starting_price),
    }));
  } catch {
    return [];
  }
}

export async function loadUnitPage(id: string): Promise<UnitPageData | null> {
  const unitParams = new URLSearchParams({
    select:
      "id,project_id,project_name,developer,location,unit_type,bedrooms_text,area_sqm,starting_price,down_payment_text,installments_text,delivery_text,finishing,description,image_url,gallery_urls,brochure_url,video_url,last_updated_at",
    id: `eq.${id}`,
    availability_status: "eq.available",
    limit: "1",
  });
  const [unit] = await getRows("units", unitParams);
  if (!unit) return null;

  const projectId = text(unit.project_id);
  const projectParams = new URLSearchParams({
    select: "name,slug",
    id: `eq.${projectId}`,
    limit: "1",
  });
  const [project] = projectId ? await getRows("projects", projectParams) : [];

  return {
    id: text(unit.id),
    project_id: projectId,
    project_slug:
      text(project?.slug) ||
      `${slugify(project?.name || unit.project_name)}--${slugify(unit.developer)}`,
    project_name: text(unit.project_name),
    developer: text(unit.developer),
    location: text(unit.location),
    unit_type: text(unit.unit_type),
    bedrooms_text: text(unit.bedrooms_text),
    area_sqm: numberValue(unit.area_sqm),
    starting_price: numberValue(unit.starting_price),
    down_payment_text: text(unit.down_payment_text),
    installments_text: text(unit.installments_text),
    delivery_text: text(unit.delivery_text),
    finishing: text(unit.finishing),
    description: text(unit.description),
    image_url: text(unit.image_url),
    gallery_urls: text(unit.gallery_urls),
    brochure_url: text(unit.brochure_url),
    video_url: text(unit.video_url),
    last_updated_at: text(unit.last_updated_at),
  };
}
