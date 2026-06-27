/**
 * Tycoons SEO Page Generator
 * --------------------------
 * Runs at Netlify build time. Pulls every unit row from Supabase,
 * groups them by project and by developer, and writes static,
 * pre-rendered HTML pages (with JSON-LD schema, meta tags, OG tags)
 * into /projects/*.html and /developers/*.html at the repo root,
 * plus sitemap.xml and robots.txt.
 *
 * Why this matters: the live site is a single page (index.html) with
 * anchor sections, so Google/Bing/AI crawlers only ever see ONE URL.
 * This script gives every project and every developer its own
 * permanent, crawlable, indexable URL — which is the single biggest
 * lever for organic search and for AI answer engines (ChatGPT,
 * Perplexity, Google AI Overviews) citing this site.
 *
 * Run locally:   node scripts/generate-pages.js
 * Run on Netlify: add as a build step in netlify.toml (see below)
 */

const fs = require("fs");
const path = require("path");

// Same publishable Supabase project already used by index.html.
// This is the anon/publishable key — safe to keep in code as long as
// Row Level Security on these tables only allows SELECT, never
// INSERT/UPDATE/DELETE, for the anon role.
const SUPABASE_URL = process.env.SUPABASE_URL || "https://coqnjymekrkoausiiytm.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "sb_publishable_6VFTijqKQB6RD7nIsSj_JQ_eEdoibGg";

const SITE_URL = process.env.SITE_URL || "https://tycoons-inv.de";
const SITE_NAME = "Tycoons Investments";

const ROOT = path.resolve(__dirname, "..");
const PROJECTS_DIR = path.join(ROOT, "projects");
const DEVELOPERS_DIR = path.join(ROOT, "developers");

// ---------- helpers ----------

function slugify(str) {
  if (!str) return "unit";
  return String(str)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "item";
}

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatPrice(value) {
  const n = Number(value);
  if (!n || Number.isNaN(n)) return null;
  return n.toLocaleString("en-US");
}

/* ------------------------------------------------------------
   IMAGE GALLERY + CAROUSEL (for the right side of project pages)
   ------------------------------------------------------------ */

// Collect all usable images for a project: its own image_url and
// gallery_urls, plus any images found on its units as a fallback.
function collectProjectImages(project, units) {
  const raw = [];

  if (project.image_url) raw.push(project.image_url);

  // gallery_urls may be a comma/newline separated string or an array
  if (project.gallery_urls) {
    if (Array.isArray(project.gallery_urls)) {
      raw.push(...project.gallery_urls);
    } else {
      raw.push(...String(project.gallery_urls).split(/[\n,]+/));
    }
  }

  // Fallback: pull images from units if the project itself has few
  (units || []).forEach((u) => {
    if (u.image_url) raw.push(u.image_url);
    if (u.gallery_urls) {
      if (Array.isArray(u.gallery_urls)) raw.push(...u.gallery_urls);
      else raw.push(...String(u.gallery_urls).split(/[\n,]+/));
    }
  });

  // Clean, trim, dedupe
  const cleaned = raw.map((x) => String(x || "").trim()).filter(Boolean);
  return Array.from(new Set(cleaned));
}

// Build the carousel HTML. If no images, returns a simple placeholder.
function buildCarousel(images, altBase) {
  if (!images.length) {
    return `<div class="pp-gallery pp-gallery-empty"><span>${escapeHtml(altBase)}</span></div>`;
  }

  const slides = images
    .map(
      (url, i) =>
        `<img class="pp-slide${i === 0 ? " active" : ""}" src="${escapeHtml(url)}" alt="${escapeHtml(altBase)} image ${i + 1}" loading="lazy" referrerpolicy="no-referrer">`
    )
    .join("");

  const dots = images
    .map(
      (_, i) =>
        `<button class="pp-dot${i === 0 ? " active" : ""}" type="button" data-pp-dot="${i}" aria-label="Show image ${i + 1}"></button>`
    )
    .join("");

  const nav =
    images.length > 1
      ? `<button class="pp-nav pp-prev" type="button" data-pp-dir="-1" aria-label="Previous image">&lsaquo;</button>
         <button class="pp-nav pp-next" type="button" data-pp-dir="1" aria-label="Next image">&rsaquo;</button>
         <div class="pp-counter">1 / ${images.length}</div>
         <div class="pp-dots">${dots}</div>`
      : "";

  return `<div class="pp-gallery" data-pp-index="0">
  <div class="pp-track">${slides}</div>
  ${nav}
</div>`;
}

