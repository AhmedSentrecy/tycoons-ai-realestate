"use strict";

const {
  SITE_URL,
  CACHE_HEADERS,
  GUIDES,
  areaFor,
  slugify,
  escapeHtml,
} = require("./_seo-utils.cjs");
const { indexableUnitIds } = require("./_unit-indexing.cjs");

const SUPABASE_URL = process.env.SUPABASE_URL || "https://coqnjymekrkoausiiytm.supabase.co";
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_6VFTijqKQB6RD7nIsSj_JQ_eEdoibGg";

async function fetchRows(table, select, filters = {}) {
  const rows = [];
  for (let offset = 0; offset < 5000; offset += 1000) {
    const params = new URLSearchParams({
      select,
      limit: "1000",
      offset: String(offset),
      ...filters,
    });
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
      headers: { apikey: SUPABASE_KEY, Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`${table} index ${response.status}`);
    const page = await response.json();
    if (!Array.isArray(page)) throw new Error(`${table} index invalid`);
    rows.push(...page);
    if (page.length < 1000) break;
  }
  return rows;
}

exports.handler = async function handler() {
  try {
    const [projects, units] = await Promise.all([
      fetchRows("projects", "id,name,slug,developer,location,last_updated_at"),
      fetchRows("units", "id,project_id,project_name,developer,location,unit_type,bedrooms_text,area_sqm,starting_price,description,last_updated_at", {
        availability_status: "eq.available",
        project_id: "not.is.null",
      }),
    ]);
    const projectsById = new Map(projects.map((project) => [project.id, project]));
    const activeProjectIds = new Set(units.map((unit) => unit.project_id));
    const indexableIds = indexableUnitIds(units);
    const urls = new Map([
      [`${SITE_URL}/`, null],
      [`${SITE_URL}/about`, null],
      [`${SITE_URL}/faq`, null],
      [`${SITE_URL}/methodology`, "2026-07-26"],
      [`${SITE_URL}/corrections`, "2026-07-26"],
      [`${SITE_URL}/contact`, "2026-07-26"],
      [`${SITE_URL}/ar/`, null],
      [`${SITE_URL}/en/`, null],
    ]);

    for (const guideSlug of Object.keys(GUIDES)) {
      urls.set(`${SITE_URL}/guides/${guideSlug}/`, "2026-07-26");
    }
    for (const project of projects) {
      const projectSlug = String(project.slug || "").trim() || `${slugify(project.name)}--${slugify(project.developer)}`;
      if (!projectSlug) continue;
      const updated = project.last_updated_at || null;
      const area = areaFor(project.location);
      urls.set(`${SITE_URL}/projects/${projectSlug}`, updated);
      if (!activeProjectIds.has(project.id)) continue;
      for (const lang of ["ar", "en"]) {
        if (area.indexable) urls.set(`${SITE_URL}/${lang}/areas/${area.slug}`, updated);
        urls.set(`${SITE_URL}/${lang}/developers/${slugify(project.developer)}`, updated);
      }
    }
    for (const unit of units) {
      if (!projectsById.has(unit.project_id)) continue;
      if (!indexableIds.has(String(unit.id))) continue;
      urls.set(`${SITE_URL}/units/${unit.id}`, unit.last_updated_at || null);
    }

    const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...urls.entries()]
  .map(([loc, lastmod]) => `  <url><loc>${escapeHtml(loc)}</loc>${lastmod ? `<lastmod>${escapeHtml(new Date(lastmod).toISOString())}</lastmod>` : ""}</url>`)
  .join("\n")}
</urlset>`;
    return {
      statusCode: 200,
      headers: { ...CACHE_HEADERS, "content-type": "application/xml; charset=utf-8" },
      body,
    };
  } catch (error) {
    console.error("[sitemap]", error);
    return {
      statusCode: 503,
      headers: {
        "cache-control": "no-store",
        "content-type": "text/plain; charset=utf-8",
        "retry-after": "60",
      },
      body: "Sitemap is temporarily unavailable.",
    };
  }
};
