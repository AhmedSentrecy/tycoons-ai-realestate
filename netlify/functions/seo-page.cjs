"use strict";

const {
  CACHE_HEADERS,
  fetchUnits,
  fetchProjectsMeta,
  fetchDevelopers,
  groupProjects,
  renderDirectory,
  renderProject,
  renderUnit,
  renderCollection,
  renderGuide,
  renderEditorialArticle,
  renderStaticPage,
  renderGuidesIndex,
  notFound,
  unitPath,
  findUnitByParam,
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

async function fetchRest(path, params) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}?${new URLSearchParams(params)}`, {
      headers: { apikey: SUPABASE_KEY, Accept: "application/json" }, signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) return [];
    const rows = await response.json();
    return Array.isArray(rows) ? rows : [];
  } catch {
    return []; // links are optional; never fail the page for them
  }
}

// The article's project row and the other published guides about it.
async function fetchEditorialExtras(article) {
  if (!article?.project_id || !/^[0-9a-f-]{36}$/i.test(String(article.project_id))) return {};
  const [projects, related] = await Promise.all([
    fetchRest("projects", { select: "id,name,slug,developer,location,image_url", id: `eq.${article.project_id}`, limit: "1" }),
    fetchRest("published_editorial_articles", { select: "title,slug,language,project_id", project_id: `eq.${article.project_id}`, language: `eq.${article.language}`, order: "published_at.desc", limit: "9" }),
  ]);
  return { project: projects[0] || null, related };
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
  const guidesIndexRoute = originalPath.match(/^\/(?:(en)\/)?guides\/?$/);
  const guideRoute = originalPath.match(/^\/(?:(en)\/)?guides\/(.+?)\/?$/);
  const staticRoute = originalPath.match(/^\/(about|faq|methodology|corrections|contact|privacy)\/?$/);
  const directoryRoute = originalPath.match(/^\/(ar|en)(?:\/directory)?\/?$/);

  const lang = route?.[1] === "en" || directoryRoute?.[1] === "en" || guideRoute?.[1] === "en" || guidesIndexRoute?.[1] === "en" || params.lang === "en" ? "en" : "ar";
  let type = String(params.type || "home");
  let rawSlug = String(params.slug || "");

  if (route) {
    type = { projects: "project", areas: "area", developers: "developer" }[route[2]];
    rawSlug = route[3];
  } else if (unitRoute) {
    type = "unit";
    rawSlug = unitRoute[1];
  } else if (guidesIndexRoute) {
    type = "guides";
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
        const [translation, extras] = article ? await Promise.all([fetchEditorialTranslation(article), fetchEditorialExtras(article)]) : [null, {}];
        html = renderEditorialArticle(article, translation, extras);
      }
    }
    if (type === "static") html = renderStaticPage(slug);
    if (type === "guides") {
      const articles = await fetchRest("published_editorial_articles", { select: "title,slug,language,excerpt,published_at", order: "published_at.desc", limit: "300" });
      html = renderGuidesIndex(lang, articles);
    }
    if (!["guide", "guides", "static"].includes(type)) {
      const [units, projectsMeta] = await Promise.all([
        fetchUnits(),
        fetchProjectsMeta({ strict: type === "project" }),
        fetchDevelopers(),
      ]);
      const projects = groupProjects(units, projectsMeta);
      if (type === "home") {
        const articles = await fetchRest("published_editorial_articles", { select: "title,slug,language,published_at", language: `eq.${lang}`, order: "published_at.desc", limit: "6" });
        html = renderDirectory(projects, lang, articles);
      }
      if (type === "project") {
        const hasCanonicalProject = projectsMeta.some((project) =>
          String(project.slug || "").trim() === slug);
        html = hasCanonicalProject ? renderProject(projects, slug, lang) : null;
      }
      if (type === "unit") {
        // Legacy /units/<uuid> and outdated words 301 to the one readable URL.
        const unit = findUnitByParam(projects.flatMap((project) => project.units), slug);
        const owner = unit ? projects.find((project) => project.units.includes(unit)) : null;
        const canonical = unit && owner ? unitPath({ ...unit, project_slug: owner.slug }) : "";
        if (canonical && `/units/${slug}` !== canonical) {
          return { statusCode: 301, headers: { ...CACHE_HEADERS, location: canonical }, body: "" };
        }
        html = renderUnit(projects, slug, "ar");
      }
      if (type === "area") {
        const guides = await fetchRest("published_editorial_articles", { select: "title,slug,language,project_id,area_name,target_type", language: `eq.${lang}`, order: "published_at.desc", limit: "200" });
        html = renderCollection(projects, "area", slug, lang, guides);
      }
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
