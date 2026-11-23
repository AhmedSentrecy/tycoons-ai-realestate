"use strict";

// /ar/reports/new-cairo-prices-2026 (Nov 2026): the dated New Cairo price report.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const u = require("../netlify/functions/_seo-utils.cjs");
const { PRICE_REPORTS } = require("../netlify/functions/_price-reports.cjs");

let checks = 0;
const check = (ok, message) => { assert.ok(ok, message); checks += 1; };

const report = PRICE_REPORTS["new-cairo-prices-2026"];
check(report, "report data exists");

// Data stays consistent with the reviewed PDF.
const sum = (rows) => rows.reduce((total, row) => total + row[1], 0);
check(sum(report.downPayment) === report.totals.projects, "down payment rows add up to all projects");
check(sum(report.years) === report.totals.projects, "installment rows add up to all projects");
check(sum(report.delivery) === report.totals.projects, "delivery rows add up to all projects");
check(report.types.reduce((total, row) => total + row[1], 0) === report.totals.listings, "type rows add up to all listings");
check(report.projects.length === report.types[0][2], "one table row per project with apartments");
check(report.projects.reduce((total, row) => total + row[3], 0) === report.types[0][1], "project listings add up to apartment listings");
const ppms = report.projects.map((row) => row[4]);
check(ppms.every((value, index) => index === 0 || value >= ppms[index - 1]), "projects are sorted from cheapest to most expensive");
check(new Set(report.projects.map((row) => row[1])).size === report.projects.length, "no project appears twice");
check(!report.projects.some((row) => report.excludedShorouk.includes(row[0])), "El Shorouk projects stay out");
check(!report.projects.some((row) => /branded/i.test(row[0])), "branded residences stay out of the main table");
check(fs.existsSync(path.join(__dirname, "..", "public", report.pdf)), "the PDF is in public/");

// Rendered page.
const html = u.renderPriceReport("new-cairo-prices-2026", "ar");
check(html, "page renders");
check(u.renderPriceReport("new-cairo-prices-2026", "en").includes("Historical New Cairo"), "English archive");
check(u.renderPriceReport("unknown", "ar") === null, "unknown report is a 404");
const text = html.replace(/<script[^]*?<\/script>|<style[^]*?<\/style>/g, "").replace(/<[^>]+>/g, " ");
check(/<title>دليل أسعار الشقق في التجمع الخامس 2026/.test(html), "title starts with the target search");
check(html.includes('<link rel="canonical" href="https://tycoons-inv.com/ar/reports/new-cairo-prices-2026">'), "canonical");
check(text.includes("81,818"), "headline price per m²");
check(html.includes('href="/reports/new-cairo-prices-2026.pdf" download'), "PDF download link");
for (const row of report.projects) check(html.includes(`href="/projects/${row[1]}"`), `links to ${row[0]}`);
check(text.includes("مش عن كل السوق"), "the inventory note is shown");

// No external website anywhere except the shared WhatsApp button.
const links = [...html.matchAll(/<a [^>]*href="(https?:[^"]+)"/g)].map((match) => match[1]);
check(links.every((link) => link.startsWith("https://tycoons-inv.com") || link.startsWith("https://wa.me/")), "no external links");

// Structured data.
const schemas = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((match) => JSON.parse(match[1]));
const types = schemas.flatMap((schema) => [].concat(schema["@type"]));
check(types.includes("Report") && types.includes("Dataset") && types.includes("BreadcrumbList"), "Report, Dataset and breadcrumb schema");
check(types.filter((type) => type === "FAQPage").length === 1, "one FAQPage");
const dataset = schemas.find((schema) => schema["@type"] === "Dataset");
check(dataset.description.length >= 50, "Dataset description is long enough for Google");
check(dataset.distribution[0].contentUrl === "https://tycoons-inv.com/reports/new-cairo-prices-2026.pdf", "Dataset points to the PDF");

// Routing, sitemap and the link from the apartments page.
const toml = fs.readFileSync(path.join(__dirname, "..", "netlify.toml"), "utf8");
check(toml.includes('from = "/ar/reports/*"'), "netlify route");
const sitemap = fs.readFileSync(path.join(__dirname, "..", "netlify", "functions", "sitemap.cjs"), "utf8");
check(sitemap.includes("/ar/reports/${report.slug}"), "sitemap lists reports");
const utils = fs.readFileSync(path.join(__dirname, "..", "netlify", "functions", "_seo-utils.cjs"), "utf8");
check(utils.includes('<a href="/ar/reports/new-cairo-prices-2026">'), "apartments page links to the report");

console.log(`price report: ${checks} checks passed`);
