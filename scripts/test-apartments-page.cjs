"use strict";

// /ar/areas/new-cairo/apartments-for-sale and the New Cairo area page fixes (Nov 2026), on fixture units.
const u = require("../netlify/functions/_seo-utils.cjs");
const P = (id, name, slug, developer, location) => ({ id, name, slug, developer, location, image_url: "https://example.com/a.jpg" });
const projects = [
  P("p1","Mountain View Creek View","mountain-view-creek-view--mountain-view","Mountain View","New Cairo"),
  P("p2","Solay","solay--living-yards","Living Yards Developments","Golden Square, New Cairo"),
  P("p3","Crescent Walk","crescent-walk--marakez","Marakez","6th settlement, New Cairo"),
  P("p4","One Hyde Park","one-hyde-park--hyde-park","Hyde Park Developments","New Cairo"),
  P("p5","Palm Hills New Cairo","palm-hills-new-cairo--palm-hills","Palm Hills Developments","Fifth Settlement, New Cairo"),
  P("p6","Mountain View iCity New Cairo","mv-icity--mountain-view","Mountain View","Fifth Settlement, New Cairo"),
  P("p7","Monark Residence","monark--royal","Royal Development","Mostakbal City, New Cairo"),
];
let n=0;
const U = (project_id, unit_type, bedrooms_text, area_sqm, starting_price, down, inst, delivery) => ({ id:`00000000-0000-4000-8000-${String(++n).padStart(12,"0")}`, project_id, project_name: projects.find(p=>p.id===project_id).name, developer: projects.find(p=>p.id===project_id).developer, location: projects.find(p=>p.id===project_id).location, unit_type, bedrooms_text, area_sqm, starting_price, down_payment_text: down, installments_text: inst, delivery_text: delivery, availability_status:"available", last_updated_at:"2026-10-27T11:17:00Z", created_at:"2026-08-01T00:00:00Z" });
const units = [
  U("p1","Creek View - Millennial","3 bedrooms",135,10647045,"5% down payment","Installments over 8 years","4 years"),
  U("p1","Creek View - Apartment","1 bedrooms",70,6791706,"5% down payment","Installments over 8 years","4 years"),
  U("p1","Creek View - Typical Apartment","3 bedrooms",155,14070913,"5% down payment","Installments over 8 years","4 years"),
  U("p2","Apartment","1 Bedrooms",68,3300000,"5%","8 years","2030-01-31"),
  U("p2","Townhouse",null,255,14800000,"5%","10 years","3 Years"),
  U("p3","Garden Apartment","1.0",84,9490000,"5% Down Payment","8 Years","2 Years"),
  U("p3","Apartment","1 Bedrooms",83,9304751,"5%","10 years","2029-01-30"),
  U("p4","Apartment","2 Bedrooms",135,9190000,"5%","5% after 3 months + 10 years equal installments",null),
  U("p4","Duplex","3 Bedrooms",203,17030000,"5%","8 years","3 years"),
  U("p5","CLEO 2B Garden","2 bedrooms",114,18922000,null,null,"2030-06-30"),
  U("p5","Apartment","3 Bedrooms + Nanny",173.5,23791000,"3%","10 Years","2030-06-30"),
  U("p6","iCity - Apartment","2 bedrooms",120,11800000,"3% down payment","Installments over 12 years","Ready to Move"),
  U("p5","Offices",null,123,25694000,"5%","8 Years","2029"),
  U("p7","Apartment","1 Bedrooms",63,4120000,"5%","Up to 12 years","2030-06-25"),
];
const grouped = u.groupProjects(units, projects);
const assert = require("node:assert/strict");
const html = u.renderApartments(grouped, "new-cairo", "ar");
const text = html.replace(/<script[^]*?<\/script>|<style[^]*?<\/style>/g, "").replace(/<[^>]+>/g, " ");
const schemas = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
let checks = 0;
const check = (ok, message) => { assert.ok(ok, message); checks += 1; };
check(/<title>شقق للبيع في التجمع الخامس 2026/.test(html), "title starts with the target keyword");
check(html.includes("<h1>شقق للبيع في التجمع الخامس والقاهرة الجديدة</h1>"), "H1 has the keyword");
check(html.includes('<link rel="canonical" href="https://tycoons-inv.com/ar/areas/new-cairo/apartments-for-sale">'), "self canonical");
check(schemas.some((s) => s["@type"] === "FAQPage" && s.mainEntity.length >= 8), "FAQPage with the written questions");
check(schemas.some((s) => s["@type"] === "CollectionPage" && s.dateModified), "CollectionPage has dateModified");
check(schemas.some((s) => s["@type"] === "BreadcrumbList" && s.itemListElement[1].item.endsWith("/ar/areas/new-cairo")), "breadcrumb goes through the area page");
check(!text.includes("Monark"), "Mostakbal City units stay out of the New Cairo page");
check(!/Townhouse|Duplex|Offices/.test(text), "only apartments are listed");
check((html.match(/class="pcard"/g) || []).length === 10, "every apartment is a card");
check(html.includes('href="/ar/areas/new-cairo"'), "links back to the area guide");
check(html.includes("آخر تحديث للأسعار"), "visible last-updated date");
check(!/\d+ (شقة|مشروع)[^ا]/.test(text.replace(/\d{2,} شقة/g, "")), "Arabic counted nouns (no '4 شقة')");
check(!/propertyfinder|bayut|aqarmap|dubizzle|nawy/i.test(html), "no other real-estate website in the page");
check(u.renderApartments(grouped, "new-cairo", "en").includes("Average price per m²"), "English counterpart");
check(u.renderApartments(grouped, "north-coast", "ar") === null, "areas without a written guide 404");
check(u.renderApartments(u.groupProjects(units.slice(0, 3), projects), "new-cairo", "ar") === null, "fewer than 5 apartments 404s");
const area = u.renderCollection(grouped, "area", "new-cairo", "ar", []);
check(area.includes("<h1>مشاريع التجمع الخامس والقاهرة الجديدة 2026</h1>"), "area page H1 has the keyword");
check(area.includes('href="/ar/areas/new-cairo/apartments-for-sale"'), "area page links to the apartments page");
check(/آخر تحديث للأسعار: <time datetime="2026-10-27">/.test(area), "area page shows the last price update");
check(u.isApartmentUnit({ unit_type: "Creek View - Millennial" }) && u.isApartmentUnit({ unit_type: "CLEO 2B Garden" }) && u.isApartmentUnit({ unit_type: "Penthouse Open Roof" }), "apartment types recognised");
check(!u.isApartmentUnit({ unit_type: "I Villa Garden" }) && !u.isApartmentUnit({ unit_type: "Clinic" }) && !u.isApartmentUnit({ unit_type: "Garden Town House Middle" }), "villas, townhouses and clinics excluded");
// Internal links to the apartments page (Nov 2026).
check(u.apartmentsPageLinkAr("new-cairo") === '<a href="/ar/areas/new-cairo/apartments-for-sale">شقق للبيع في التجمع الخامس</a>', "link helper uses the target keyword as anchor");
check(u.apartmentsPageLinkAr("sheikh-zayed") === "", "no link for areas without an apartments page");
check(/<a class="more" href="\/ar\/areas\/new-cairo\/apartments-for-sale">شقق للبيع في التجمع الخامس ←<\/a>/.test(area), "area page project grid links to the apartments page");
const { renderProjectStatic, renderUnitStatic } = require("./lib/data-pages.cjs");
const shell = `<!doctype html><html lang="ar" dir="rtl"><head><title>x</title><meta name="description" content="x"><link rel="canonical" href="https://tycoons-inv.com/"></head><body><div id="root"></div></body></html>`;
const sProject = { id: "p1", name: "Creek", slug: "creek--mv", developer: "Mountain View", location: "New Cairo", status: "available", image_url: "https://example.com/a.jpg", gallery_urls: "", last_updated_at: "2026-11-01T00:00:00Z" };
const sApt = { id: "11111111-1111-4111-8111-111111111111", project_id: "p1", project_name: "Creek", developer: "Mountain View", location: "New Cairo", unit_type: "Apartment", bedrooms_text: "2 Bedrooms", area_sqm: 120, starting_price: 9000000, availability_status: "available", description: "A complete unit description with enough detail for a useful standalone search result page.", installments_text: "8 years", delivery_text: "3 years", image_url: "https://example.com/u.jpg", gallery_urls: "", last_updated_at: "2026-11-01T00:00:00Z" };
const sVilla = { ...sApt, id: "22222222-2222-4222-8222-222222222222", unit_type: "Standalone Villa", bedrooms_text: "4 Bedrooms", area_sqm: 300, starting_price: 30000000 };
check(renderProjectStatic(shell, sProject, [sApt]).includes('href="/ar/areas/new-cairo/apartments-for-sale">قارن بكل شقق للبيع في التجمع الخامس'), "project page with apartments links to the apartments page");
check(!renderProjectStatic(shell, sProject, [sVilla]).includes("apartments-for-sale"), "villa-only project page has no apartments link");
const aptUnitHtml = renderUnitStatic(shell, sApt, sProject, []);
check(aptUnitHtml.includes('<a href="/ar/areas/new-cairo/apartments-for-sale">شقق للبيع في التجمع الخامس</a>'), "apartment unit breadcrumb goes through the apartments page");
const crumbSchema = [...aptUnitHtml.matchAll(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)].map((m) => JSON.parse(m[1])).flatMap((x) => x["@graph"] || [x]).find((x) => x["@type"] === "BreadcrumbList");
check(crumbSchema && crumbSchema.itemListElement[2].item.endsWith("/ar/areas/new-cairo/apartments-for-sale") && crumbSchema.itemListElement.every((item, i) => item.position === i + 1), "unit BreadcrumbList includes the apartments page with positions 1..n");
check(!renderUnitStatic(shell, sVilla, sProject, []).includes("apartments-for-sale"), "villa unit breadcrumb unchanged");
console.log(`Apartments page validation passed (${checks} checks).`);