// A small search box that sends the visitor to the homepage search,
// passing their query in the URL (?q=...#search). The homepage
// script.js reads ?q= on load and runs the real AI search.
function buildProjectSearchBox(prefillProject) {
  const placeholder = prefillProject
    ? `Search like &quot;${escapeHtml(prefillProject)} 3 bedrooms&quot;`
    : "Search for an apartment, villa, or chalet...";

  return `<div class="pp-search">
  <h2>Search live inventory</h2>
  <p>Type what you are looking for and the AI search will find matching units.</p>
  <form class="pp-search-form" onsubmit="event.preventDefault(); var q=this.querySelector('input').value.trim(); window.location.href='/?q='+encodeURIComponent(q)+'#search';">
    <input type="text" name="q" placeholder="${placeholder}" aria-label="Search live inventory">
    <button type="submit">AI Search</button>
  </form>
</div>`;
}

// Tiny inline script that powers the carousel arrows/dots on the page.
const CAROUSEL_SCRIPT = `<script>
(function(){
  function update(g, next){
    var slides = g.querySelectorAll('.pp-slide');
    if(!slides.length) return;
    var total = slides.length;
    var idx = ((next % total) + total) % total;
    g.dataset.ppIndex = idx;
    slides.forEach(function(s,i){ s.classList.toggle('active', i===idx); });
    g.querySelectorAll('.pp-dot').forEach(function(d,i){ d.classList.toggle('active', i===idx); });
    var c = g.querySelector('.pp-counter');
    if(c) c.textContent = (idx+1) + ' / ' + total;
  }
  document.addEventListener('click', function(e){
    var nav = e.target.closest('[data-pp-dir]');
    var dot = e.target.closest('[data-pp-dot]');
    if(!nav && !dot) return;
    var g = e.target.closest('.pp-gallery');
    if(!g) return;
    var cur = Number(g.dataset.ppIndex || 0);
    if(nav) update(g, cur + Number(nav.dataset.ppDir || 1));
    else update(g, Number(dot.dataset.ppDot || 0));
  });
})();
</script>`;

/**
 * FIX FOR DUPLICATE UNIT DESCRIPTIONS
 * ------------------------------------
 * Previously each unit card just printed the raw `description` field
 * from Supabase. If many units share the same (or empty) description
 * text in the database, Google sees identical paragraphs repeated
 * across many pages — this is the "duplicate content" SEO problem.
 *
 * This function instead builds a description out of facts that are
 * almost always unique per unit (type, bedrooms, area, price,
 * finishing, delivery, location). The original free-text description
 * (if present) is appended as a bonus, never used alone.
 */
function buildUnitDescription(project, unit) {
  const parts = [];

  const type = unit.unit_type || "Unit";
  const bedrooms = unit.bedrooms_text;
  const area = unit.area_sqm;
  const location = project.location || unit.location;
  const projectName = project.name || unit.project_name;
  const price = formatPrice(unit.starting_price);
  const delivery = unit.delivery_text;
  const finishing = unit.finishing;

  // Sentence 1: the basics — unique because area/price/type rarely repeat together
  let sentence1 = `${type}`;
  if (bedrooms) sentence1 += ` with ${bedrooms}`;
  if (area) sentence1 += ` and ${area} sqm built-up area`;
  sentence1 += ` in ${projectName}${location ? `, ${location}` : ""}.`;
  parts.push(sentence1);

  // Sentence 2: commercial details
  let sentence2 = "";
  if (price) sentence2 += `Priced from ${price} EGP`;
  if (finishing) sentence2 += `${sentence2 ? ", with" : "Comes with"} ${finishing} finishing`;
  if (delivery) sentence2 += `${sentence2 ? "," : ""} delivery ${delivery}`;
  if (sentence2) parts.push(sentence2.trim() + ".");

  return parts.join(" ");
}

