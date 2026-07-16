"use strict";

const {
  CACHE_HEADERS,
  fetchUnits,
  groupProjects,
  renderProjectPage,
  renderCollectionPage,
  renderDirectoryPage,
  notFoundPage,
} = require("./_seo-utils");

exports.handler = async function handler(event) {
  const params = event.queryStringParameters || {};
  const lang = params.lang === "en" ? "en" : "ar";
  const type = ["home", "project", "area", "developer"].includes(params.type) ? params.type : "home";
  const slug = decodeURIComponent(String(params.slug || "").replace(/^\/+|\/+$/g, ""));

  try {
    const units = await fetchUnits();
    const projects = groupProjects(units);
    let html = null;

    if (type === "home") html = renderDirectoryPage(projects, lang);
    if (type === "project" && slug) html = renderProjectPage(projects, slug, lang);
    if (type === "area" && slug) html = renderCollectionPage(projects, "area", slug, lang);
    if (type === "developer" && slug) html = renderCollectionPage(projects, "developer", slug, lang);

    if (!html) {
      return {
        statusCode: 404,
        headers: { ...CACHE_HEADERS, "content-language": lang, "content-type": "text/html; charset=utf-8" },
        body: notFoundPage(lang),
      };
    }

    return {
      statusCode: 200,
      headers: { ...CACHE_HEADERS, "content-language": lang, "content-type": "text/html; charset=utf-8" },
      body: html,
    };
  } catch (error) {
    console.error("[seo-page]", error);
    return {
      statusCode: 503,
      headers: {
        ...CACHE_HEADERS,
        "content-language": lang,
        "cache-control": "no-store",
        "content-type": "text/html; charset=utf-8",
        "retry-after": "60",
      },
      body: notFoundPage(lang),
    };
  }
};
