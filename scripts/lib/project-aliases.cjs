"use strict";

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
  ]);
  for (const project of projects) {
    const generated = `${slugify(project.name)}--${slugify(project.developer)}`;
    // A stored URL always takes priority over an automatically generated alias.
    if (generated !== project.slug && !slugs.has(generated)) aliases.set(generated, project.slug);
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

module.exports = { projectAliases };