async function fetchTable(table) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=*&order=last_updated_at.desc`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Supabase fetch failed for ${table}: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function fetchAllUnits() {
  return fetchTable("units");
}

async function fetchAllProjects() {
  return fetchTable("projects");
}

function groupBy(rows, key) {
  const map = new Map();
  for (const row of rows) {
    const k = row[key] || "unknown";
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(row);
  }
  return map;
}

// ---------- page shell ----------

function pageShell({ title, description, canonicalPath, ogImage, lang = "en", bodyHtml, jsonLd, breadcrumbJsonLd, extraScript = "" }) {
  const canonical = `${SITE_URL}${canonicalPath}`;
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${canonical}">
<link rel="icon" href="/assets/tycoons-icon-light.svg" type="image/svg+xml">
<link rel="stylesheet" href="/styles.css">

<meta property="og:type" content="website">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${canonical}">
${ogImage ? `<meta property="og:image" content="${escapeHtml(ogImage)}">` : ""}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
${ogImage ? `<meta name="twitter:image" content="${escapeHtml(ogImage)}">` : ""}

<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
${breadcrumbJsonLd ? `<script type="application/ld+json">${JSON.stringify(breadcrumbJsonLd)}</script>` : ""}
</head>
<body>
<div class="site-bg"></div>
<header class="site-header">
  <a class="brand" href="/" aria-label="${SITE_NAME} home">
    <img class="brand-logo" src="/assets/tycoons-logo-header.svg" alt="${SITE_NAME}">
  </a>
  <nav class="main-nav" aria-label="Main navigation">
    <a href="/#search">AI Search</a>
    <a href="/#voice">Voice Agent</a>
    <a href="/#projects">Projects</a>
    <a href="/#lead">Contact</a>
  </nav>
</header>
<main>
${bodyHtml}
</main>
<footer class="site-footer">
  <span>&copy; <span id="year"></span> ${SITE_NAME}</span>
  <span>AI real estate search &middot; Voice assistant &middot; Live inventory</span>
</footer>
<script>document.getElementById("year").textContent = new Date().getFullYear();</script>
${extraScript}
</body>
</html>`;
}

// ---------- project page ----------

