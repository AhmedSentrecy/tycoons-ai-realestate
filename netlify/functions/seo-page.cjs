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
  const originalPath = (() => {
    try {
      return new URL(event.rawUrl || `https://tycoons-inv.com${event.path || "/"}`).pathname;
    } catch {
      return event.path || "/";
    }
  })();
  const route = originalPath.match(/^\/(ar|en)\/(projects|areas|developers)\/(.+?)\/?$/);
  const guideRoute = originalPath.match(/^\/guides\/(.+?)\/?$/);
  const staticRoute = originalPath.match(/^\/(about|faq|methodology|corrections|contact)\/?$/);
  const directoryRoute = originalPath.match(/^\/(ar|en)\/?$/);

  const lang = route?.[1] === "en" || directoryRoute?.[1] === "en" || params.lang === "en" ? "en" : "ar";
  let type = String(params.type || "home");
  let rawSlug = String(params.slug || "");

  if (route) {
    type = { projects: "project", areas: "area", developers: "developer" }[route[2]];
    rawSlug = route[3];
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
