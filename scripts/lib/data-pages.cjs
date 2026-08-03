"use strict";

const SITE_URL = "https://tycoons-inv.com";

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function text(value) {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function numberValue(value) {
  const parsed = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function arrayValue(value) {
  return Array.isArray(value) ? value : [];
}

function urls(...values) {
  return [...new Set(values.flatMap((value) => text(value).split(",")).map((url) => url.trim()).filter(Boolean))];
}

function formatPrice(value) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(numberValue(value));
}

function replaceTokens(value, minPrice, minArea, maxArea) {
  return text(value)
    .replaceAll("{{min_price}}", formatPrice(minPrice))
    .replaceAll("{{min_area}}", String(minArea))
    .replaceAll("{{max_area}}", String(maxArea));
}

function slugify(value) {
  return text(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function areaSlug(location) {
  const value = text(location).toLowerCase();
  if (/mostakbal/.test(value)) return "mostakbal-city";
  if (/new cairo|fifth settlement/.test(value)) return "new-cairo";
  if (/north coast|sahel|ras el/.test(value)) return "north-coast";
  if (/sokhna|galala/.test(value)) return "ain-sokhna";
  if (/zayed/.test(value)) return "sheikh-zayed";
  if (/new capital|administrative capital/.test(value)) return "new-capital";
  return slugify(location);
}

function removeTag(html, expression) {
  return html.replace(expression, "");
}

function pageShell(shell, { title, description, canonical, image, keywords, schemas, body }) {
  let html = shell;
  html = removeTag(html, /<title>[\s\S]*?<\/title>/i);
  html = removeTag(html, /<meta\s+name=["']description["'][\s\S]*?\/?\s*>/i);
  html = removeTag(html, /<meta\s+name=["']robots["'][\s\S]*?\/?\s*>/i);
  html = removeTag(html, /<meta\s+name=["']keywords["'][\s\S]*?\/?\s*>/i);
  html = removeTag(html, /<link\s+rel=["']canonical["'][\s\S]*?\/?\s*>/i);
  html = removeTag(html, /<link\s+rel=["']alternate["'][\s\S]*?\/?\s*>/gi);
  html = removeTag(html, /<meta\s+property=["']og:[^"']+["'][\s\S]*?\/?\s*>/gi);
  html = removeTag(html, /<meta\s+name=["']twitter:card["'][\s\S]*?\/?\s*>/i);
  html = removeTag(html, /<script\s+type=["']application\/ld\+json["']>[\s\S]*?<\/script>/gi);

  const head = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}">`,
    `<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">`,
    keywords.length ? `<meta name="keywords" content="${escapeHtml(keywords.join(", "))}">` : "",
    `<link rel="canonical" href="${escapeHtml(canonical)}">`,
    `<link rel="alternate" hreflang="ar-EG" href="${escapeHtml(canonical)}">`,
    `<link rel="alternate" hreflang="x-default" href="${escapeHtml(canonical)}">`,
    `<meta property="og:type" content="article">`,
    `<meta property="og:site_name" content="Tycoons Investments">`,
    `<meta property="og:title" content="${escapeHtml(title)}">`,
    `<meta property="og:description" content="${escapeHtml(description)}">`,
    `<meta property="og:url" content="${escapeHtml(canonical)}">`,
    image ? `<meta property="og:image" content="${escapeHtml(image)}">` : "",
    `<meta property="og:locale" content="ar_EG">`,
    `<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}">`,
    `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": schemas }).replace(/</g, "\\u003c")}</script>`,
  ].filter(Boolean).join("\n    ");
  html = html.replace("</head>", `    ${head}\n  </head>`);

  const rootStart = html.indexOf('<div id="root">');
  const bodyEnd = html.lastIndexOf("</body>");
  if (rootStart < 0 || bodyEnd < 0) throw new Error("Vite shell is missing the root or body end");
  const rootTail = html.slice(rootStart, bodyEnd);
  const bodyScripts = rootTail.match(/<script\s+type=["']module["'][\s\S]*?<\/script>/gi) || [];
  html = `${html.slice(0, rootStart)}<div id="root">${body}</div>\n    ${bodyScripts.join("\n    ")}\n  ${html.slice(bodyEnd)}`;
  return html;
}

function uniqueUnits(units) {
  return [...new Map(units.map((unit) => [
    [unit.unit_type, unit.bedrooms_text, unit.area_sqm, unit.starting_price].join("|"),
    unit,
  ])).values()];
}

function renderProjectStatic(shell, project, projectUnits) {
  const units = uniqueUnits(projectUnits);
  if (!units.length) throw new Error(`Project ${project.slug} has no available units`);
  const canonical = `${SITE_URL}/projects/${project.slug}`;
  const prices = units.map((unit) => numberValue(unit.starting_price)).filter(Boolean);
  const areas = units.map((unit) => numberValue(unit.area_sqm)).filter(Boolean);
  const minPrice = Math.min(...prices);
  const minArea = areas.length ? Math.min(...areas) : 0;
  const maxArea = areas.length ? Math.max(...areas) : 0;
  const imageList = urls(project.image_url, project.gallery_urls, ...units.map((unit) => unit.image_url));
  const title = text(project.seo_title) || `${project.name} | الأسعار والوحدات المتاحة`;
  const description = text(project.seo_description) || text(project.description) ||
    `اعرف أسعار ومساحات ${project.name} وخطط السداد والوحدات المتاحة.`;
  const storedFaq = arrayValue(project.faq);
  const faq = storedFaq.length ? storedFaq : [
    {
      question: `ما أقل سعر ظاهر حاليًا في ${project.name}؟`,
      answer: `أقل سعر ظاهر حاليًا يبدأ من {{min_price}} جنيه، ويجب تأكيد السعر والتوفر وقت الطلب.`,
    },
    {
      question: `ما أنواع الوحدات المتاحة في ${project.name}؟`,
      answer: `الوحدات الظاهرة حاليًا تشمل ${[...new Set(units.map((unit) => text(unit.unit_type)).filter(Boolean))].join("، ")}.`,
    },
  ];
  const article = arrayValue(project.article_sections);
  const developerPath = `/ar/developers/${slugify(project.developer)}`;
  const areaPath = `/ar/areas/${areaSlug(project.location)}`;
  const body = `<main dir="rtl" class="min-h-screen bg-[#f7f2ea] text-[#1b2420]">
  <header class="bg-[#0d1f18] px-5 py-5 text-white"><nav class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4"><a href="/" class="font-extrabold">TYCOONS INVESTMENTS</a><span class="flex gap-4 text-sm"><a href="/ar/">دليل المشاريع</a><a href="${areaPath}">${escapeHtml(project.location)}</a><a href="${developerPath}">${escapeHtml(project.developer)}</a></span></nav></header>
  <section class="bg-[#0d1f18] px-5 pb-12 pt-16 text-white"><div class="mx-auto max-w-7xl"><p class="text-sm text-[#d9b87c]">${escapeHtml(project.developer)} · ${escapeHtml(project.location)}</p><h1 class="mt-5 max-w-4xl text-4xl font-extrabold leading-tight sm:text-5xl">${escapeHtml(project.name)}</h1><p class="mt-5 max-w-4xl text-lg text-white/70">${escapeHtml(text(project.hero_text) || description)}</p></div></section>
  ${imageList[0] ? `<section class="bg-[#0d1f18] px-5 pb-12"><img src="${escapeHtml(imageList[0])}" alt="${escapeHtml(project.name)}" width="1280" height="720" fetchpriority="high" class="mx-auto aspect-[16/8] w-full max-w-7xl rounded-3xl object-cover"></section>` : ""}
  <section class="mx-auto max-w-7xl px-5 py-16"><div class="grid gap-12 lg:grid-cols-[1.6fr_0.8fr]"><article>
  ${article.length ? article.map((section) => `<section class="mb-12"><h2 class="text-3xl font-extrabold">${escapeHtml(replaceTokens(section.heading, minPrice, minArea, maxArea))}</h2>${arrayValue(section.paragraphs).map((paragraph) => `<p class="mt-5 font-light leading-loose text-[#5c6a62]">${escapeHtml(replaceTokens(paragraph, minPrice, minArea, maxArea))}</p>`).join("")}</section>`).join("") : `<h2 class="text-3xl font-extrabold">عن ${escapeHtml(project.name)}</h2><p class="mt-5">${escapeHtml(description)}</p>`}
  ${faq.length ? `<section><h2 class="text-2xl font-extrabold">أسئلة شائعة عن ${escapeHtml(project.name)}</h2>${faq.map((item) => `<details class="mt-4 rounded-2xl border border-[#e7ddc8] bg-white/70 p-5"><summary class="font-bold">${escapeHtml(replaceTokens(item.question, minPrice, minArea, maxArea))}</summary><p class="mt-3 text-[#5c6a62]">${escapeHtml(replaceTokens(item.answer, minPrice, minArea, maxArea))}</p></details>`).join("")}</section>` : ""}
  </article><aside class="rounded-3xl bg-[#0d1f18] p-7 text-white"><p class="text-sm text-white/55">الأسعار تبدأ من</p><p class="mt-2 text-3xl font-extrabold text-[#ecd9ae]">${formatPrice(minPrice)} جنيه</p><a href="https://wa.me/201200704344" class="mt-6 inline-block rounded-full bg-[#1faa59] px-6 py-3 font-bold">تأكيد السعر والمتاح</a></aside></div></section>
  <section class="border-y border-[#e7ddc8] bg-[#efe7d8] px-5 py-16"><div class="mx-auto max-w-7xl"><h2 class="text-3xl font-extrabold">الوحدات المتاحة</h2><div class="mt-8 grid gap-5 md:grid-cols-2">${units.map((unit) => `<article class="rounded-3xl border border-[#e0d3bb] bg-white p-6"><h3 class="text-xl font-extrabold">${escapeHtml(text(unit.unit_type))} ${escapeHtml(text(unit.bedrooms_text))}</h3><p class="mt-3">${escapeHtml(unit.area_sqm)} م² · ${formatPrice(unit.starting_price)} جنيه</p><a href="/units/${escapeHtml(unit.id)}" class="mt-4 inline-block font-bold text-[#8a6630]">تفاصيل الوحدة</a></article>`).join("")}</div></div></section>
  </main>`;

  const schemas = [
    {
      "@type": "RealEstateListing",
      "@id": `${canonical}#listing`,
      url: canonical,
      name: project.name,
      description,
      image: imageList,
      dateModified: project.last_updated_at,
      offers: { "@type": "AggregateOffer", priceCurrency: "EGP", lowPrice: minPrice, offerCount: units.length, availability: "https://schema.org/InStock" },
      address: { "@type": "PostalAddress", addressLocality: project.location, addressCountry: "EG" },
    },
    {
      "@type": "Article",
      "@id": `${canonical}#article`,
      headline: title,
      description,
      mainEntityOfPage: canonical,
      dateModified: project.last_updated_at,
      author: { "@type": "Organization", name: "Tycoons Investments" },
      publisher: { "@type": "Organization", name: "Tycoons Investments" },
    },
    {
      "@type": "FAQPage",
      "@id": `${canonical}#faq`,
      mainEntity: faq.map((item) => ({
        "@type": "Question",
        name: replaceTokens(item.question, minPrice, minArea, maxArea),
        acceptedAnswer: { "@type": "Answer", text: replaceTokens(item.answer, minPrice, minArea, maxArea) },
      })),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "الرئيسية", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: project.location, item: `${SITE_URL}${areaPath}` },
        { "@type": "ListItem", position: 3, name: project.developer, item: `${SITE_URL}${developerPath}` },
        { "@type": "ListItem", position: 4, name: project.name, item: canonical },
      ],
    },
  ];
  return pageShell(shell, {
    title,
    description,
    canonical,
    image: imageList[0] || "",
    keywords: arrayValue(project.seo_keywords).map(text).filter(Boolean),
    schemas,
    body,
  });
}

function renderUnitStatic(shell, unit, project) {
  const canonical = `${SITE_URL}/units/${unit.id}`;
  const projectUrl = `${SITE_URL}/projects/${project.slug}`;
  const title = `${text(unit.unit_type)} ${numberValue(unit.area_sqm)} م² في ${text(unit.project_name)} | Tycoons`;
  const description = `${text(unit.unit_type)} في ${text(unit.project_name)} بسعر يبدأ من ${formatPrice(unit.starting_price)} جنيه. اعرف المساحة وخطة السداد والتشطيب.`;
  const imageList = urls(unit.image_url, unit.gallery_urls);
  const body = `<main dir="rtl" class="min-h-screen bg-[#f7f2ea] text-[#1b2420]"><header class="bg-[#0d1f18] px-5 py-5 text-white"><nav class="mx-auto flex max-w-7xl justify-between"><a href="/" class="font-extrabold">TYCOONS INVESTMENTS</a><a href="/projects/${escapeHtml(project.slug)}">${escapeHtml(unit.project_name)}</a></nav></header><section class="bg-[#0d1f18] px-5 pb-12 pt-16 text-white"><div class="mx-auto max-w-7xl"><p class="text-[#d9b87c]">${escapeHtml(unit.developer)} · ${escapeHtml(unit.location)}</p><h1 class="mt-5 text-4xl font-extrabold sm:text-5xl">${escapeHtml(unit.unit_type)} ${escapeHtml(unit.area_sqm)} م² في ${escapeHtml(unit.project_name)}</h1></div></section>${imageList[0] ? `<section class="bg-[#0d1f18] px-5 pb-12"><img src="${escapeHtml(imageList[0])}" alt="${escapeHtml(title)}" width="1280" height="720" fetchpriority="high" class="mx-auto aspect-[16/8] w-full max-w-7xl rounded-3xl object-cover"></section>` : ""}<section class="mx-auto max-w-7xl px-5 py-16"><div class="grid gap-8 lg:grid-cols-[1fr_0.75fr]"><article><h2 class="text-3xl font-extrabold">تفاصيل الوحدة</h2><p class="mt-5 leading-loose text-[#5c6a62]">${escapeHtml(text(unit.description) || description)}</p><dl class="mt-8 grid gap-4 sm:grid-cols-2"><div class="rounded-2xl border bg-white p-5"><dt>المساحة</dt><dd class="font-bold">${escapeHtml(unit.area_sqm)} م²</dd></div><div class="rounded-2xl border bg-white p-5"><dt>التشطيب</dt><dd class="font-bold">${escapeHtml(text(unit.finishing))}</dd></div><div class="rounded-2xl border bg-white p-5"><dt>السداد</dt><dd class="font-bold">${escapeHtml(text(unit.installments_text))}</dd></div><div class="rounded-2xl border bg-white p-5"><dt>الاستلام</dt><dd class="font-bold">${escapeHtml(text(unit.delivery_text))}</dd></div></dl></article><aside class="rounded-3xl bg-[#0d1f18] p-7 text-white"><p>السعر يبدأ من</p><p class="mt-2 text-3xl font-extrabold text-[#ecd9ae]">${formatPrice(unit.starting_price)} جنيه</p><a href="https://wa.me/201200704344" class="mt-6 inline-block rounded-full bg-[#1faa59] px-6 py-3 font-bold">تأكيد السعر والمتاح</a><br><a href="/projects/${escapeHtml(project.slug)}" class="mt-6 inline-block text-[#d9b87c]">شوف المشروع بالكامل</a></aside></div></section></main>`;
  const schemas = [
    {
      "@type": "RealEstateListing",
      "@id": `${canonical}#listing`,
      url: canonical,
      name: `${unit.unit_type} في ${unit.project_name}`,
      description,
      image: imageList,
      dateModified: unit.last_updated_at,
      offers: { "@type": "Offer", price: numberValue(unit.starting_price), priceCurrency: "EGP", availability: "https://schema.org/InStock" },
      accommodation: { "@type": "Accommodation", floorSize: { "@type": "QuantitativeValue", value: numberValue(unit.area_sqm), unitCode: "MTK" } },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "الرئيسية", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: unit.project_name, item: projectUrl },
        { "@type": "ListItem", position: 3, name: unit.unit_type, item: canonical },
      ],
    },
  ];
  return pageShell(shell, { title, description, canonical, image: imageList[0] || "", keywords: [], schemas, body });
}

module.exports = { renderProjectStatic, renderUnitStatic, escapeHtml };