function buildProjectPage(project, units) {
  const projectName = project.name || "Project";
  const developer = project.developer || "";
  const location = project.location || "";
  const slug = slugify(`${projectName}-${location}`);
  const url = `/projects/${slug}.html`;

  // Prefer the project table's own min_price; fall back to cheapest unit if missing.
  let minPrice = Number(project.min_price);
  if (!minPrice || Number.isNaN(minPrice)) {
    const unitPrices = units.map((u) => Number(u.starting_price)).filter((n) => !Number.isNaN(n) && n > 0);
    minPrice = unitPrices.length ? Math.min(...unitPrices) : null;
  }

  const title = `${projectName} by ${developer} in ${location} | Prices & Units | ${SITE_NAME}`;
  const description = `${projectName} by ${developer} in ${location}. ${
    minPrice ? `Starting from ${formatPrice(minPrice)} EGP.` : ""
  } Unit types, payment plans, and delivery dates — updated live.`;

  const unitCards = units
    .map((u) => {
      const price = formatPrice(u.starting_price);
      return `<article class="unit-detail-card" itemscope itemtype="https://schema.org/Apartment">
  <h3 itemprop="name">${escapeHtml(u.unit_type)} &mdash; ${escapeHtml(u.bedrooms_text)}</h3>
  <p class="unit-meta">${escapeHtml(u.area_sqm)} sqm &middot; ${escapeHtml(u.finishing)} &middot; ${escapeHtml(u.availability_status)}</p>
  ${price ? `<p class="unit-price">Starting from <strong>${price} EGP</strong></p>` : ""}
  <p class="unit-terms">${escapeHtml(u.down_payment_text)} &middot; ${escapeHtml(u.installments_text)}</p>
  <p class="unit-delivery">${escapeHtml(u.delivery_text)}</p>
  <p class="unit-desc">${escapeHtml(buildUnitDescription(project, u))}</p>
  ${u.brochure_url ? `<a class="ghost" href="${escapeHtml(u.brochure_url)}" target="_blank" rel="noopener">Download Brochure</a>` : ""}
</article>`;
    })
    .join("\n");

  const faqItems = [
    {
      q: `What is the starting price for units in ${projectName}?`,
      a: minPrice
        ? `${projectName} by ${developer} starts from ${formatPrice(minPrice)} EGP, depending on unit type and area.`
        : `Pricing for ${projectName} varies by unit type. Contact us for current availability.`,
    },
    {
      q: `What payment plans are available in ${projectName}?`,
      a: project.down_payment_text
        ? `Typical terms include ${project.down_payment_text} with ${project.installments_text}.`
        : `Payment plans vary by unit. Contact our team for current options.`,
    },
    {
      q: `When is ${projectName} delivered?`,
      a: project.delivery_text || `Delivery dates vary by unit type. Contact us for the latest schedule.`,
    },
  ];

  const faqHtml = faqItems
    .map(
      (f, i) => `<details class="faq-item"${i === 0 ? " open" : ""}>
  <summary>${escapeHtml(f.q)}</summary>
  <p>${escapeHtml(f.a)}</p>
</details>`
    )
    .join("\n");

  const galleryImages = collectProjectImages(project, units);
  const carouselHtml = buildCarousel(galleryImages, projectName);
  const searchBoxHtml = buildProjectSearchBox(projectName);

  const bodyHtml = `
<section class="section">
  <nav aria-label="Breadcrumb" class="breadcrumb">
    <a href="/">Home</a> &rsaquo;
    <a href="/developers/${slugify(developer)}.html">${escapeHtml(developer)}</a> &rsaquo;
    <span>${escapeHtml(projectName)}</span>
  </nav>

  <div class="pp-hero">
    <div class="pp-hero-text">
      <span class="eyebrow">${escapeHtml(developer)}</span>
      <h1>${escapeHtml(projectName)}</h1>
      <p class="location-line">${escapeHtml(location)}</p>
      ${minPrice ? `<p class="hero-quote">Starting from ${formatPrice(minPrice)} EGP</p>` : ""}
      ${project.description ? `<p>${escapeHtml(project.description)}</p>` : ""}
      ${project.brochure_url ? `<a class="ghost" href="${escapeHtml(project.brochure_url)}" target="_blank" rel="noopener">Project Brochure</a>` : ""}
      <a class="btn" href="/#search">Ask the AI Search about ${escapeHtml(projectName)}</a>
    </div>
    <div class="pp-hero-media">
      ${carouselHtml}
      ${searchBoxHtml}
    </div>
  </div>
</section>

<section class="section">
  <h2>Available Units${units.length ? ` (${units.length})` : ""}</h2>
  <div class="grid">
${unitCards || "<p>No live units listed for this project right now. Contact us for availability.</p>"}
  </div>
</section>

<section class="section">
  <h2>Frequently Asked Questions</h2>
${faqHtml}
</section>
`;

  const offers = units
    .filter((u) => Number(u.starting_price) > 0)
    .map((u) => ({
      "@type": "Offer",
      name: `${u.unit_type} - ${u.bedrooms_text}`,
      price: Number(u.starting_price),
      priceCurrency: "EGP",
      availability:
        u.availability_status === "available"
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      itemOffered: {
        "@type": "Apartment",
        name: u.unit_type,
        floorSize: { "@type": "QuantitativeValue", value: u.area_sqm, unitCode: "MTK" },
      },
    }));

  // If there are no individual units yet, still expose the project-level price as a single offer
  // so schema/AI engines have at least one concrete price point to cite.
  if (!offers.length && minPrice) {
    offers.push({
      "@type": "Offer",
      name: projectName,
      price: minPrice,
      priceCurrency: "EGP",
      availability: "https://schema.org/InStock",
    });
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ApartmentComplex",
    name: projectName,
    description: project.description,
    address: { "@type": "PostalAddress", addressLocality: location, addressCountry: "EG" },
    developer: { "@type": "Organization", name: developer },
    image: project.image_url || undefined,
    url: `${SITE_URL}${url}`,
    offers: offers.length ? offers : undefined,
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: developer,
        item: `${SITE_URL}/developers/${slugify(developer)}.html`,
      },
      { "@type": "ListItem", position: 3, name: projectName, item: `${SITE_URL}${url}` },
    ],
  };

  const html = pageShell({
    title,
    description,
    canonicalPath: url,
    ogImage: project.image_url,
    bodyHtml,
    jsonLd: [jsonLd, faqJsonLd],
    breadcrumbJsonLd,
    extraScript: CAROUSEL_SCRIPT,
  });

  return { url, html, lastmod: project.last_updated_at };
}

