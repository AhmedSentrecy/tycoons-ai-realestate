"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const { renderProjectStatic, renderUnitStatic } = require("./lib/data-pages.cjs");
const { indexableUnitIds } = require("../netlify/functions/_unit-indexing.cjs");

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
  const [projects, units] = await Promise.all([
    fetchRows("projects", "id,name,slug,developer,location,description,status,min_price,down_payment_text,installments_text,delivery_text,hero_text,seo_title,seo_description,seo_keywords,targeting,article_sections,faq,highlights,image_url,gallery_urls,video_url,last_updated_at"),
    fetchRows("units", "id,project_id,project_name,developer,location,unit_type,bedrooms_text,area_sqm,starting_price,down_payment_text,installments_text,delivery_text,finishing,availability_status,description,image_url,gallery_urls,brochure_url,video_url,last_updated_at", { availability_status: "eq.available", project_id: "not.is.null" }),
  ]);
  const slugify = (value) => String(value || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\u0600-\u06ff]+/g, "-").replace(/^-+|-+$/g, "");
  // Only rows with a stored slug become pages: legacy duplicate rows without a
  // slug would otherwise collide with the canonical row via the generated slug
  // and overwrite its rich page.
  const normalizedProjects = projects
    .filter((project) => String(project.slug || "").trim())
    .map((project) => ({ ...project, slug: String(project.slug).trim() }));
  const projectById = new Map(normalizedProjects.map((project) => [project.id, project]));
  const indexableIds = indexableUnitIds(units);
  const unitsByProject = new Map();
  for (const unit of units) {
    if (!projectById.has(unit.project_id)) continue;
    const list = unitsByProject.get(unit.project_id) || [];
    list.push(unit);
    unitsByProject.set(unit.project_id, list);
  }

  let projectCount = 0;
  let unitCount = 0;
  for (const project of normalizedProjects) {
    if (!project.slug) continue;
    const projectUnits = unitsByProject.get(project.id) || [];
    await writePage(path.join("projects", `${project.slug}.html`), renderProjectStatic(shell, project, projectUnits));
    projectCount += 1;
  }
  for (const unit of units) {
    const project = projectById.get(unit.project_id);
    if (!project) continue;
    const siblings = (unitsByProject.get(unit.project_id) || []).filter((sibling) => sibling.id !== unit.id);
    await writePage(
      path.join("units", `${unit.id}.html`),
      renderUnitStatic(shell, unit, project, siblings, { indexable: indexableIds.has(String(unit.id)) }),
    );
    unitCount += 1;
  }

  const aliases = new Map([
    ["creekview--mountain-view", "mountain-view-creek-view--mountain-view"],
    ["mountain-view-creekview--mountain-view", "mountain-view-creek-view--mountain-view"],
    ["regent-s-square--al-dawlia-boutique-developments", "regent-s-square--al-dawlia-developments"],
  ]);
  for (const project of normalizedProjects) {
    const generatedSlug = `${slugify(project.name)}--${slugify(project.developer)}`;
    if (generatedSlug && generatedSlug !== project.slug) aliases.set(generatedSlug, project.slug);
  }
  const redirects = [
    "/sales-war-room/* /index.html 200!",
    ...[...aliases.entries()]
      .filter(([, canonicalSlug]) => normalizedProjects.some((project) => project.slug === canonicalSlug))
      .flatMap(([oldSlug, canonicalSlug]) => [
        `/projects/${oldSlug} /projects/${canonicalSlug} 301!`,
        `/ar/projects/${oldSlug} /projects/${canonicalSlug} 301!`,
      ]),
  ];
  await fs.writeFile(path.join(dist, "_redirects"), `${redirects.join("\n")}\n`, "utf8");

  console.log(
    `Generated ${projectCount} project pages and ${unitCount} unit pages (${indexableIds.size} indexable) plus ${redirects.length} redirect rules from Supabase and private app routing.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
