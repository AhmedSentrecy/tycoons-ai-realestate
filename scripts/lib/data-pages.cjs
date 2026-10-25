"use strict";

const { localizedProjectContent, renderSections: renderLocalizedSections, hasIndexableContent } = require("../../netlify/functions/_localized-project-content.cjs");
// Buyer FAQ computed from the live units (shared with the React project page; needs `node --import tsx`).
const { buildProjectFaq, isCuratedFaq } = require("../../src/lib/projectFaq.ts");

const { pageShell } = require("./page-shell.cjs");
const { buildProjectSchemas } = require("../../netlify/functions/_project-schema.cjs");
const { unitPath } = require("../../netlify/functions/_unit-url.cjs");
const { renderSafeMarkdown } = require("../../netlify/functions/_article-render.cjs");
const { publicEditorialMarkdown, developerInfo } = require("../../netlify/functions/_seo-utils.cjs");

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

function arabicField(value, fallback = "") {
  const source = text(value).replace(/\s+/g, " ");
  if (!source) return fallback;
  const exact = {
    apartment: "شقة", studio: "ستوديو", duplex: "دوبلكس", penthouse: "بنتهاوس",
    chalet: "شاليه", "standalone villa": "فيلا مستقلة", "twin house": "توين هاوس",
    townhouse: "تاون هاوس", "town house": "تاون هاوس", office: "مكتب إداري",
    clinic: "عيادة", "commercial unit": "وحدة تجارية", retail: "محل تجاري",
    "core & shell": "نصف تشطيب", "core and shell": "نصف تشطيب",
    "fully finished": "تشطيب كامل", finished: "متشطب",
    "immediate delivery": "استلام فوري", "ready to move": "جاهز للاستلام",
  }[source.toLowerCase()];
  if (exact) return exact;
  return source
    .replace(/delivery\s+in\s+(\d+)\s+years?/gi, "الاستلام خلال $1 سنوات")
    .replace(/(\d+)\s+years?/gi, "$1 سنوات")
    .replace(/(\d+)\s+bedrooms?/gi, "$1 غرف نوم")
    .replace(/\bstandalone villa\b/gi, "فيلا مستقلة")
    .replace(/\btwin house\b/gi, "توين هاوس")
    .replace(/\btown\s*house\b/gi, "تاون هاوس")
    .replace(/\bapartment\b/gi, "شقة")
    .replace(/\bpenthouse\b/gi, "بنتهاوس")
    .replace(/\bduplex\b/gi, "دوبلكس")
    .replace(/\bchalet\b/gi, "شاليه")
    .replace(/\bcore\s*(?:&|and)\s*shell\b/gi, "نصف تشطيب")
    .replace(/\bfully finished\b/gi, "تشطيب كامل");
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
  if (/october/.test(value)) return "october";
  if (/alamein/.test(value)) return "new-alamein";
  return slugify(location);
}

const AREA_NAMES = {
  "mostakbal-city": "مستقبل سيتي",
  "new-alamein": "العلمين الجديدة",
  "new-cairo": "القاهرة الجديدة والتجمع",
  "north-coast": "الساحل الشمالي",
  "ain-sokhna": "العين السخنة",
  "sheikh-zayed": "الشيخ زايد",
  "new-capital": "العاصمة الإدارية الجديدة",
  october: "السادس من أكتوبر",
};

const AREA_FACTS = {
  "mostakbal-city": {
    context: "مستقبل سيتي منطقة سكنية ناشئة على امتداد طريق السويس، قريبة من مدينتي والقاهرة الجديدة، وبقت من أكتر المناطق اللي المطورين بيطلقوا فيها مشاريع جديدة في السنين الأخيرة.",
    buyerNote: "غالبية المشاريع هنا لسه تحت الإنشاء بخطط سداد طويلة، فمراجعة سجل تسليم المطور مهمة قبل الحجز.",
  },
  "new-alamein": {
    context: "العلمين الجديدة مدينة ساحلية جديدة غرب الساحل الشمالي بدعم حكومي، وفيها مشاريع سكنية دائمة مش موسمية بس زي باقي الساحل.",
    buyerNote: "فرّق وانت بتقارن بين وحدات للسكن الدائم في العلمين الجديدة ووحدات موسمية في باقي الساحل الشمالي، لأن نمط الاستخدام والعائد المتوقع مختلف.",
  },
  "new-cairo": {
    context: "القاهرة الجديدة والتجمع الخامس من أكتر مناطق شرق القاهرة اكتمالاً من ناحية الخدمات — فيها الجامعة الأمريكية بالقاهرة (AUC)، مولات زي كايرو فيستيفال سيتي، ومدارس وجامعات دولية.",
    buyerNote: "المنطقة عليها طلب إيجاري وإعادة بيع من الأعلى في القاهرة الجديدة، خصوصاً في المشاريع المُسلَّمة أو القريبة من التسليم.",
  },
  "north-coast": {
    context: "الساحل الشمالي شريط القرى السياحية على طريق الإسكندرية-مطروح، ومعظم الوحدات فيه شاليهات وفيلات موسمية بتتباع بنظام الحجز المبكر قبل الصيف.",
    buyerNote: "افرق بين الاستخدام الشخصي والتأجير الموسمي وانت بتقارن الموقع جوه القرية والمسافة من الشاطئ، لأنها بتأثر على السعر أكتر من مساحة الوحدة نفسها.",
  },
  "ain-sokhna": {
    context: "العين السخنة أقرب شاطئ للقاهرة على خليج السويس، وده بيخليها خيار شائع لشاليه ويك إند بدل رحلة الساحل الشمالي الأطول.",
    buyerNote: "راجع مسافة القرية عن طريق السخنة السريع وجودة الخدمة الشتوية، لأن كتير من القرى بتقلل خدماتها بره موسم الصيف.",
  },
  "sheikh-zayed": {
    context: "الشيخ زايد امتداد غرب القاهرة بمحاذاة أكتوبر، وفيها خليط من الكمبوندات المُسلَّمة والمشاريع الجديدة، وقريبة من مولات زي مول العرب وهايبر وان.",
    buyerNote: "المنطقة عليها طلب سكني مستقر، فالمشاريع القريبة من المحاور الرئيسية عادة بتحافظ على سيولة إعادة بيع أعلى.",
  },
  "new-capital": {
    context: "العاصمة الإدارية الجديدة مدينة قيد الإنشاء شرق القاهرة، فيها الحي الحكومي والبرج الأيقوني، ومعظم مشاريعها السكنية لسه في مراحل تسليم مبكرة أو متوسطة.",
    buyerNote: "لأن كتير من الخدمات لسه بتتبني، قارن توقيت التسليم الفعلي للمشروع بجدول تسليم المرافق المحيطة قبل ما تعتمد على جدول المطور وحده.",
  },
  october: {
    context: "السادس من أكتوبر مدينة راسخة غرب القاهرة فيها جامعات وصناعات ومناطق سكنية جاهزة، وأسعارها عادة أقل من زايد على نفس المسافة من القاهرة.",
    buyerNote: "المشاريع الجاهزة أو القريبة من التسليم في أكتوبر عادة بتوفر بديل أرخص لمن يريد سكن غرب القاهرة بميزانية أقل من زايد.",
  },
};

