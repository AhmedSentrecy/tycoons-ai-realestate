import { useCallback, useEffect, useState } from "react";

const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};

const SUPABASE_URL =
  viteEnv.VITE_SUPABASE_URL || "https://coqnjymekrkoausiiytm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  viteEnv.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_6VFTijqKQB6RD7nIsSj_JQ_eEdoibGg";
const CACHE_TTL_MS = 5 * 60 * 1000;
const PAGE_SIZE = 1000;

export interface InventoryUnit {
  project_name: string;
  developer: string;
  location: string;
  unit_type: string;
  bedrooms_text: string;
  area_sqm: number | null;
  starting_price: number;
  down_payment_text: string;
  installments_text: string;
  delivery_text: string;
  finishing: string;
  availability_status: string;
  description: string;
  image_url: string;
  gallery_urls: string;
  brochure_url: string;
  video_url: string;
  last_updated_at: string;
  images: string[];
}

export interface InventoryStats {
  units: number;
  projects: number;
  developers: number;
  locations: number;
}

interface InventoryCache {
  units: InventoryUnit[];
  fetchedAt: number;
}

let cache: InventoryCache | null = null;
let pending: Promise<InventoryUnit[]> | null = null;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function numberValue(value: unknown): number {
  const parsed = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseImages(imageUrl: string, galleryUrls: string): string[] {
  const urls = [
    imageUrl,
    ...galleryUrls
      .split(",")
      .map((url) => url.trim())
      .filter(Boolean),
  ].filter(Boolean);
  return [...new Set(urls)];
}

function normalizeUnit(row: Record<string, unknown>): InventoryUnit | null {
  const projectName = text(row.project_name);
  const unitType = text(row.unit_type);
  const startingPrice = numberValue(row.starting_price);
  if (!projectName || !unitType || startingPrice <= 0) return null;

  const imageUrl = text(row.image_url);
  const galleryUrls = text(row.gallery_urls);

  return {
    project_name: projectName,
    developer: text(row.developer),
    location: text(row.location),
    unit_type: unitType,
    bedrooms_text: text(row.bedrooms_text),
    area_sqm: numberValue(row.area_sqm) || null,
    starting_price: startingPrice,
    down_payment_text: text(row.down_payment_text),
    installments_text: text(row.installments_text),
    delivery_text: text(row.delivery_text),
    finishing: text(row.finishing),
    availability_status: text(row.availability_status),
    description: text(row.description),
    image_url: imageUrl,
    gallery_urls: galleryUrls,
    brochure_url: text(row.brochure_url),
    video_url: text(row.video_url),
    last_updated_at: text(row.last_updated_at),
    images: parseImages(imageUrl, galleryUrls),
  };
}

export function inventoryUnitKey(unit: InventoryUnit): string {
  return [
    unit.project_name,
    unit.developer,
    unit.unit_type,
    unit.bedrooms_text,
    unit.area_sqm ?? "",
    unit.starting_price,
  ]
    .join("|")
    .toLowerCase();
}

export function fallbackImageFor(unit: InventoryUnit): string {
  const type = `${unit.unit_type} ${unit.location}`.toLowerCase();
  if (/chalet|cabin|شاليه|north coast|sahel|sokhna/.test(type)) return "/images/project-chalet.webp";
  if (/villa|ivilla|twin|town|فيلا/.test(type)) return "/images/project-villa.webp";
  if (/office|clinic|retail|shop|commercial|مكتب|عياده|محل/.test(type)) return "/images/region-capital.webp";
  if (/new cairo|mostakbal|القاهره|التجمع/.test(type)) return "/images/region-newcairo.webp";
  return "/images/project-apartment.webp";
}

export function inventoryStats(units: InventoryUnit[]): InventoryStats {
  return {
    units: units.length,
    projects: new Set(units.map((unit) => unit.project_name.toLowerCase())).size,
    developers: new Set(units.map((unit) => unit.developer.toLowerCase()).filter(Boolean)).size,
    locations: new Set(units.map((unit) => unit.location.toLowerCase()).filter(Boolean)).size,
  };
}

async function fetchPage(offset: number): Promise<InventoryUnit[]> {
  const columns = [
    "project_name",
    "developer",
    "location",
    "unit_type",
    "bedrooms_text",
    "area_sqm",
    "starting_price",
    "down_payment_text",
    "installments_text",
    "delivery_text",
    "finishing",
    "availability_status",
    "description",
    "image_url",
    "gallery_urls",
    "brochure_url",
    "video_url",
    "last_updated_at",
  ].join(",");

  const params = new URLSearchParams({
    select: columns,
    availability_status: "eq.available",
    order: "starting_price.asc",
    limit: String(PAGE_SIZE),
    offset: String(offset),
  });

  const response = await fetch(`${SUPABASE_URL}/rest/v1/units?${params.toString()}`, {
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`inventory ${response.status}`);
  }

  const rows = (await response.json()) as Record<string, unknown>[];
  return rows.map(normalizeUnit).filter((unit): unit is InventoryUnit => Boolean(unit));
}

export async function loadInventory(force = false): Promise<InventoryUnit[]> {
  if (!force && cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache.units;
  if (!force && pending) return pending;

  pending = (async () => {
    const units: InventoryUnit[] = [];
    for (let offset = 0; offset < 5000; offset += PAGE_SIZE) {
      const page = await fetchPage(offset);
      units.push(...page);
      if (page.length < PAGE_SIZE) break;
    }
    cache = { units, fetchedAt: Date.now() };
    return units;
  })().finally(() => {
    pending = null;
  });

  return pending;
}

export function useInventory() {
  const [units, setUnits] = useState<InventoryUnit[]>(cache?.units ?? []);
  const [loading, setLoading] = useState(!cache);
  const [error, setError] = useState("");

  const refresh = useCallback(async (force = false) => {
    setLoading(true);
    setError("");
    try {
      const next = await loadInventory(force);
      setUnits(next);
    } catch {
      setError("تعذّر تحميل المخزون العقاري دلوقتي");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void loadInventory(false)
      .then((next) => {
        if (!active) return;
        setUnits(next);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError("تعذّر تحميل المخزون العقاري دلوقتي");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return {
    units,
    stats: inventoryStats(units),
    loading,
    error,
    refresh: () => refresh(true),
  };
}
