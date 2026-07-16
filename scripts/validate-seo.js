"use strict";

const fs = require("fs");
const path = require("path");
const {
  groupProjects,
  renderProjectPage,
  renderCollectionPage,
  renderDirectoryPage,
} = require("../netlify/functions/_seo-utils");

const root = path.resolve(__dirname, "..");
const rows = [
  {
    project_name: "Yellow Residence",
    developer: "Urbnlanes Development",
    location: "New Cairo",
    unit_type: "Apartment",
    bedrooms_text: "1 Bedroom",
    area_sqm: 83,
    starting_price: 6329306,
    down_payment_text: "5%",
    installments_text: "8 years",
    delivery_text: "2028-01-31",
    availability_status: "available",
    last_updated_at: "2026-07-14T10:00:00Z",
    image_url: "https://example.com/yellow-residence.jpg",
  },
  {
    project_name: "Yellow Residence",
    developer: "Urbnlanes Development",
    location: "New Cairo",
    unit_type: "Apartment",
    bedrooms_text: "2 Bedrooms",
    area_sqm: 120,
    starting_price: 8100000,
    down_payment_text: "5%",
    installments_text: "8 years",
    delivery_text: "2028-01-31",
    availability_status: "confirmed",
    last_updated_at: "2026-07-15T10:00:00Z",
  },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const projects = groupProjects(rows);
const slug = projects[0].slug;
const ar = renderProjectPage(projects, slug, "ar");
const en = renderProjectPage(projects, slug, "en");
const area = renderCollectionPage(projects, "area", "new-cairo", "ar");
const directory = renderDirectoryPage(projects, "en");

assert(ar.includes('<html lang="ar" dir="rtl">'), "Arabic page language or direction is missing");
assert(en.includes('<html lang="en" dir="ltr">'), "English page language or direction is missing");
assert(ar.includes('type="application/ld+json"'), "Project JSON-LD is missing");
assert(ar.includes('rel="canonical"'), "Project canonical is missing");
assert(en.includes('hreflang="ar-EG"'), "Arabic alternate is missing");
assert(area && area.includes("CollectionPage"), "Area collection page failed to render");
assert(directory.includes("Updated Egypt real estate project directory"), "English directory failed to render");

const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const robots = fs.readFileSync(path.join(root, "robots.txt"), "utf8");
const netlify = fs.readFileSync(path.join(root, "netlify.toml"), "utf8");
assert(index.includes('id="seo-fallback"'), "Crawlable homepage fallback is missing");
assert(index.includes('name="description"'), "Homepage description is missing");
assert(robots.includes("OAI-SearchBot"), "OAI-SearchBot rule is missing");
assert(robots.includes("Sitemap: https://tycoons-inv.de/sitemap.xml"), "Sitemap declaration is missing");
assert(netlify.includes('from = "/ar/projects/*"'), "Arabic project route is missing");
assert(netlify.includes('from = "/en/projects/*"'), "English project route is missing");

console.log(`SEO foundation validation passed for ${slug}`);