// Arithmetic, eligibility and crawlable list navigation exercise the actual renderer.
const { publicUnit, mean, uniqueUnits, unitInquiry } = require("../netlify/functions/_inventory-facts.cjs");
assert.equal(mean([50000, 60000, 100000]), 70000);
const fixture = Array.from({ length: 74 }, (_, i) => ({
  ...units[0], id: "00000000-0000-4000-8000-" + String(i + 100).padStart(12, "0"),
  starting_price: (50000 + i) * 100, area_sqm: 100, installments_text: "8 years",
  down_payment_text: "5%", delivery_text: i % 2 ? "Ready to move" : "2029",
}));
assert.equal(uniqueUnits([...fixture, fixture[0]]).length, 74);
const listed = u.groupProjects([...fixture, fixture[0]], projects);
for (const [params, expected] of [[{},36],[{page:"2"},36],[{page:"3"},2],[{filter:"ready", page:"2"},1],[{filter:"installments", page:"3"},2]]) {
  const page = u.renderApartments(listed, "new-cairo", "ar", params);
  assert.equal((page.match(/class="pcard"/g) || []).length, expected);
}
assert.equal(u.renderApartments(listed, "new-cairo", "ar", {page:"4"}), null);
const crossed = publicUnit({delivery_text:"up to 10 Years with 15% Down Payment", installments_text:"8 years", finishing:"AP-FFI"});
assert.equal(crossed.delivery_text + crossed.installments_text + crossed.finishing, "");
assert.deepEqual(publicUnit(crossed), crossed);
const selected = { ...fixture[0], project_name:"Mazarine", area_sqm:127, starting_price:7598000 };
for (const lang of ["ar","en"]) {
  const message = new URL(unitInquiry(selected, "mazarine", lang)).searchParams.get("text");
  for (const fact of [selected.id, "127", "7,598,000", "5%", "/units/"]) assert.ok(message.includes(fact));
}
