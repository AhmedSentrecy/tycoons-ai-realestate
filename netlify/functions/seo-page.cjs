"use strict";

const {
  CACHE_HEADERS,
  fetchUnits,
  fetchProjectsMeta,
  groupProjects,
  renderDirectory,
  renderProject,
  renderUnit,
  renderCollection,
  renderGuide,
  renderStaticPage,
  notFound,
} = require("./_seo-utils.cjs");

exports.handler = async function handler(event) {
  const params = event.queryStringParameters || {};
  const originalPath = (() => {
    try {
      return new URL(event.rawUrl || `https://tycoons-inv.com${event.path || "/"}`).pathname;
    } catch {
      return event.path || "/";
    }
  })();
  const route = originalPath.match(/^\/(ar|en)\/(projects|areas|developers)\/(.+?)\/?$/);
  const unitRoute = originalPath.match(/^\/units\/(.+?)\/?$/);
  const guideRoute = originalPath.match(/^\/guides\/(.+?)\/?$/);
  const staticRoute = originalPath.match(/^\/(about|faq|methodology|corrections|contact)\/?$/);
  const directoryRoute = originalPath.match(/^\/(ar|en)\/?$/);

  const lang = route?.[1] === "en" || directoryRoute?.[1] === "en" || params.lang === "en" ? "en" : "ar";
  let type = String(params.type || "home");
  let rawSlug = String(params.slug || "");

  if (route) {
    type = { projects: "project", areas: "area", developers: "developer" }[route[2]];
    rawSlug = route[3];
  } else if (unitRoute) {
    type = "unit";
    rawSlug = unitRoute[1];
  } else if (guideRoute) {
    type = "guide";
    rawSlug = guideRoute[1];
  } else if (staticRoute) {
    type = "static";
    rawSlug = staticRoute[1];
  } else if (directoryRoute) {
    type = "home";
  }

  const slug = decodeURIComponent(rawSlug.replace(/^\/+|\/+$/g, ""));

  try {
    let html = null;
    if (type === "guide") html = renderGuide(slug);
    if (type === "static") html = renderStaticPage(slug);
    if (!["guide", "static"].includes(type)) {
      const [units, projectsMeta] = await Promise.all([fetchUnits(), fetchProjectsMeta()]);
      const projects = groupProjects(units, projectsMeta);
      if (type === "home") html = renderDirectory(projects, lang);
      if (type === "project") html = renderProject(projects, slug, lang);
      if (type === "unit") html = renderUnit(projects, slug, "ar");
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
