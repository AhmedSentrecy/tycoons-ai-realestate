"use strict";
const SITE = "https://tycoons-inv.com";
function text(value) { return String(value ?? "").trim(); }
function positive(value) {
  const number = Number(text(value).replace(/,/g, ""));
  return Number.isFinite(number) && number > 0 ? number : null;
}
function realDate(value) {
  const date = text(value);
  return /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(date) && Number.isFinite(Date.parse(date)) ? date : undefined;
}
function hasEditorialContent(sections) {
  if (!Array.isArray(sections)) return false;
  return sections.some((section) => {
    if (Array.isArray(section?.paragraphs) && section.paragraphs.some((p) => text(p))) return true;
    if (!Array.isArray(section?.blocks)) return false;
    return section.blocks.some((block) => {
      if (block.type === "paragraph") return Array.isArray(block.content) && block.content.some((s) => text(s.text));
      if (block.type === "ordered_list") return Array.isArray(block.items) && block.items.some((item) => Array.isArray(item) && item.some((s) => text(s.text)));
      return false;
    });
  });
}

function buildProjectSchemas(input) {
  const { url, name, location, description = "", title = name, language = "ar", units = [], ranges = [], articleSections = [] } = input;
  const images = [...new Set((input.images || []).filter((s) => /^https?:\/\/[^\s<>"']+$/.test(text(s))))];
  const prices = [...units.map((u) => positive(u.starting_price)), ...ranges.flatMap((r) => [positive(r.min_price), positive(r.max_price)])].filter((p) => p !== null);
  const dated = realDate(input.modified);
  const graph = [];
  if (units.length || ranges.length) {
    graph.push({
      "@type": "RealEstateListing", "@id": `${url}#listing`, url, name, description,
      ...(images.length ? { image: images } : {}), ...(dated ? { dateModified: dated } : {}),
      ...(prices.length ? { offers: { "@type": "AggregateOffer", priceCurrency: "EGP", lowPrice: Math.min(...prices), highPrice: Math.max(...prices), offerCount: units.filter((u) => positive(u.starting_price)).length + ranges.filter((r) => positive(r.min_price)).length, availability: "https://schema.org/InStock" } } : {}),
      address: { "@type": "PostalAddress", addressLocality: location, addressCountry: "EG" },
    });
  }
  const items = [
    ...ranges.map((r, i) => ({ "@type": "ListItem", position: i + 1, name: `${name} - ${text(r.unit_type)}` })),
    ...units.map((u, i) => ({ "@type": "ListItem", position: ranges.length + i + 1, name: `${name} - ${text(u.unit_type)} ${text(u.bedrooms_text)}`.trim(), url: u.id ? `${SITE}/units/${encodeURIComponent(text(u.id))}` : url })),
  ];
  graph.push({ "@type": "ItemList", "@id": `${url}#unit-options`, name: language === "ar" ? `الوحدات المتاحة في ${name}` : `Available units at ${name}`, numberOfItems: items.length, itemListElement: items });
  // Actual listed accommodation, not merchant products or invented zero prices.
  graph.push({ "@type": "OfferCatalog", url, name: language === "ar" ? `الوحدات المتاحة في ${name}` : `Available units at ${name}`, numberOfItems: units.length, itemListElement: units.map((u) => ({
    "@type": "Offer", url: u.id ? `${SITE}/units/${encodeURIComponent(text(u.id))}` : url,
    ...(positive(u.starting_price) ? { price: positive(u.starting_price), priceCurrency: "EGP" } : {}),
    availability: "https://schema.org/InStock",
    itemOffered: { "@type": "Accommodation", name: `${text(u.unit_type)} ${name}`,
      ...(positive(u.area_sqm) ? { floorSize: { "@type": "QuantitativeValue", value: positive(u.area_sqm), unitCode: "MTK" } } : {}) },
  })) });
  if (hasEditorialContent(articleSections)) {
    const published = realDate(input.published);
    graph.push({ "@type": "Article", "@id": `${url}#article`, headline: title, description,
      inLanguage: language === "ar" ? "ar-EG" : "en", mainEntityOfPage: { "@type": "WebPage", "@id": url },
      ...(units.length || ranges.length ? { about: { "@id": `${url}#listing` } } : {}),
      ...(dated ? { dateModified: dated } : {}), ...(published ? { datePublished: published } : {}),
      ...(images.length ? { image: images } : {}),
      author: { "@type": "Organization", name: "Tycoons Investments", url: `${SITE}/about` },
      publisher: { "@type": "Organization", "@id": `${SITE}/#organization`, name: "Tycoons Investments", logo: { "@type": "ImageObject", url: `${SITE}/images/logo.png` } },
    });
  }
  return graph;
}
module.exports = { buildProjectSchemas, hasEditorialContent };