const GENERIC_AREA_FACTS = {
  context: "المنطقة دي من مناطق العرض الحالية في قاعدة بيانات Tycoons، وبتُحدَّث بيانات المشاريع فيها باستمرار.",
  buyerNote: "راجع قرب المشروع من الطرق الرئيسية والخدمات القائمة فعليًا قبل المقارنة بمناطق تانية.",
};

function areaInfo(location) {
  const slug = areaSlug(location);
  return {
    slug,
    ar: AREA_NAMES[slug] || text(location) || "مصر",
    facts: AREA_FACTS[slug] || GENERIC_AREA_FACTS,
  };
}

function hashPick(seed, length) {
  let hash = 0;
  const value = String(seed || "");
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return length > 0 ? hash % length : 0;
}

function pick(bank, seed, salt = "") {
  return bank[hashPick(`${seed}:${salt}`, bank.length)];
}

function unitStats(unit, siblings) {
  const price = numberValue(unit.starting_price);
  const area = numberValue(unit.area_sqm);
  const siblingPrices = siblings.map((item) => numberValue(item.starting_price)).filter(Boolean);
  const siblingAreas = siblings.map((item) => numberValue(item.area_sqm)).filter(Boolean);
  const minPrice = siblingPrices.length ? Math.min(...siblingPrices) : price;
  const maxPrice = siblingPrices.length ? Math.max(...siblingPrices) : price;
  const minArea = siblingAreas.length ? Math.min(...siblingAreas) : area;
  const maxArea = siblingAreas.length ? Math.max(...siblingAreas) : area;
  const priceRank =
    siblingPrices.length < 2 ? "only" : price <= minPrice * 1.02 ? "cheapest" : price >= maxPrice * 0.98 ? "priciest" : "mid";
  const sizeRank =
    siblingAreas.length < 2 ? "only" : area >= maxArea * 0.98 ? "largest" : area <= minArea * 1.02 ? "smallest" : "mid";
  return { price, area, priceRank, sizeRank, siblingCount: siblings.length };
}

function rankClause(stats) {
  const parts = [];
  if (stats.siblingCount > 0) {
    if (stats.priceRank === "cheapest") parts.push("من أرخص الخيارات المتاحة حاليًا في المشروع");
    else if (stats.priceRank === "priciest") parts.push("من أعلى الوحدات سعرًا في المشروع، غالبًا لمساحة أو موقع مميز");
    if (stats.sizeRank === "largest") parts.push("أكبر مساحة متاحة من نفس المشروع");
    else if (stats.sizeRank === "smallest") parts.push("أصغر مساحة متاحة، خيار مناسب لميزانية أقل");
  }
  if (!parts.length) {
    parts.push(
      stats.siblingCount > 0
        ? `واحدة من ${stats.siblingCount + 1} خيارات متاحة حاليًا في المشروع`
        : "الخيار الوحيد الظاهر حاليًا من هذا المشروع في قاعدة بياناتنا",
    );
  }
  return parts.join(" و");
}

const UNIT_INTRO_BANK = [
  (u) => `${u.unitType} بمساحة ${u.area} م² جوه ${u.projectName} من ${u.developer}، في ${u.areaAr}. ${u.rank}. السعر يبدأ من ${u.price}، والاستلام ${u.delivery}.`,
  (u) => `لو بتدوّر على ${u.unitType} في ${u.projectName} (${u.developer}) بمنطقة ${u.areaAr}، الوحدة دي مساحتها ${u.area} م² وسعرها يبدأ من ${u.price}. ${u.rank}.`,
  (u) => `وحدة ${u.unitType} داخل ${u.projectName} — مشروع ${u.developer} في ${u.areaAr} — بمساحة ${u.area} م². ${u.rank}. خطة السداد: ${u.installments}.`,
  (u) => `${u.projectName} من ${u.developer} بيقدّم ${u.unitType} بمساحة ${u.area} م² في ${u.areaAr}، سعرها يبدأ من ${u.price}. ${u.rank}.`,
  (u) => `دي ${u.unitType} بمساحة ${u.area} م² في مشروع ${u.projectName} (${u.developer})، منطقة ${u.areaAr}. ${u.rank}. السعر يبدأ من ${u.price} والتسليم ${u.delivery}.`,
  (u) => `وحدة من نوع ${u.unitType} في ${u.projectName}، ${u.developer}، ${u.areaAr}، بمساحة ${u.area} م² وسعر يبدأ من ${u.price}. ${u.rank}.`,
];


