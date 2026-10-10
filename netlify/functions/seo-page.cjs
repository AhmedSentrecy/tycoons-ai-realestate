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
  renderEditorialArticle,
  renderStaticPage,
  notFound,
} = require("./_seo-utils.cjs");

const SUPABASE_URL = process.env.SUPABASE_URL || "https://coqnjymekrkoausiiytm.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "sb_publishable_6VFTijqKQB6RD7nIsSj_JQ_eEdoibGg";

const EDITORIAL_BASE_COLUMNS = "id,status,language,title,slug,excerpt,body_markdown,meta_title,meta_description,reviewed_by_name,reviewed_at,published_at,updated_at";
const EDITORIAL_SEO_COLUMNS = `${EDITORIAL_BASE_COLUMNS},source_refs,focus_keyword,key_takeaways,faq,translation_key,hero_image_url`;

async function fetchPublishedEditorial(filters, columns) {
  const params = new URLSearchParams({ select: columns, ...filters, status: "eq.published", limit: "1" });
  const response = await fetch(`${SUPABASE_URL}/rest/v1/published_editorial_articles?${params}`, {
    headers: { apikey: SUPABASE_KEY, Accept: "application/json" }, signal: AbortSignal.timeout(8000),
  });
  if ([400, 404].includes(response.status)) return { missing: true, row: null };
  if (!response.ok) throw new Error(`editorial article ${response.status}`);
  const rows = await response.json();
  return { missing: false, row: Array.isArray(rows) ? rows[0] || null : null };
}

async function fetchEditorialArticle(slug, lang) {
  const filters = { slug: `eq.${slug}`, language: `eq.${lang}` };
  let result = await fetchPublishedEditorial(filters, EDITORIAL_SEO_COLUMNS);
  // Before the SEO-fields migration is applied the new columns do not exist (400):
  // fall back to the original column list so published guides keep rendering.
  if (result.missing) result = await fetchPublishedEditorial(filters, EDITORIAL_BASE_COLUMNS);
  return result.row;
}

async function fetchEditorialTranslation(article) {
  if (!article?.translation_key || !/^[0-9a-f-]{36}$/i.test(String(article.translation_key))) return null;
  try {
    const { row } = await fetchPublishedEditorial({
      translation_key: `eq.${article.translation_key}`,
      language: `eq.${article.language === "en" ? "ar" : "en"}`,
    }, EDITORIAL_SEO_COLUMNS);
    return row;
  } catch {
    return null; // hreflang is optional; never fail the page for it
  }
}

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
  const guideRoute = originalPath.match(/^\/(?:(en)\/)?guides\/(.+?)\/?$/);
  const staticRoute = originalPath.match(/^\/(about|faq|methodology|corrections|contact)\/?$/);
  const directoryRoute = originalPath.match(/^\/(ar|en)(?:\/directory)?\/?$/);

  const lang = route?.[1] === "en" || directoryRoute?.[1] === "en" || guideRoute?.[1] === "en" || params.lang === "en" ? "en" : "ar";
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
    rawSlug = guideRoute[2];
  } else if (staticRoute) {
    type = "static";
    rawSlug = staticRoute[1];
  } else if (directoryRoute) {
    type = "home";
  }

  const slug = decodeURIComponent(rawSlug.replace(/^\/+|\/+$/g, ""));

  try {
    let html = null;
    if (type === "guide") {
      html = renderGuide(slug, lang);
      if (!html) {
        const article = await fetchEditorialArticle(slug, lang);
        html = renderEditorialArticle(article, article ? await fetchEditorialTranslation(article) : null);
      }
    }
    if (type === "static") html = renderStaticPage(slug);
    if (!["guide", "static"].includes(type)) {
      const [units, projectsMeta] = await Promise.all([
        fetchUnits(),
        fetchProjectsMeta({ strict: type === "project" }),
      ]);
      const projects = groupProjects(units, projectsMeta);
      if (type === "home") html = renderDirectory(projects, lang);
      if (type === "project") {
        const hasCanonicalProject = projectsMeta.some((project) =>
          String(project.slug || "").trim() === slug);
        html = hasCanonicalProject ? renderProject(projects, slug, lang) : null;
      }
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
