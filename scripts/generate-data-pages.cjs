"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const { renderProjectStatic, renderUnitStatic, pageShell } = require("./lib/data-pages.cjs");
const { editorialArticleView, fetchDevelopers, projectLogo } = require("../netlify/functions/_seo-utils.cjs");
const { projectAliases } = require("./lib/project-aliases.cjs");
const { indexableUnitIds } = require("../netlify/functions/_unit-indexing.cjs");
const { unitPath } = require("../netlify/functions/_unit-url.cjs");
const { projectsFromUnits } = require("../src/lib/projectFaq.ts");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");
const SUPABASE_URL = process.env.SUPABASE_URL || "https://coqnjymekrkoausiiytm.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "sb_publishable_6VFTijqKQB6RD7nIsSj_JQ_eEdoibGg";

async function fetchRows(table, columns, filters = {}) {
  const all = [];
  for (let offset = 0; offset < 5000; offset += 1000) {
    const params = new URLSearchParams({ select: columns, limit: "1000", offset: String(offset), ...filters });
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
      headers: { apikey: SUPABASE_KEY, Accept: "application/json" },
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error(`${table} ${response.status}: ${await response.text()}`);
    const rows = await response.json();
    if (!Array.isArray(rows)) throw new Error(`${table} returned a non-array response`);
    all.push(...rows);
    if (rows.length < 1000) break;
  }
  return all;
}

async function writePage(relativePath, html) {
  const filePath = path.join(dist, relativePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, html, "utf8");
}

