"use strict";

const {
  CACHE_HEADERS,
  fetchUnits,
  groupProjects,
  renderDirectory,
  renderProject,
  renderCollection,
  renderGuide,
  renderStaticPage,
  notFound,
} = require("./_seo-utils.cjs");

exports.handler = async function handler(event) {
  const params = event.queryStringParameters || {};
  const lang = params.lang === "en" ? "en" : "ar";
  const type = String(params.type || "home");
  const slug = decodeURIComponent(String(params.slug || "").replace(/^\/+|\/+$/g, ""));

  try {
    let html = null;
    if (type === "guide") html = renderGuide(slug);
    if (type === "static") html = renderStaticPage(slug);
    if (!["guide", "static"].includes(type)) {
      const projects = groupProjects(await fetchUnits());
      if (type === "home") html = renderDirectory(projects, lang);
      if (type === "project") html = renderProject(projects, slug, lang);
      if (type === "area") html = renderCollection(projects, "area", slug, lang);
      if (type === "developer") html = renderCollection(projects, "developer", slug, lang);
    }
    if (!html) {
      return {
        statusCode: 404,
        headers: {
          ...CACHE_HEADERS,
          "content-language": lang,
          "content-type": "text/html; charset=utf-8",
          "x-robots-tag": "noindex, follow",
        },
        body: notFound(lang),
      };
    }
    return {
      statusCode: 200,
      headers: {
        ...CACHE_HEADERS,
        "content-language": lang,
        "content-type": "text/html; charset=utf-8",
      },
      body: html,
    };
  } catch (error) {
    console.error("[seo-page]", error);
    return {
      statusCode: 503,
      headers: {
        ...CACHE_HEADERS,
        "content-language": lang,
        "content-type": "text/html; charset=utf-8",
        "retry-after": "60",
        "x-robots-tag": "noindex, follow",
      },
      body: notFound(lang),
    };
  }
};
