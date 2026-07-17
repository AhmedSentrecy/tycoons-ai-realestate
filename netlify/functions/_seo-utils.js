"use strict";

const SITE_URL = "https://tycoons-inv.de";
const WHATSAPP_NUMBER = "201200704344";
const SUPABASE_URL = process.env.SUPABASE_URL || "https://coqnjymekrkoausiiytm.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvcW5qeW1la3Jrb2F1c2lpeXRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MDg3NjYsImV4cCI6MjA5NzM4NDc2Nn0.EIaGjkVORMuHelyUuMIA8EinAIlyY84sqQpgnEjPxEY";

const CACHE_HEADERS = {
  "cache-control": "public, max-age=0, s-maxage=900, stale-while-revalidate=86400",
  "content-language": "ar, en",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
};

const AREAS = [
  { slug: "new-cairo", ar: "التجمع والقاهرة الجديدة", en: "New Cairo", match: /new cairo|القاهره الجديده|القاهرة الجديدة|التجمع|fifth settlement/i },
  { slug: "north-coast", ar: "الساحل الشمالي", en: "North Coast", match: /north coast|الساحل|راس الحكمه|رأس الحكمة|ras el|sidi abdel|العلمين/i },
  { slug: "ain-sokhna", ar: "العين السخنة", en: "Ain Sokhna", match: /sokhna|السخنه|السخنة|galala|الجلاله|الجلالة/i },
  { slug: "sheikh-zayed", ar: "الشيخ زايد", en: "Sheikh Zayed", match: /sheikh zayed|el sheikh zayed|الشيخ زايد|زايد/i },
  { slug: "new-capital", ar: "العاصمة الإدارية الجديدة", en: "New Capital", match: /new capital|administrative capital|العاصمه|العاصمة/i },
  { slug: "mostakbal-city", ar: "مستقبل سيتي", en: "Mostakbal City", match: /mostakbal|مستقبل/i },
  { slug: "october", ar: "السادس من أكتوبر", en: "6th of October", match: /6th of october|october|اكتوبر|أكتوبر/i },
  { slug: "new-alamein", ar: "العلمين الجديدة", en: "New Alamein", match: /new alamein|العلمين الجديده|العلمين الجديدة/i },
];

function normalize(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .toLowerCase()
    .trim();
}

function slugify(value) {
  return normalize(value)
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-") || "property";
}

function projectSlug(projectName, developer) {
  const name = slugify(projectName);
  const dev = slugify(developer);
  return dev && dev !== "property" ? `${name}--${dev}` : name;
}