// ---------- developer page ----------

function buildDeveloperPage(developer, units) {
  const slug = slugify(developer);
  const url = `/developers/${slug}.html`;
  const projectsMap = groupBy(units, "project_id");

  const title = `${developer} Projects in Egypt — Prices, Units & Payment Plans | ${SITE_NAME}`;
  const description = `Browse all current ${developer} projects and unit availability in Egypt. Live prices, payment plans, and delivery dates updated automatically.`;

  const projectCards = [...projectsMap.entries()]
    .map(([pid, rows]) => {
      const p = rows[0];
      const pSlug = slugify(`${p.project_name}-${p.location}`);
      const prices = rows.map((r) => Number(r.starting_price)).filter((n) => !Number.isNaN(n) && n > 0);
      const minPrice = prices.length ? Math.min(...prices) : null;
      return `<a class="unit-detail-card" href="/projects/${pSlug}.html">
  <h3>${escapeHtml(p.project_name)}</h3>
  <p class="unit-meta">${escapeHtml(p.location)}</p>
  ${minPrice ? `<p class="unit-price">From ${formatPrice(minPrice)} EGP</p>` : ""}
</a>`;
    })
    .join("\n");

  const bodyHtml = `
<section class="section">
  <nav aria-label="Breadcrumb" class="breadcrumb">
    <a href="/">Home</a> &rsaquo; <span>${escapeHtml(developer)}</span>
  </nav>
  <span class="eyebrow">Developer</span>
  <h1>${escapeHtml(developer)}</h1>
  <p>All current projects and live unit availability for ${escapeHtml(developer)} in Egypt.</p>
</section>
<section class="section">
  <h2>Projects</h2>
  <div class="grid">
${projectCards}
  </div>
</section>
`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: developer,
    url: `${SITE_URL}${url}`,
  };

  const html = pageShell({
    title,
    description,
    canonicalPath: url,
    bodyHtml,
    jsonLd,
  });

  return { url, html };
}

// ---------- main ----------

async function main() {
  console.log("Fetching projects and units from Supabase...");
  const [projects, units] = await Promise.all([fetchAllProjects(), fetchAllUnits()]);
  console.log(`Fetched ${projects.length} project rows, ${units.length} unit rows.`);

  fs.mkdirSync(PROJECTS_DIR, { recursive: true });
  fs.mkdirSync(DEVELOPERS_DIR, { recursive: true });

  const unitsByProject = groupBy(units, "project_id");
  const byDeveloper = groupBy(units, "developer");

  const sitemapUrls = [{ loc: `${SITE_URL}/`, priority: "1.0" }];

  for (const project of projects) {
    const rows = unitsByProject.get(project.id) || [];
    const { url, html, lastmod } = buildProjectPage(project, rows);
    const filePath = path.join(ROOT, url.slice(1));
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, html, "utf8");
    sitemapUrls.push({ loc: `${SITE_URL}${url}`, lastmod, priority: "0.8" });
  }
  console.log(`Wrote ${projects.length} project pages.`);

  for (const [developer, rows] of byDeveloper) {
    const { url, html } = buildDeveloperPage(developer, rows);
    const filePath = path.join(ROOT, url.slice(1));
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, html, "utf8");
    sitemapUrls.push({ loc: `${SITE_URL}${url}`, priority: "0.7" });
  }
  console.log(`Wrote ${byDeveloper.size} developer pages.`);

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    ${u.lastmod ? `<lastmod>${new Date(u.lastmod).toISOString().slice(0, 10)}</lastmod>` : ""}
    <priority>${u.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;
  fs.writeFileSync(path.join(ROOT, "sitemap.xml"), sitemapXml, "utf8");
  console.log("Wrote sitemap.xml");

  const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;
  fs.writeFileSync(path.join(ROOT, "robots.txt"), robotsTxt, "utf8");
  console.log("Wrote robots.txt");

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