function uniqueUnits(units) {
  return [...new Map(units.map((unit) => [
    [unit.unit_type, unit.bedrooms_text, unit.area_sqm, unit.starting_price].join("|"),
    unit,
  ])).values()];
}

function isVillaLike(unit) {
  return /villa|townhouse|town house|twinhouse|twin house|standalone|فيلا|تاون\s*هاوس|توين\s*هاوس/i
    .test(`${text(unit.unit_type)} ${text(unit.bedrooms_text)}`);
}

function projectPriceRanges(project) {
  const targeting = project.targeting && typeof project.targeting === "object" && !Array.isArray(project.targeting)
    ? project.targeting
    : {};
  return arrayValue(targeting.price_ranges).flatMap((range) => {
    const unitType = text(range?.unit_type);
    const areaSqm = numberValue(range?.area_sqm);
    const minPrice = numberValue(range?.min_price);
    const maxPrice = numberValue(range?.max_price);
    return unitType && areaSqm > 0 && minPrice > 0 && maxPrice >= minPrice
      ? [{ unit_type: unitType, area_sqm: areaSqm, min_price: minPrice, max_price: maxPrice }]
      : [];
  });
}

// Unit dates: when it was added and last updated, and a «جديد» tag for the last 7 days.
const NEW_UNIT_DAYS = 7;
function arDate(value) {
  const time = Date.parse(text(value));
  return Number.isFinite(time) ? new Intl.DateTimeFormat("ar-EG-u-nu-latn", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Cairo" }).format(new Date(time)) : "";
}
function isNewUnit(unit, now = Date.now()) {
  const time = Date.parse(text(unit.created_at));
  return Number.isFinite(time) && now - time <= NEW_UNIT_DAYS * 86400000;
}
const NEW_TAG = '<span class="ms-2 inline-block rounded-full bg-[#1faa59] px-2.5 py-0.5 align-middle text-xs font-bold text-white">جديد</span>';

function staticUnitCard(unit, projectSlug = "") {
  const plan = [text(unit.down_payment_text), text(unit.installments_text)].filter(Boolean).map(arabicField).join(" · ");
  return `<details class="overflow-hidden rounded-3xl border border-[#e0d3bb] bg-white p-6"><summary class="cursor-pointer list-none"><h3 class="text-xl font-extrabold">${escapeHtml(arabicField(unit.unit_type))} ${escapeHtml(arabicField(unit.bedrooms_text))}${isNewUnit(unit) ? NEW_TAG : ""}</h3>${arDate(unit.created_at) ? `<p class="mt-1 text-xs text-[#5c6a62]">اتضافت ${escapeHtml(arDate(unit.created_at))}</p>` : ""}<p class="mt-3">${escapeHtml(unit.area_sqm)} م² · ${formatPrice(unit.starting_price)} جنيه${Number(unit.starting_price) > 0 && Number(unit.area_sqm) >= 20 ? ` · سعر المتر ${new Intl.NumberFormat("en-EG").format(Math.round(Number(unit.starting_price) / Number(unit.area_sqm)))} جنيه` : ""}</p><span class="mt-4 inline-block font-bold text-[#8a6630]">اعرض المقدم وخطة التقسيط</span></summary>${plan ? `<p class="mt-5 border-t border-[#eee5d6] pt-5 text-[#5c6a62]">${escapeHtml(plan)}</p>` : ""}${unit.id ? `<a href="${escapeHtml(unitPath({ ...unit, project_slug: projectSlug }))}" class="mt-4 inline-block font-bold text-[#8a6630]">كل تفاصيل الوحدة</a>` : ""}</details>`;
}

function renderProjectStatic(shell, project, projectUnits, guides = [], faqContext = {}) {
  const units = uniqueUnits(projectUnits);
  // No units but a full written guide: render the normal page (indexable) instead of the thin notice.
  if (!units.length && !hasIndexableContent(project, "ar")) {
    const canonical = `${SITE_URL}/projects/${project.slug}`;
    const title = `${project.name} | Tycoons Investments`;
    const description = `تفاصيل مشروع ${project.name} من ${project.developer}. تواصل معنا لتأكيد آخر الوحدات المتاحة.`;
    const body = `<main dir="rtl" class="min-h-screen bg-[#f7f2ea] text-[#1b2420]"><header class="bg-[#0d1f18] px-5 py-5 text-white"><nav class="mx-auto max-w-4xl"><a href="/ar/">دليل المشاريع</a></nav></header><section class="mx-auto max-w-4xl px-5 py-20"><h1 class="text-4xl font-extrabold">${escapeHtml(project.name)}</h1><p class="mt-3">${escapeHtml(project.developer)} · ${escapeHtml(project.location)}</p><p class="mt-8 rounded-2xl bg-white p-6">معلومات المشروع موجودة، لكن مفيش وحدات متاحة مؤكدة نقدر نعرضها حاليًا. تواصل معنا عشان نراجع أحدث التوافر والأسعار مع المطور.</p><a href="https://wa.me/201110100025" class="mt-8 inline-block rounded-full bg-[#1faa59] px-6 py-3 font-bold text-white">اسأل عن آخر المتاح</a></section></main>`;
    return pageShell(shell, {
      title, description, canonical, body, robots: "noindex,follow", image: "", keywords: [],
      schemas: [{ "@type": "WebPage", name: title, description, inLanguage: "ar-EG", url: canonical }],
    });
  }
  const priceRanges = projectPriceRanges(project);
  const villaUnits = units.filter(isVillaLike);
  const otherUnits = units.filter((unit) => !isVillaLike(unit));
  const canonical = `${SITE_URL}/projects/${project.slug}`;
  const prices = [
    ...units.map((unit) => numberValue(unit.starting_price)),
    ...priceRanges.flatMap((range) => [range.min_price, range.max_price]),
  ].filter(Boolean);
  const areas = units.map((unit) => numberValue(unit.area_sqm)).filter(Boolean);
  const minPrice = prices.length ? Math.min(...prices) : numberValue(project.min_price);
  const highPrice = prices.length ? Math.max(...prices) : minPrice;
  const totalOptionCount = units.length + priceRanges.length;
  const minArea = areas.length ? Math.min(...areas) : 0;
  const maxArea = areas.length ? Math.max(...areas) : 0;
  const imageList = urls(project.image_url, project.gallery_urls, ...units.map((unit) => unit.image_url));
  const isIcityOctober = project.slug === "mountain-view-icity-october--mountain-view";
  const localized = localizedProjectContent(project, "ar");
  const legacyTitle = isIcityOctober
    ? `${project.name} — الأسعار والموقع والوحدات | Tycoons`
    : text(project.seo_title) || `${project.name} | الأسعار والوحدات المتاحة`;
  const legacyDescription = isIcityOctober && prices.length
    ? `${project.name} من ${project.developer} في ${project.location}. الأسعار الظاهرة من ${formatPrice(minPrice)} إلى ${formatPrice(highPrice)} جنيه عبر ${totalOptionCount} خيار، مع طريقة التأكد من الموقع والـmaster plan الرسمي.`
    : text(project.seo_description) || text(project.description) ||
      `اعرف أسعار ومساحات ${project.name} وخطط السداد والوحدات المتاحة.`;
  const title = localized?.seo_title || legacyTitle;
  const description = localized?.seo_description || legacyDescription;
  const storedFaq = localized?.faq?.length ? localized.faq : arrayValue(project.faq);
  // Hand-written questions stay as they are; template ones are replaced by questions computed from the live units.
  const computedFaq = isCuratedFaq(storedFaq) ? [] : buildProjectFaq({ name: project.name, developer: text(project.developer), location: text(project.location) }, units, { ...faqContext, research: project.targeting?.research_faq });
  const baseFaq = computedFaq.length ? computedFaq : storedFaq.length ? storedFaq : [
    {
      question: `ما أقل سعر ظاهر حاليًا في ${project.name}؟`,
      answer: `أقل سعر ظاهر حاليًا يبدأ من {{min_price}} جنيه، ويجب تأكيد السعر والتوفر وقت الطلب.`,
    },
    ...(units.length ? [{
      question: `ما أنواع الوحدات المتاحة في ${project.name}؟`,
      answer: `الوحدات الظاهرة حاليًا تشمل ${[...new Set(units.map((unit) => text(unit.unit_type)).filter(Boolean))].join("، ")}.`,
    }] : []),
  ];
  const faq = isIcityOctober
    ? [...baseFaq, {
        question: `فين ألاقي master plan ${project.name}؟`,
        answer: `استخدم النسخة الرسمية من ${project.developer} لتأكيد المراحل والمداخل. الصفحة تعرض الوحدات والأسعار للمقارنة ولا تستبدل المخطط المساحي الرسمي.`,
      }]
    : baseFaq;
  const storedArticle = arrayValue(project.article_sections);
  let article = isIcityOctober
    ? [...storedArticle, {
        heading: `موقع ${project.name} والـmaster plan`,
        paragraphs: [`سجل Tycoons بيصنّف المشروع في ${project.location}. لتحديد المرحلة والقطعة وأقرب مدخل بدقة، راجع الـmaster plan الرسمي الصادر من ${project.developer} قبل الحجز؛ الصفحة دي للمقارنة بين الوحدات وليست خريطة مساحية.`],
      }]
    : storedArticle;
  const localizedArticle = localized?.article_sections?.length
    ? renderLocalizedSections(localized.article_sections, { escapeHtml, replaceTokens: (value) => replaceTokens(value, minPrice, minArea, maxArea) })
    : "";
  if (localizedArticle) article = { length: 1, map: () => ({ join: () => localizedArticle }) };
  const schemaProjectName = project.name;
  const ownGuide = hasIndexableContent(project, "ar");
  if (localized?.h1) project = { ...project, name: localized.h1 };
  const visibleFaq = localizedArticle ? [] : faq;
  const developerPath = `/ar/developers/${slugify(project.developer)}`;
  const areaPath = `/ar/areas/${areaSlug(project.location)}`;
  const body = `<main dir="rtl" class="min-h-screen bg-[#f7f2ea] text-[#1b2420]">
  <header class="bg-[#0d1f18] px-5 py-5 text-white"><nav class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4"><a href="/" class="font-extrabold">TYCOONS INVESTMENTS</a><span class="flex gap-4 text-sm"><a href="/ar/">دليل المشاريع</a><a href="${areaPath}">${escapeHtml(project.location)}</a><a href="${developerPath}">${escapeHtml(project.developer)}</a><a href="/en/projects/${escapeHtml(project.slug)}" lang="en" hreflang="en">English</a></span></nav></header>
  <section class="bg-[#0d1f18] px-5 pb-12 pt-16 text-white"><div class="mx-auto max-w-7xl">${project.logo?.src ? `<span style="display:inline-flex;align-items:center;height:56px;padding:8px 14px;margin-bottom:18px;border-radius:14px;${project.logo.dark ? "border:1px solid rgba(255,255,255,.18)" : "background:#fff"}"><img src="${escapeHtml(project.logo.src)}" alt="${escapeHtml(project.logo.alt)}" height="40" style="height:40px;width:auto;max-width:220px;object-fit:contain" decoding="async"></span>` : ""}<p class="text-sm text-[#d9b87c]">${escapeHtml(project.developer)} · ${escapeHtml(project.location)}</p><h1 class="mt-5 max-w-4xl text-4xl font-extrabold leading-tight sm:text-5xl">${escapeHtml(project.name)}</h1><p class="mt-5 max-w-4xl text-lg text-white/70">${escapeHtml(text(project.hero_text) || description)}</p></div></section>
  ${imageList[0] ? `<section class="bg-[#0d1f18] px-5 pb-12"><img src="${escapeHtml(imageList[0])}" alt="${escapeHtml(project.name)}" width="1280" height="720" fetchpriority="high" class="mx-auto aspect-[16/8] w-full max-w-7xl rounded-3xl object-contain"></section>` : ""}
  <section class="mx-auto max-w-7xl px-5 py-16"><div class="grid gap-12 lg:grid-cols-[1.6fr_0.8fr]"><article>
  ${article.length ? article.map((section) => `<section class="mb-12"><h2 class="text-3xl font-extrabold">${escapeHtml(replaceTokens(section.heading, minPrice, minArea, maxArea))}</h2>${arrayValue(section.paragraphs).map((paragraph) => `<p class="mt-5 font-light leading-loose text-[#5c6a62]">${escapeHtml(replaceTokens(paragraph, minPrice, minArea, maxArea))}</p>`).join("")}</section>`).join("") : `<h2 class="text-3xl font-extrabold">عن ${escapeHtml(project.name)}</h2><p class="mt-5">${escapeHtml(description)}</p>`}
  ${visibleFaq.length ? `<section><h2 class="text-2xl font-extrabold">أسئلة شائعة عن ${escapeHtml(project.name)}</h2>${visibleFaq.map((item) => `<details class="mt-4 rounded-2xl border border-[#e7ddc8] bg-white/70 p-5"><summary class="font-bold">${escapeHtml(replaceTokens(item.question, minPrice, minArea, maxArea))}</summary><p class="mt-3 text-[#5c6a62]">${escapeHtml(replaceTokens(item.answer, minPrice, minArea, maxArea))}</p></details>`).join("")}</section>` : ""}
  ${ownGuide ? "" : embeddedArticleHtml(guides[0])}
  ${ownGuide ? developerLinkHtml(project) : developerAboutHtml(project)}
  ${buyerQuestionsHtml({ ...project, name: schemaProjectName }, ownGuide ? guides : guides.slice(1))}
  </article><aside class="rounded-3xl bg-[#0d1f18] p-7 text-white">${minPrice ? `<p class="text-sm text-white/55">الأسعار تبدأ من</p><p class="mt-2 text-3xl font-extrabold text-[#ecd9ae]">${formatPrice(minPrice)} جنيه</p>` : `<p class="text-sm text-white/55">السعر حسب آخر طرح</p><p class="mt-2 text-xl font-extrabold text-[#ecd9ae]">اسأل عن أحدث الأسعار</p>`}${text(project.down_payment_text) ? `<p class="mt-3 text-sm text-white/70">${escapeHtml(arabicField(project.down_payment_text))}</p>` : ""}${text(project.installments_text) ? `<p class="mt-1 text-sm text-white/70">${escapeHtml(arabicField(project.installments_text))}</p>` : ""}${text(project.delivery_text) ? `<p class="mt-1 text-sm text-white/70">${escapeHtml(arabicField(project.delivery_text))}</p>` : ""}<a href="https://wa.me/201110100025" class="mt-6 inline-block rounded-full bg-[#1faa59] px-6 py-3 font-bold">تأكيد السعر والمتاح</a></aside></div></section>
  ${totalOptionCount ? `<section class="border-y border-[#e7ddc8] bg-[#efe7d8] px-5 py-16"><div class="mx-auto max-w-7xl"><h2 class="text-3xl font-extrabold">اختار وحدتك واعرف خطة السداد</h2><p class="mt-3 text-[#5c6a62]">${totalOptionCount} اختيار متاح من البيانات الحالية للصفحة.</p>${priceRanges.length || villaUnits.length ? `<section class="mt-9 rounded-3xl bg-[#0d1f18] p-6 text-white"><h3 class="text-2xl font-extrabold">فلل وتاون هاوس</h3><div class="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">${priceRanges.map((range) => `<details class="overflow-hidden rounded-3xl bg-white p-6 text-[#1b2420]"><summary class="cursor-pointer list-none"><h4 class="text-xl font-extrabold">${escapeHtml(range.unit_type)}</h4><p class="mt-3">${range.area_sqm} م² · ${formatPrice(range.min_price)}–${formatPrice(range.max_price)} جنيه</p><span class="mt-4 inline-block font-bold text-[#8a6630]">اعرض المقدم وخطة التقسيط</span></summary><p class="mt-5 border-t border-[#eee5d6] pt-5 text-[#5c6a62]">${escapeHtml([text(project.down_payment_text), text(project.installments_text)].filter(Boolean).map(arabicField).join(" · "))}</p></details>`).join("")}${villaUnits.map((row) => staticUnitCard(row, project.slug)).join("")}</div></section>` : ""}${otherUnits.length ? `<section class="mt-10"><h3 class="text-2xl font-extrabold">${villaUnits.length || priceRanges.length ? "شقق ووحدات أخرى" : "الوحدات المتاحة"}</h3><div class="mt-6 grid gap-5 md:grid-cols-2">${otherUnits.map((row) => staticUnitCard(row, project.slug)).join("")}</div></section>` : ""}</div></section>` : ownGuide ? "" : `<section class="border-y border-[#e7ddc8] bg-[#efe7d8] px-5 py-16"><div class="mx-auto max-w-7xl"><h2 class="text-3xl font-extrabold">الوحدات في ${escapeHtml(project.name)}</h2><p class="mt-5 max-w-3xl leading-loose text-[#5c6a62]">لا توجد وحدات منشورة بأسعار تفصيلية لهذا المشروع حالياً. تواصل معنا على واتساب وسنرسل لك أحدث قائمة أسعار وخطط سداد متاحة من المطور.</p><a href="https://wa.me/201110100025" class="mt-6 inline-block rounded-full bg-[#1faa59] px-6 py-3 font-bold text-white">اطلب أحدث الأسعار</a></div></section>`}
  </main>`;

  const schemas = [
    ...buildProjectSchemas({ url: canonical, name: schemaProjectName, projectSlug: project.slug, location: project.location, title, description,
      images: imageList, modified: project.last_updated_at, units, ranges: priceRanges,
      articleSections: localized?.article_sections?.length ? localized.article_sections : storedArticle,
    }),
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
    alternates: [{ hreflang: "en", href: `${SITE_URL}/en/projects/${project.slug}` }],
  });
}

const UNIT_FAQ_PRICE_BANK = [
  (u) => ({ q: `كام سعر ${u.unitType} في ${u.projectName}؟`, a: `السعر يبدأ من ${u.price} جنيه لـ${u.unitType} بمساحة ${u.area} م². السعر النهائي بيتحدد حسب الدور والموقع داخل المشروع، فمن الأفضل تأكيد آخر سعر قبل الحجز.` }),
  (u) => ({ q: `هل سعر ${u.unitType} دي شامل التشطيب؟`, a: `السعر المعروض ${u.price} جنيه حسب بيانات ${u.developer}، والتشطيب ${u.finishing}. أكّد تفاصيل التشطيب والسعر النهائي مع فريق المبيعات قبل الحجز.` }),
];

const UNIT_FAQ_PLAN_BANK = [
  (u) => ({ q: `إيه خطة السداد المتاحة؟`, a: `خطة السداد الحالية: ${u.installments}. الاستلام ${u.delivery}. الأرقام دي بتتغير من وقت للتاني حسب عروض ${u.developer}.` }),
  (u) => ({ q: `هل ممكن أقسّط الوحدة؟`, a: `نعم، ${u.projectName} بيوفر خطة سداد (${u.installments}) مع استلام ${u.delivery}. للتفاصيل الدقيقة تواصل معنا لتأكيد آخر عرض من ${u.developer}.` }),
];

const UNIT_FAQ_AREA_BANK = [
  (u) => ({ q: `هل ${u.areaAr} منطقة مناسبة للسكن أو الاستثمار؟`, a: u.buyerNote }),
  (u) => ({ q: `ليه أشتري في ${u.areaAr}؟`, a: u.buyerNote }),
];

function renderUnitFaq(vars, seed) {
  const items = [pick(UNIT_FAQ_PRICE_BANK, seed, "faq-price")(vars), pick(UNIT_FAQ_PLAN_BANK, seed, "faq-plan")(vars)];
  if (vars.areaAr) items.push(pick(UNIT_FAQ_AREA_BANK, seed, "faq-area")(vars));
  if (vars.siblingCount > 0) {
    items.push({
      q: `هل فيه وحدات تانية بديلة في ${vars.projectName}؟`,
      a: `نعم، فيه ${vars.siblingCount} وحدة تانية متاحة حاليًا في نفس المشروع بمساحات وأسعار مختلفة — تقدر تشوفهم في قسم "بدائل قريبة" تحت.`,
    });
  }
  return items;
}

// Same title as the app (src/lib/unitTitle.ts) so Google sees one title before and after
// JavaScript runs. Bedrooms appear only when the field is really a bedroom count.
function bedroomsLabel(raw) {
  const match = String(raw || "").match(/(\d+)\s*(?:bed|br\b|bedroom|غرف|غرفة)/i) || String(raw || "").trim().match(/^(\d+)(?:\.0+)?$/);
  const count = match ? Number(match[1]) : 0;
  if (!count || count > 12) return "";
  if (count === 1) return "غرفة نوم";
  if (count === 2) return "غرفتين نوم";
  return count <= 10 ? `${count} غرف نوم` : `${count} غرفة نوم`;
}

function unitTitle(unitType, bedroomsRaw, areaSqm, projectName) {
  // Skip when the type already says it ("1 Bedroom", "4BD", "CLEO 3B") or is a studio.
  const beds = /ستوديو|studio|غرف|غرفة|\d\s*(?:b|bd|br|bed|bedrooms?)\b/i.test(unitType) ? "" : bedroomsLabel(bedroomsRaw);
  const area = Number(areaSqm) > 0 ? ` ${Number(areaSqm)} م²` : "";
  return `${unitType}${beds ? ` ${beds}` : ""}${area} في ${projectName} | Tycoons`;
}

function renderUnitStatic(shell, unit, project, siblings = [], { indexable = true } = {}) {
  const canonical = `${SITE_URL}${unitPath({ ...unit, project_slug: project.slug })}`;
  const projectUrl = `${SITE_URL}/projects/${project.slug}`;
  const unitType = arabicField(unit.unit_type);
  const bedrooms = arabicField(unit.bedrooms_text);
  const title = unitTitle(unitType, unit.bedrooms_text, unit.area_sqm, text(unit.project_name));
  const area = areaInfo(unit.location || project.location);
  const areaPath = `/ar/areas/${area.slug}`;
  const developerPath = `/ar/developers/${slugify(project.developer)}`;
  const entityNavigation = `<nav aria-label="Breadcrumb" class="mx-auto flex max-w-7xl flex-wrap gap-3 px-5 py-3"><a href="/">الرئيسية</a><a href="${areaPath}">${escapeHtml(area.ar)}</a><a href="${developerPath}">${escapeHtml(project.developer)}</a><a href="/projects/${escapeHtml(project.slug)}">${escapeHtml(unit.project_name)}</a></nav>`;
  const stats = unitStats(unit, siblings);
  const rank = rankClause(stats);
  const introVars = {
    unitType,
    area: numberValue(unit.area_sqm),
    projectName: text(unit.project_name),
    developer: text(unit.developer),
    areaAr: area.ar,
    price: formatPrice(unit.starting_price),
    delivery: arabicField(unit.delivery_text) || "حسب جدول المطور",
    installments: arabicField(unit.installments_text) || "حسب عرض المطور",
    finishing: arabicField(unit.finishing) || "حسب المطور",
    rank,
    buyerNote: area.facts.buyerNote,
    siblingCount: stats.siblingCount,
  };
  const description = `${unitType} في ${text(unit.project_name)} بسعر يبدأ من ${formatPrice(unit.starting_price)} جنيه. اعرف المساحة وخطة السداد والتشطيب.`;
  const intro = pick(UNIT_INTRO_BANK, unit.id, "intro")(introVars);
  const ownImages = urls(unit.image_url, unit.gallery_urls);
  // Media is uploaded per project; a unit without its own photos shows its project's gallery.
  const imageList = ownImages.length ? ownImages : urls(project.image_url, project.gallery_urls);
  const faqItems = renderUnitFaq(introVars, unit.id);
  const alternates = siblings
    .slice()
    .sort((a, b) => Math.abs(numberValue(a.starting_price) - numberValue(unit.starting_price)) - Math.abs(numberValue(b.starting_price) - numberValue(unit.starting_price)))
    .slice(0, 4);
  const body = `<main dir="rtl" class="min-h-screen bg-[#f7f2ea] text-[#1b2420]"><header class="bg-[#0d1f18] px-5 py-5 text-white"><nav class="mx-auto flex max-w-7xl justify-between"><a href="/" class="font-extrabold">TYCOONS INVESTMENTS</a><a href="/projects/${escapeHtml(project.slug)}">${escapeHtml(unit.project_name)}</a></nav></header><section class="bg-[#0d1f18] px-5 pb-12 pt-16 text-white"><div class="mx-auto max-w-7xl"><p class="text-[#d9b87c]">${escapeHtml(unit.developer)} · ${escapeHtml(unit.location)}</p><h1 class="mt-5 text-4xl font-extrabold sm:text-5xl">${escapeHtml(unitType)} ${escapeHtml(unit.area_sqm)} م² في ${escapeHtml(unit.project_name)}${isNewUnit(unit) ? NEW_TAG : ""}</h1>${arDate(unit.created_at) || arDate(unit.last_updated_at) ? `<p class="mt-4 text-sm text-[#d8c9a8]">${[arDate(unit.created_at) ? `اتضافت على الموقع ${escapeHtml(arDate(unit.created_at))}` : "", arDate(unit.last_updated_at) ? `آخر تحديث للسعر ${escapeHtml(arDate(unit.last_updated_at))}` : ""].filter(Boolean).join(" · ")}</p>` : ""}</div></section>${imageList[0] ? `<section class="bg-[#0d1f18] px-5 pb-12"><img src="${escapeHtml(imageList[0])}" alt="${escapeHtml(title)}" width="1280" height="720" fetchpriority="high" class="mx-auto aspect-[16/8] w-full max-w-7xl rounded-3xl object-contain"></section>` : ""}<section class="mx-auto max-w-7xl px-5 py-16"><div class="grid gap-8 lg:grid-cols-[1fr_0.75fr]"><article><h2 class="text-3xl font-extrabold">تفاصيل الوحدة</h2><p class="mt-5 leading-loose text-[#5c6a62]">${escapeHtml(intro)}</p><dl class="mt-8 grid gap-4 sm:grid-cols-2"><div class="rounded-2xl border bg-white p-5"><dt>المساحة</dt><dd class="font-bold">${escapeHtml(unit.area_sqm)} م²</dd></div><div class="rounded-2xl border bg-white p-5"><dt>التشطيب</dt><dd class="font-bold">${escapeHtml(arabicField(unit.finishing))}</dd></div><div class="rounded-2xl border bg-white p-5"><dt>السداد</dt><dd class="font-bold">${escapeHtml(arabicField(unit.installments_text))}</dd></div><div class="rounded-2xl border bg-white p-5"><dt>الاستلام</dt><dd class="font-bold">${escapeHtml(arabicField(unit.delivery_text))}</dd></div></dl>
  <section class="mt-12"><h2 class="text-2xl font-extrabold">عن ${escapeHtml(area.ar)}</h2><p class="mt-4 leading-loose text-[#5c6a62]">${escapeHtml(area.facts.context)}</p><p class="mt-3 leading-loose text-[#5c6a62]">${escapeHtml(area.facts.buyerNote)}</p></section>
  ${alternates.length ? `<section class="mt-12"><h2 class="text-2xl font-extrabold">بدائل قريبة داخل ${escapeHtml(unit.project_name)}</h2><div class="mt-5 overflow-x-auto"><table class="w-full min-w-[420px] border-collapse text-sm"><thead><tr class="border-b border-[#e0d3bb] text-right"><th class="py-2">النوع</th><th class="py-2">المساحة</th><th class="py-2">السعر</th><th class="py-2"></th></tr></thead><tbody>${alternates.map((sibling) => `<tr class="border-b border-[#efe7d8]"><td class="py-2">${escapeHtml(arabicField(sibling.unit_type))} ${escapeHtml(arabicField(sibling.bedrooms_text))}</td><td class="py-2">${escapeHtml(sibling.area_sqm)} م²</td><td class="py-2">${formatPrice(sibling.starting_price)} جنيه</td><td class="py-2"><a href="${escapeHtml(unitPath({ ...sibling, project_slug: project.slug }))}" class="font-bold text-[#8a6630]">التفاصيل</a></td></tr>`).join("")}</tbody></table></div></section>` : ""}
  <section class="mt-12"><h2 class="text-2xl font-extrabold">أسئلة شائعة</h2>${faqItems.map((item) => `<details class="mt-4 rounded-2xl border border-[#e7ddc8] bg-white/70 p-5"><summary class="font-bold">${escapeHtml(item.q)}</summary><p class="mt-3 text-[#5c6a62]">${escapeHtml(item.a)}</p></details>`).join("")}</section>
  </article><aside class="rounded-3xl bg-[#0d1f18] p-7 text-white"><p>السعر يبدأ من</p><p class="mt-2 text-3xl font-extrabold text-[#ecd9ae]">${formatPrice(unit.starting_price)} جنيه</p><a href="https://wa.me/201110100025" class="mt-6 inline-block rounded-full bg-[#1faa59] px-6 py-3 font-bold">تأكيد السعر والمتاح</a><br><a href="/projects/${escapeHtml(project.slug)}" class="mt-6 inline-block text-[#d9b87c]">شوف المشروع بالكامل</a></aside></div></section></main>`;
  const schemas = [
    {
      "@type": "RealEstateListing",
      "@id": `${canonical}#listing`,
      url: canonical,
      name: `${unitType} في ${unit.project_name}`,
      description,
      image: imageList,
      ...(unit.created_at ? { datePosted: unit.created_at } : {}),
      dateModified: unit.last_updated_at,
      offers: { "@type": "Offer", price: numberValue(unit.starting_price), priceCurrency: "EGP", availability: "https://schema.org/InStock" },
      accommodation: { "@type": "Accommodation", floorSize: { "@type": "QuantitativeValue", value: numberValue(unit.area_sqm), unitCode: "MTK" } },
    },
    {
      "@type": "FAQPage",
      "@id": `${canonical}#faq`,
      mainEntity: faqItems.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "الرئيسية", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: area.ar, item: `${SITE_URL}${areaPath}` },
        { "@type": "ListItem", position: 3, name: project.developer, item: `${SITE_URL}${developerPath}` },
        { "@type": "ListItem", position: 4, name: unit.project_name, item: projectUrl },
        { "@type": "ListItem", position: 5, name: unitType, item: canonical },
      ],
    },
  ];
  return pageShell(shell, {
    title,
    description,
    canonical,
    image: imageList[0] || "",
    keywords: [],
    schemas,
    body: body.replace("<main ", `${entityNavigation}<main `),
    robots: indexable
      ? "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"
      : "noindex,follow",
  });
}