function areaFor(location) {
  const text = normalize(location);
  return AREAS.find((area) => area.match.test(text)) || {
    slug: slugify(location),
    ar: String(location || "مناطق مصر العقارية"),
    en: String(location || "Egypt real estate areas"),
    match: null,
  };
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function jsonLd(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function cleanText(value, fallback = "—") {
  const out = String(value || "").replace(/\s+/g, " ").trim();
  return out || fallback;
}

function numberValue(value) {
  const n = Number(String(value == null ? "" : value).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function formatPrice(value, lang) {
  const n = numberValue(value);
  if (!n) return lang === "ar" ? "السعر عند الطلب" : "Price on request";
  return `${new Intl.NumberFormat(lang === "ar" ? "ar-EG" : "en-US", { maximumFractionDigits: 0 }).format(n)} ${lang === "ar" ? "جنيه" : "EGP"}`;
}

function formatDate(value, lang) {
  if (!value) return lang === "ar" ? "غير محدد" : "Not specified";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return cleanText(value);
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-GB", {
    year: "numeric", month: "long", day: "numeric",
  }).format(d);
}

function isPublishedUnit(unit) {
  const status = normalize(unit.availability_status || unit.status);
  const rejected = ["review_only", "not_confirmed", "not confirmed", "غير مؤكد", "sold", "sold_out", "مباع"];
  return cleanText(unit.project_name || unit.compound || "", "") &&
    numberValue(unit.starting_price) > 0 &&
    !rejected.some((item) => status === normalize(item));
}

async function fetchUnits() {
  const columns = [
    "project_name", "developer", "location", "unit_type", "bedrooms_text", "area_sqm",
    "starting_price", "down_payment_text", "installments_text", "delivery_text", "finishing",
    "availability_status", "description", "image_url", "created_at", "last_updated_at",
    "brochure_url", "video_url", "gallery_urls",
  ].join(",");
  const allUnits = [];
  const pageSize = 1000;

  for (let page = 0; page < 5; page += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const offset = page * pageSize;
      const url = `${SUPABASE_URL}/rest/v1/units?select=${columns}&limit=${pageSize}&offset=${offset}&order=last_updated_at.desc.nullslast`;
      const response = await fetch(url, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Accept: "application/json",
        },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Supabase units request failed with ${response.status}`);
      const batch = await response.json();
      if (!Array.isArray(batch)) break;
      allUnits.push(...batch);
      if (batch.length < pageSize) break;
    } finally {
      clearTimeout(timeout);
    }
  }
  return allUnits.filter(isPublishedUnit);
}

function groupProjects(units) {
  const map = new Map();
  for (const unit of units) {
    const name = cleanText(unit.project_name || unit.compound, "");
    if (!name) continue;
    const developer = cleanText(unit.developer, "Tycoons verified developer");
    const slug = projectSlug(name, developer);
    if (!map.has(slug)) map.set(slug, { slug, name, developer, units: [] });
    map.get(slug).units.push(unit);
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function projectLocation(project) {
  return cleanText(project.units.find((unit) => unit.location)?.location, "Egypt");
}

function projectImage(project) {
  return cleanText(project.units.find((unit) => unit.image_url)?.image_url, "");
}

function projectLastUpdated(project) {
  const dates = project.units
    .map((unit) => new Date(unit.last_updated_at || unit.created_at || ""))
    .filter((date) => !Number.isNaN(date.getTime()));
  if (!dates.length) return null;
  return new Date(Math.max(...dates.map((date) => date.getTime()))).toISOString();
}

function projectMinPrice(project) {
  const values = project.units.map((unit) => numberValue(unit.starting_price)).filter((value) => value > 0);
  return values.length ? Math.min(...values) : 0;
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": ["Organization", "RealEstateAgent"],
    name: "Tycoons Investments",
    url: SITE_URL,
    telephone: `+${WHATSAPP_NUMBER}`,
    areaServed: { "@type": "Country", name: "Egypt" },
  };
}

function breadcrumbSchema(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

function nav(lang) {
  const ar = lang === "ar";
  return `<header class="site-header">
    <a class="brand" href="${ar ? "/" : "/en/"}">TYCOONS <span>INVESTMENTS</span></a>
    <nav aria-label="${ar ? "التنقل الرئيسي" : "Main navigation"}">
      <a href="${ar ? "/" : "/en/"}">${ar ? "البحث الذكي" : "AI search"}</a>
      <a href="${ar ? "/ar/areas/new-cairo" : "/en/areas/new-cairo"}">${ar ? "التجمع" : "New Cairo"}</a>
      <a href="${ar ? "/ar/areas/north-coast" : "/en/areas/north-coast"}">${ar ? "الساحل" : "North Coast"}</a>
      <a class="wa" href="https://wa.me/${WHATSAPP_NUMBER}">${ar ? "واتساب" : "WhatsApp"}</a>
    </nav>
  </header>`;
}

function footer(lang) {
  const ar = lang === "ar";
  return `<footer>
    <strong>Tycoons Investments</strong>
    <p>${ar ? "بحث عقاري ذكي في مصر ببيانات أسعار ومساحات وخطط سداد محدثة." : "AI-powered property search in Egypt with updated prices, areas and payment plans."}</p>
    <p>© 2026 Tycoons Investments</p>
  </footer>`;
}

function baseStyles() {
  return `
    :root{--navy:#11213f;--gold:#b98a46;--ink:#1b2434;--muted:#667085;--line:#e3e7ee;--warm:#f6f2e9;--bg:#f7f8fb}
    *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--ink);font-family:Inter,"IBM Plex Sans Arabic",Arial,sans-serif;line-height:1.65}
    a{color:var(--navy)}.site-header{position:sticky;top:0;z-index:10;display:flex;justify-content:space-between;align-items:center;gap:24px;padding:18px clamp(18px,5vw,68px);background:rgba(255,255,255,.96);border-bottom:1px solid var(--line)}
    .brand{text-decoration:none;font-family:Georgia,serif;font-size:21px;font-weight:800;letter-spacing:.03em}.brand span{display:block;font:8px/1.2 Arial,sans-serif;letter-spacing:.34em;color:var(--muted)}
    nav{display:flex;align-items:center;gap:18px;flex-wrap:wrap}nav a{text-decoration:none;font-weight:700}.wa,.cta{display:inline-flex;justify-content:center;align-items:center;border-radius:999px;padding:10px 18px;background:#1ea952;color:#fff;text-decoration:none;font-weight:800}
    main{width:min(1120px,calc(100% - 32px));margin:auto;padding:34px 0 70px}.crumbs{font-size:13px;color:var(--muted);margin:0 0 22px}.crumbs a{text-decoration:none;color:var(--muted)}
    .hero{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(280px,.65fr);gap:26px;align-items:stretch}.hero-copy,.panel,.card,.table-wrap,.faq{background:#fff;border:1px solid var(--line);border-radius:24px;box-shadow:0 12px 32px rgba(17,33,63,.06)}
    .hero-copy{padding:clamp(24px,5vw,54px)}.eyebrow{color:var(--gold);font-weight:900;font-size:13px;text-transform:uppercase;letter-spacing:.08em}h1{margin:10px 0 16px;font-size:clamp(30px,5vw,54px);line-height:1.12;color:var(--navy)}h2{margin:42px 0 16px;color:var(--navy);font-size:clamp(24px,3vw,34px)}h3{color:var(--navy)}.lead{font-size:18px;color:var(--muted)}
    .panel{padding:26px;background:linear-gradient(145deg,#fff,var(--warm))}.price{font-size:30px;color:var(--navy);font-weight:900}.facts{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin:18px 0}.fact{padding:12px;background:#fff;border:1px solid var(--line);border-radius:14px}.fact small{display:block;color:var(--muted)}
    .hero-image{width:100%;max-height:460px;object-fit:cover;border-radius:24px;margin-top:24px;background:#e9edf3}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.card{padding:20px;text-decoration:none;transition:.18s transform}.card:hover{transform:translateY(-3px)}.card img{width:100%;height:170px;object-fit:cover;border-radius:16px;background:#edf0f5}.card p{margin:6px 0;color:var(--muted)}
    .table-wrap{overflow:auto}.units{width:100%;border-collapse:collapse;min-width:760px}.units th,.units td{padding:14px 16px;border-bottom:1px solid var(--line);text-align:start}.units th{background:var(--warm);color:var(--navy)}.units tr:last-child td{border-bottom:0}.status{color:#137a3b;font-weight:800}.faq{padding:26px}.faq details{border-bottom:1px solid var(--line);padding:14px 0}.faq details:last-child{border-bottom:0}.faq summary{cursor:pointer;color:var(--navy);font-weight:800}
    footer{padding:42px clamp(18px,5vw,68px);background:var(--navy);color:#fff}footer p{color:rgba(255,255,255,.72);max-width:720px}.updated{font-size:13px;color:var(--muted);margin-top:18px}
    @media(max-width:800px){.site-header{align-items:flex-start;flex-direction:column}nav{gap:10px}.hero{grid-template-columns:1fr}.grid{grid-template-columns:1fr}.facts{grid-template-columns:1fr}main{padding-top:22px}}
  `;
}

function renderPage({ lang, title, description, path, alternatePath, body, schemas = [], image = "", robots = "index,follow,max-image-preview:large" }) {
  const ar = lang === "ar";
  const canonical = `${SITE_URL}${path}`;
  const alternate = `${SITE_URL}${alternatePath}`;
  const allSchemas = [organizationSchema(), ...schemas];
  return `<!doctype html>
<html lang="${lang}" dir="${ar ? "rtl" : "ltr"}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="robots" content="${robots}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <link rel="alternate" hreflang="ar-EG" href="${escapeHtml(ar ? canonical : alternate)}">
  <link rel="alternate" hreflang="en" href="${escapeHtml(ar ? alternate : canonical)}">
  <link rel="alternate" hreflang="x-default" href="${escapeHtml(ar ? canonical : alternate)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Tycoons Investments">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:locale" content="${ar ? "ar_EG" : "en_US"}">
  ${image ? `<meta property="og:image" content="${escapeHtml(image)}">` : ""}
  <meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}">
  ${allSchemas.map((schema) => `<script type="application/ld+json">${jsonLd(schema)}</script>`).join("\n  ")}
  <style>${baseStyles()}</style>
</head>
<body>
  ${nav(lang)}
  ${body}
  ${footer(lang)}
</body>
</html>`;
}

function breadcrumbsHtml(items, lang) {
  const sep = lang === "ar" ? " ‹ " : " › ";
  return `<p class="crumbs">${items.map((item) => `<a href="${item.path}">${escapeHtml(item.name)}</a>`).join(sep)}</p>`;
}

function projectCards(projects, lang) {
  const ar = lang === "ar";
  return `<div class="grid">${projects.map((project) => {
    const path = `/${lang}/projects/${project.slug}`;
    const location = projectLocation(project);
    const image = projectImage(project);
    return `<a class="card" href="${path}">
      ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(`${project.name} ${location}`)}" loading="lazy" width="640" height="360">` : ""}
      <h3>${escapeHtml(project.name)}</h3>
      <p>${escapeHtml(project.developer)} · ${escapeHtml(location)}</p>
      <strong>${ar ? "يبدأ من" : "Starting from"} ${escapeHtml(formatPrice(projectMinPrice(project), lang))}</strong>
    </a>`;
  }).join("")}</div>`;
}

function renderProjectPage(projects, slug, lang) {
  const project = projects.find((item) => item.slug === slug);
  if (!project) return null;
  const ar = lang === "ar";
  const location = projectLocation(project);
  const area = areaFor(location);
  const minPrice = projectMinPrice(project);
  const updated = projectLastUpdated(project);
  const image = projectImage(project);
  const path = `/${lang}/projects/${project.slug}`;
  const alternatePath = `/${ar ? "en" : "ar"}/projects/${project.slug}`;
  const description = ar
    ? `${project.name} من ${project.developer} في ${location}. أسعار تبدأ من ${formatPrice(minPrice, "ar")} مع المساحات وخطط السداد والاستلام المحدثة.`
    : `${project.name} by ${project.developer} in ${location}. Prices start from ${formatPrice(minPrice, "en")}, with updated areas, payment plans and delivery details.`;
  const units = uniqueBy(project.units, (unit) => [unit.unit_type, unit.bedrooms_text, unit.area_sqm, unit.starting_price].join("|"))
    .sort((a, b) => numberValue(a.starting_price) - numberValue(b.starting_price))
    .slice(0, 60);
  const whatsappText = encodeURIComponent(ar
    ? `مهتم بمشروع ${project.name} من ${project.developer}. محتاج أحدث الأسعار والوحدات المتاحة.`
    : `I am interested in ${project.name} by ${project.developer}. Please send the latest prices and availability.`);
  const faqs = ar ? [
    { q: `ما هي أسعار ${project.name}؟`, a: `تبدأ الأسعار الموثقة حاليًا من ${formatPrice(minPrice, "ar")}. السعر النهائي يختلف حسب نوع الوحدة والمساحة وخطة السداد.` },
    { q: `أين يقع مشروع ${project.name}؟`, a: `يقع المشروع في ${location}.` },
    { q: `ما هي الوحدات المتاحة في ${project.name}؟`, a: `توضح الجداول الحالية أنواع الوحدات والمساحات والأسعار المتاحة حسب آخر تحديث للبيانات.` },
  ] : [
    { q: `What are the prices in ${project.name}?`, a: `Verified prices currently start from ${formatPrice(minPrice, "en")}. Final prices vary by unit type, area and payment plan.` },
    { q: `Where is ${project.name} located?`, a: `The project is located in ${location}.` },
    { q: `Which units are available in ${project.name}?`, a: `The current tables show available unit types, areas and starting prices based on the latest data update.` },
  ];
  const related = projects.filter((item) => item.slug !== project.slug && areaFor(projectLocation(item)).slug === area.slug).slice(0, 6);
  const crumbs = [
    { name: ar ? "الرئيسية" : "Home", path: ar ? "/" : "/en/" },
    { name: ar ? area.ar : area.en, path: `/${lang}/areas/${area.slug}` },
    { name: project.name, path },
  ];
  const body = `<main>
    ${breadcrumbsHtml(crumbs, lang)}
    <section class="hero">
      <div class="hero-copy">
        <span class="eyebrow">${escapeHtml(project.developer)} · ${escapeHtml(location)}</span>
        <h1>${escapeHtml(project.name)}</h1>
        <p class="lead">${escapeHtml(description)}</p>
        ${image ? `<img class="hero-image" src="${escapeHtml(image)}" alt="${escapeHtml(`${project.name} by ${project.developer}`)}" width="960" height="540" fetchpriority="high">` : ""}
        <p class="updated">${ar ? "آخر تحديث للبيانات" : "Data last updated"}: ${escapeHtml(formatDate(updated, lang))}</p>
      </div>
      <aside class="panel">
        <span>${ar ? "الأسعار تبدأ من" : "Prices start from"}</span>
        <div class="price">${escapeHtml(formatPrice(minPrice, lang))}</div>
        <div class="facts">
          <div class="fact"><small>${ar ? "المطور" : "Developer"}</small><strong>${escapeHtml(project.developer)}</strong></div>
          <div class="fact"><small>${ar ? "الموقع" : "Location"}</small><strong>${escapeHtml(location)}</strong></div>
          <div class="fact"><small>${ar ? "عدد الخيارات" : "Current options"}</small><strong>${units.length}</strong></div>
          <div class="fact"><small>${ar ? "حالة البيانات" : "Data status"}</small><strong>${ar ? "وحدات مؤكدة" : "Confirmed units"}</strong></div>
        </div>
        <a class="cta" href="https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappText}">${ar ? "اطلب أحدث Availability" : "Request latest availability"}</a>
      </aside>
    </section>

    <h2>${ar ? `الوحدات المتاحة في ${project.name}` : `Available units in ${project.name}`}</h2>
    <div class="table-wrap"><table class="units">
      <thead><tr><th>${ar ? "نوع الوحدة" : "Unit type"}</th><th>${ar ? "غرف / مساحة" : "Beds / size"}</th><th>${ar ? "السعر يبدأ من" : "Starting price"}</th><th>${ar ? "المقدم" : "Down payment"}</th><th>${ar ? "التقسيط" : "Installments"}</th><th>${ar ? "الاستلام" : "Delivery"}</th></tr></thead>
      <tbody>${units.map((unit) => `<tr>
        <td><strong>${escapeHtml(cleanText(unit.unit_type))}</strong></td>
        <td>${escapeHtml(cleanText(unit.bedrooms_text))}${unit.area_sqm ? ` · ${escapeHtml(unit.area_sqm)} m²` : ""}</td>
        <td>${escapeHtml(formatPrice(unit.starting_price, lang))}</td>
        <td>${escapeHtml(cleanText(unit.down_payment_text))}</td>
        <td>${escapeHtml(cleanText(unit.installments_text))}</td>
        <td>${escapeHtml(cleanText(unit.delivery_text))}</td>
      </tr>`).join("")}</tbody>
    </table></div>

    <h2>${ar ? "أسئلة شائعة" : "Frequently asked questions"}</h2>
    <section class="faq">${faqs.map((faq) => `<details><summary>${escapeHtml(faq.q)}</summary><p>${escapeHtml(faq.a)}</p></details>`).join("")}</section>
    ${related.length ? `<h2>${ar ? `مشاريع مشابهة في ${area.ar}` : `Similar projects in ${area.en}`}</h2>${projectCards(related, lang)}` : ""}
  </main>`;
  const schemas = [
    breadcrumbSchema(crumbs),
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: project.name,
      description,
      url: `${SITE_URL}${path}`,
      dateModified: updated || undefined,
      about: { "@type": "Place", name: location },
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: units.length,
        itemListElement: units.slice(0, 20).map((unit, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: `${cleanText(unit.unit_type)} ${cleanText(unit.area_sqm, "")} ${project.name}`.trim(),
        })),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.q,
        acceptedAnswer: { "@type": "Answer", text: faq.a },
      })),
    },
  ];
  return renderPage({ lang, title: `${project.name} | ${project.developer} | Tycoons Investments`, description, path, alternatePath, body, schemas, image });
}

function renderCollectionPage(projects, kind, slug, lang) {
  const ar = lang === "ar";
  let matches = [];
  let label = "";
  if (kind === "area") {
    const area = AREAS.find((item) => item.slug === slug) || { slug, ar: slug, en: slug };
    label = ar ? area.ar : area.en;
    matches = projects.filter((project) => areaFor(projectLocation(project)).slug === slug);
  } else {
    matches = projects.filter((project) => slugify(project.developer) === slug);
    label = matches[0]?.developer || slug;
  }
  if (!matches.length) return null;
  matches.sort((a, b) => projectMinPrice(a) - projectMinPrice(b));
  const path = `/${lang}/${kind === "area" ? "areas" : "developers"}/${slug}`;
  const alternatePath = `/${ar ? "en" : "ar"}/${kind === "area" ? "areas" : "developers"}/${slug}`;
  const title = kind === "area"
    ? (ar ? `مشاريع ${label} وأسعار الوحدات | Tycoons Investments` : `${label} projects and property prices | Tycoons Investments`)
    : (ar ? `مشاريع ${label} وأسعار الوحدات | Tycoons Investments` : `${label} projects and prices | Tycoons Investments`);
  const description = ar
    ? `قارن ${matches.length} مشروع في ${label} بالأسعار المحدثة والمساحات وخطط الدفع والاستلام.`
    : `Compare ${matches.length} projects in ${label} with updated prices, areas, payment plans and delivery details.`;
  const crumbs = [
    { name: ar ? "الرئيسية" : "Home", path: ar ? "/" : "/en/" },
    { name: label, path },
  ];
  const body = `<main>
    ${breadcrumbsHtml(crumbs, lang)}
    <section class="hero-copy">
      <span class="eyebrow">${kind === "area" ? (ar ? "استكشف بالمنطقة" : "Explore by area") : (ar ? "استكشف بالمطور" : "Explore by developer")}</span>
      <h1>${escapeHtml(title.replace(" | Tycoons Investments", ""))}</h1>
      <p class="lead">${escapeHtml(description)}</p>
      <p class="updated">${ar ? "الصفحة تعرض الوحدات المؤكدة فقط من قاعدة بيانات Tycoons Investments." : "This page shows confirmed inventory only from the Tycoons Investments database."}</p>
    </section>
    <h2>${ar ? "المشاريع المتاحة" : "Available projects"}</h2>
    ${projectCards(matches, lang)}
  </main>`;
  const schemas = [
    breadcrumbSchema(crumbs),
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: title,
      description,
      url: `${SITE_URL}${path}`,
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: matches.length,
        itemListElement: matches.map((project, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: project.name,
          url: `${SITE_URL}/${lang}/projects/${project.slug}`,
        })),
      },
    },
  ];
  return renderPage({ lang, title, description, path, alternatePath, body, schemas, image: projectImage(matches[0]) });
}

function renderDirectoryPage(projects, lang) {
  const ar = lang === "ar";
  const path = `/${lang}/`;
  const alternatePath = `/${ar ? "en" : "ar"}/`;
  const newest = [...projects].sort((a, b) => String(projectLastUpdated(b)).localeCompare(String(projectLastUpdated(a)))).slice(0, 12);
  const availableAreas = uniqueBy(projects.map((project) => areaFor(projectLocation(project))), (area) => area.slug).slice(0, 12);
  const title = ar ? "مشاريع عقارية في مصر بالأسعار المحدثة | Tycoons Investments" : "Egypt real estate projects with updated prices | Tycoons Investments";
  const description = ar ? "اكتشف مشاريع التجمع والساحل والشيخ زايد والسخنة والعاصمة مع أحدث الأسعار والمساحات وخطط السداد." : "Explore New Cairo, North Coast, Sheikh Zayed, Ain Sokhna and New Capital projects with updated prices and payment plans.";
  const body = `<main>
    <section class="hero-copy">
      <span class="eyebrow">Tycoons Investments</span>
      <h1>${ar ? "دليل المشاريع العقارية المحدث في مصر" : "Updated Egypt real estate project directory"}</h1>
      <p class="lead">${escapeHtml(description)}</p>
      <a class="cta" href="${ar ? "/#tc-console" : "/#tc-console"}">${ar ? "ابدأ البحث الذكي" : "Start AI property search"}</a>
    </section>
    <h2>${ar ? "استكشف حسب المنطقة" : "Explore by area"}</h2>
    <div class="grid">${availableAreas.map((area) => `<a class="card" href="/${lang}/areas/${area.slug}"><h3>${escapeHtml(ar ? area.ar : area.en)}</h3><p>${ar ? "اعرض المشاريع والأسعار" : "View projects and prices"}</p></a>`).join("")}</div>
    <h2>${ar ? "أحدث المشاريع المحدثة" : "Recently updated projects"}</h2>
    ${projectCards(newest, lang)}
  </main>`;
  return renderPage({ lang, title, description, path, alternatePath, body, schemas: [{
    "@context": "https://schema.org", "@type": "CollectionPage", name: title, description, url: `${SITE_URL}${path}`,
  }] });
}

function notFoundPage(lang) {
  const ar = lang === "ar";
  return renderPage({
    lang,
    title: ar ? "الصفحة غير موجودة | Tycoons Investments" : "Page not found | Tycoons Investments",
    description: ar ? "الصفحة المطلوبة غير موجودة." : "The requested page could not be found.",
    path: "/404",
    alternatePath: "/404",
    robots: "noindex,follow",
    body: `<main><section class="hero-copy"><h1>${ar ? "الصفحة غير موجودة" : "Page not found"}</h1><p>${ar ? "ارجع للبحث العقاري واعرض أحدث المشاريع." : "Return to property search and explore the latest projects."}</p><a class="cta" href="/">${ar ? "العودة للرئيسية" : "Back to homepage"}</a></section></main>`,
  });
}

module.exports = {
  SITE_URL,
  CACHE_HEADERS,
  AREAS,
  slugify,
  projectSlug,
  areaFor,
  fetchUnits,
  groupProjects,
  projectLocation,
  projectLastUpdated,
  renderProjectPage,
  renderCollectionPage,
  renderDirectoryPage,
  notFoundPage,
  escapeHtml,
};