async function main() {
  const shell = await fs.readFile(path.join(dist, "index.html"), "utf8");
  await writePage("en/index.html", require("./lib/english-home.cjs")(shell));
  const [projects, units] = await Promise.all([
    fetchRows("projects", "id,name,slug,developer,location,description,status,min_price,down_payment_text,installments_text,delivery_text,hero_text,seo_title,seo_description,seo_keywords,targeting,article_sections,faq,highlights,image_url,gallery_urls,video_url,last_updated_at,logo_path,logo_on_dark"),
    fetchRows("units", "id,project_id,project_name,developer,location,unit_type,bedrooms_text,area_sqm,starting_price,down_payment_text,installments_text,delivery_text,finishing,availability_status,description,image_url,gallery_urls,brochure_url,video_url,created_at,last_updated_at", { availability_status: "eq.available", project_id: "not.is.null" }),
    fetchDevelopers(),
  ]);
  // Only rows with a stored slug become pages: legacy duplicate rows without a
  // slug would otherwise collide with the canonical row via the generated slug
  // and overwrite its rich page.
  const normalizedProjects = projects
    .filter((project) => String(project.slug || "").trim())
    .map((project) => ({ ...project, slug: String(project.slug).trim() }))
    // Developer logo (Supabase brand-logos) on every project; pages render without it.
    .map((project) => ({ ...project, logo: projectLogo(project) }));
  const projectById = new Map(normalizedProjects.map((project) => [project.id, project]));
  const indexableIds = indexableUnitIds(units);
  const unitsByProject = new Map();
  for (const unit of units) {
    if (!projectById.has(unit.project_id)) continue;
    const list = unitsByProject.get(unit.project_id) || [];
    list.push(unit);
    unitsByProject.set(unit.project_id, list);
  }

  // Published guides: built as pages on the site's own shell so visitors get the full
  // site (header, footer, contact) and crawlers get the article HTML at the same URL.
  let guides = [];
  try {
    guides = await fetchRows("published_editorial_articles", "*");
  } catch (error) {
    console.warn(`Guides skipped: ${error.message}`);
  }
  const guidesByProject = new Map();
  for (const guide of guides) {
    if (!guide.project_id) continue;
    const list = guidesByProject.get(guide.project_id) || [];
    list.push(guide);
    guidesByProject.set(guide.project_id, list);
  }
  for (const list of guidesByProject.values()) list.sort((a, b) => String(b.published_at).localeCompare(String(a.published_at)));
  // Units that still have a page (sold or removed units drop out of `units`).
  const liveUnitIds = units.length ? new Set(units.map((unit) => String(unit.id))) : null;
  let guideCount = 0;
  for (const guide of guides) {
    if (!/^[a-z0-9-]+$/.test(String(guide.slug || ""))) continue;
    const project = guide.project_id ? projectById.get(guide.project_id) : null;
    const related = (guidesByProject.get(guide.project_id) || []).filter((item) => item.language === guide.language);
    const translation = guide.translation_key ? guides.find((item) =>
      item.slug && item.translation_key === guide.translation_key && item.language !== guide.language && item.published_at && item.reviewed_at) : null;
    const view = editorialArticleView({ status: "published", ...guide }, translation ? { ...translation, status: "published" } : null, { project, related, liveUnitIds });
    if (!view) continue;
    const canonical = `https://tycoons-inv.com${view.canonicalPath || view.path}`;
    const html = pageShell(shell, {
      title: view.title, description: view.description, canonical, image: view.image, keywords: guide.focus_keyword ? [guide.focus_keyword] : [],
      lang: view.lang, alternates: view.alternatePath ? [{ hreflang: view.lang === "en" ? "ar-EG" : "en", href: `https://tycoons-inv.com${view.alternatePath}` }] : [],
      body: view.body, schemas: view.schemas.map(({ "@context": _context, ...schema }) => schema),
    });
    await writePage(path.join(guide.language === "en" ? "en/guides" : "guides", guide.slug, "index.html"), html);
    guideCount += 1;
  }

  // Other public projects (with units) for the "nearby" and "same developer" answers.
  const faqContext = {
    // Units that still have a page: guide links to any other unit render as plain text (SEO-05).
    liveUnitIds,
    otherProjects: projectsFromUnits(units.filter((unit) => projectById.has(unit.project_id))),
    // Every public project with units, so a page can link the projects it mentions and
    // show "projects near …" (internal links between project pages).
    projectLinks: normalizedProjects
      .filter((item) => (unitsByProject.get(item.id) || []).length)
      .map((item) => {
        const list = unitsByProject.get(item.id) || [];
        const prices = list.map((unit) => Number(unit.starting_price)).filter((value) => value > 0);
        return {
          id: item.id, name: String(item.name || "").trim(), slug: item.slug, developer: String(item.developer || "").trim(),
          location: String(item.location || list[0]?.location || "").trim(),
          minPrice: prices.length ? Math.min(...prices) : 0,
          image: String(item.image_url || "").split(",")[0].trim(),
        };
      })
      .filter((item) => item.name && item.slug),
  };
  let projectCount = 0;
  let unitCount = 0;
  for (const project of normalizedProjects) {
    if (!project.slug) continue;
    const projectUnits = unitsByProject.get(project.id) || [];
    const projectGuides = (guidesByProject.get(project.id) || []).filter((guide) => guide.language === "ar");
    await writePage(path.join("projects", `${project.slug}.html`), renderProjectStatic(shell, project, projectUnits, projectGuides, faqContext));
    projectCount += 1;
  }
  for (const unit of units) {
    const project = projectById.get(unit.project_id);
    if (!project) continue;
    const siblings = (unitsByProject.get(unit.project_id) || []).filter((sibling) => sibling.id !== unit.id);
    await writePage(
      path.join("units", `${unitPath({ ...unit, project_slug: project.slug }).replace(/^\/units\//, "")}.html`),
      renderUnitStatic(shell, unit, project, siblings, { indexable: indexableIds.has(String(unit.id)) }),
    );
    unitCount += 1;
  }

  const aliases = projectAliases(normalizedProjects, unitsByProject);
  const redirects = [
    "/sales-war-room/* /index.html 200!",
    "/admin /index.html 200!",
    "/admin/* /index.html 200!",
    ...[...aliases.entries()]
      .filter(([, canonicalSlug]) => normalizedProjects.some((project) => project.slug === canonicalSlug))
      .flatMap(([oldSlug, canonicalSlug]) => [
        `/projects/${oldSlug} /projects/${canonicalSlug} 301!`,
        `/ar/projects/${oldSlug} /projects/${canonicalSlug} 301!`,
        `/en/projects/${oldSlug} /en/projects/${canonicalSlug} 301!`,
      ]),
  ];
  await fs.writeFile(path.join(dist, "_redirects"), `${redirects.join("\n")}\n`, "utf8");

  console.log(
    `Generated ${guideCount} guide pages, ${projectCount} project pages and ${unitCount} unit pages (${indexableIds.size} indexable) plus ${redirects.length} redirect rules from Supabase and private app routing.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