// The newest article written in the admin for this project, in full on the project page
// (its /guides/ URL points its canonical here).
function embeddedArticleHtml(guide) {
  if (!guide || !guide.body_markdown || !guide.title) return "";
  const takeaways = (Array.isArray(guide.key_takeaways) ? guide.key_takeaways : []).map((item) => String(item || "").trim()).filter(Boolean).slice(0, 6);
  const reviewed = guide.reviewed_at ? new Intl.DateTimeFormat("ar-EG-u-nu-latn", { year: "numeric", month: "long", day: "numeric" }).format(new Date(guide.reviewed_at)) : "";
  return `<section class="mt-14" id="article"><p class="text-sm font-bold text-[#a3854e]">دليل Tycoons — تمت مراجعته قبل النشر</p><h2 class="mt-2 text-3xl font-extrabold">${escapeHtml(guide.title)}</h2>${guide.excerpt ? `<p class="mt-4 text-lg leading-loose text-[#5c6a62]">${escapeHtml(guide.excerpt)}</p>` : ""}${takeaways.length ? `<div class="mt-6 rounded-2xl border border-[#e7ddc8] bg-[#fffaf1] p-5"><h3 class="text-xl font-extrabold">الخلاصة</h3><ul class="mt-3 list-disc ps-6 leading-loose">${takeaways.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>` : ""}<div class="guide-body">${renderSafeMarkdown(publicEditorialMarkdown(guide.body_markdown, true))}</div>${reviewed ? `<p class="mt-6 text-sm text-[#5c6a62]">آخر مراجعة: ${escapeHtml(reviewed)}${guide.reviewed_by_name ? ` — ${escapeHtml(guide.reviewed_by_name)}` : ""}</p>` : ""}</section>`;
}

// Short developer introduction (Supabase developers.about_ar) with a link to all its projects.
function developerAboutHtml(project) {
  const info = developerInfo(project.developer);
  if (!info || !info.about_ar) return "";
  return `<section class="mt-14"><h2 class="text-2xl font-extrabold">عن المطور: ${escapeHtml(info.name_ar || info.name)}</h2><p class="mt-4 leading-loose text-[#5c6a62]">${escapeHtml(info.about_ar)}</p><a class="mt-3 inline-block font-bold text-[#a3854e] underline" href="/ar/developers/${escapeHtml(info.slug)}">كل مشاريع ${escapeHtml(info.name_ar || info.name)}</a></section>`;
}

// When the project page has its own written guide (which covers the developer), keep only
// the link to the developer's other projects instead of repeating the bio.
function developerLinkHtml(project) {
  const info = developerInfo(project.developer);
  if (!info) return "";
  return `<p class="mt-10"><a class="font-bold text-[#a3854e] underline" href="/ar/developers/${escapeHtml(info.slug || slugify(project.developer))}">كل مشاريع ${escapeHtml(info.name_ar || info.name)}</a></p>`;
}

// Published buyer-question guides about the project, linked right under its FAQ.
function buyerQuestionsHtml(project, guides) {
  const list = (Array.isArray(guides) ? guides : []).filter((guide) => guide && guide.slug && guide.title).slice(0, 12);
  if (!list.length) return "";
  return `<section class="mt-10"><h2 class="text-2xl font-extrabold">عايز تفاصيل أكتر؟ أسئلة المشترين عن ${escapeHtml(project.name)}</h2><ul class="mt-6 space-y-3">${list.map((guide) => `<li><a class="block rounded-2xl border border-[#e0d3bb] bg-white p-5 font-extrabold" href="${guide.language === "en" ? `/en/guides/${escapeHtml(guide.slug)}/` : `/guides/${escapeHtml(guide.slug)}/`}">${escapeHtml(guide.title)}</a>${guide.excerpt ? `<p class="mt-1 text-sm text-[#5c6a62]">${escapeHtml(guide.excerpt)}</p>` : ""}</li>`).join("")}</ul></section>`;
}

module.exports = {
  arabicField, unitTitle, unitPath, renderProjectStatic, renderUnitStatic, escapeHtml, pageShell };
