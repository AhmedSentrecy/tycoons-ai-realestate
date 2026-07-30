"use strict";

const {
  SITE_URL,
  CACHE_HEADERS,
  GUIDES,
  fetchUnits,
  groupProjects,
  projectLocation,
  projectLastUpdated,
  areaFor,
  slugify,
  escapeHtml,
} = require("./_seo-utils.cjs");

exports.handler = async function handler() {
  try {
    const projects = groupProjects(await fetchUnits());
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

    for (const slug of Object.keys(GUIDES)) {
      urls.set(`${SITE_URL}/guides/${slug}/`, "2026-07-26");
    }
    for (const project of projects) {
      const updated = projectLastUpdated(project);
      const area = areaFor(projectLocation(project));
      urls.set(`${SITE_URL}/projects/${project.slug}`, updated);
      for (const lang of ["ar", "en"]) {
        urls.set(`${SITE_URL}/${lang}/projects/${project.slug}`, updated);
        if (area.indexable) {
          urls.set(`${SITE_URL}/${lang}/areas/${area.slug}`, updated);
        }
        urls.set(`${SITE_URL}/${lang}/developers/${slugify(project.developer)}`, updated);
      }
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
