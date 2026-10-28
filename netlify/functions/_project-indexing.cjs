"use strict";

const { hasIndexableContent } = require("./_localized-project-content.cjs");

function slugify(value) {
  return String(value || "").toLowerCase().normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function projectAliases(projects, unitsByProject) {
  const slugs = new Set(projects.map((project) => project.slug));
  const aliases = new Map([
    ["creekview--mountain-view", "mountain-view-creek-view--mountain-view"],
    ["mountain-view-creekview--mountain-view", "mountain-view-creek-view--mountain-view"],
    ["regent-s-square--al-dawlia-boutique-developments", "regent-s-square--al-dawlia-developments"],
    // Oct 2026: the "New Launch" listing was merged into the main Hyde Park New Cairo page.
    ["hyde-park-new-cairo-new-launch", "hydepark-new-cairo--hydepark-developments"],
    ["hyde-park-new-cairo-new-launch--hyde-park-developments", "hydepark-new-cairo--hydepark-developments"],
  ]);
  for (const project of projects) {
    const name = slugify(project.name);
    const developer = slugify(project.developer);
    // The same developer is stored as "City Edge" on some rows and "City Edge Developments"
    // on others, so both URL spellings must lead to the one stored page.
    const developerVariants = [developer, developer.endsWith("-developments") ? developer.replace(/-developments$/, "") : `${developer}-developments`];
    for (const variant of developerVariants) {
      const generated = `${name}--${variant}`;
      if (variant && generated !== project.slug && !slugs.has(generated) && !aliases.has(generated)) aliases.set(generated, project.slug);
    }
  }
  for (const project of projects) {
    if ((unitsByProject.get(project.id) || []).length) continue;
    const sibling = projects.find((candidate) =>
      candidate.id !== project.id &&
      (unitsByProject.get(candidate.id) || []).length > 0 &&
      slugify(candidate.name) === slugify(project.name) &&
      slugify(candidate.developer) === slugify(project.developer));
    if (sibling) aliases.set(project.slug, sibling.slug);
  }
  return aliases;
}

function publishedProjectSlugs(projects, units) {
  const unitsByProject = new Map();
  for (const unit of units) {
    if (!unit.project_id) continue;
    const list = unitsByProject.get(unit.project_id) || [];
    list.push(unit);
    unitsByProject.set(unit.project_id, list);
  }
  const aliases = projectAliases(projects, unitsByProject);
  const storedSlugs = new Set(projects.map((project) => String(project.slug || "").trim()));
  return new Set(projects
    .filter((project) =>
      String(project.slug || "").trim() &&
      ((unitsByProject.get(project.id) || []).length > 0 || hasIndexableContent(project, "ar")) &&
      !(aliases.has(String(project.slug).trim()) && storedSlugs.has(aliases.get(String(project.slug).trim()))))
    .map((project) => String(project.slug).trim()));
}

module.exports = { projectAliases, publishedProjectSlugs, slugify };
