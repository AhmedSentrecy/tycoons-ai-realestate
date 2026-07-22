"use strict";

const {
  SITE_URL,
  CACHE_HEADERS,
  fetchUnits,
  groupProjects,
  projectLocation,
  projectLastUpdated,
  areaFor,
  slugify,
  escapeHtml,
} = require("./_seo-utils");

function addUrl(items, path, lastmod) {
  const key = `${SITE_URL}${path}`;
  if (items.has(key)) return;
  items.set(key, lastmod || null);
}

exports.handler = async function handler() {
  try {
    const units = await fetchUnits();
    const projects = groupProjects(units);
    const urls = new Map();

    addUrl(urls, "/");
    addUrl(urls, "/ar/");
    addUrl(urls, "/en/");

    for (const path of [
      "/about/",
      "/contact/",
      "/data-sources/",
      "/editorial-policy/",
      "/privacy/",
      "/compare/aliva-vs-bloomfields/",
    ]) addUrl(urls, path, "2026-07-22");

    for (const project of projects) {
      const lastmod = projectLastUpdated(project);
      for (const lang of ["ar", "en"]) {
        addUrl(urls, `/${lang}/projects/${project.slug}`, lastmod);
        addUrl(urls, `/${lang}/areas/${areaFor(projectLocation(project)).slug}`, lastmod);
        addUrl(urls, `/${lang}/developers/${slugify(project.developer)}`, lastmod);
      }
    }

    const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...urls.entries()].map(([loc, lastmod]) => `  <url>
    <loc>${escapeHtml(loc)}</loc>${lastmod ? `
    <lastmod>${escapeHtml(new Date(lastmod).toISOString())}</lastmod>` : ""}
  </url>`).join("\n")}
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
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "retry-after": "60" },
      body: "Sitemap is temporarily unavailable.",
    };
  }
};