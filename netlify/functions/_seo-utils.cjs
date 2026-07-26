"use strict";

const SITE_URL = "https://tycoons-inv.com";
const WHATSAPP_NUMBER = "201200704344";
const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://coqnjymekrkoausiiytm.supabase.co";
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_6VFTijqKQB6RD7nIsSj_JQ_eEdoibGg";

const CACHE_HEADERS = {
  "cache-control": "public, max-age=0, s-maxage=900, stale-while-revalidate=86400",
  "content-security-policy":
    "default-src 'self'; img-src 'self' https: data:; style-src 'unsafe-inline'; connect-src 'self' https://coqnjymekrkoausiiytm.supabase.co; frame-ancestors 'none'; base-uri 'self'",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-content-type-options": "nosniff",
};

const AREAS = [
  {
    slug: "new-cairo",
    ar: "القاهرة الجديدة والتجمع",
    en: "New Cairo",
    match: /new cairo|fifth settlement|القاهره الجديده|القاهرة الجديدة|التجمع/i,
  },
  {
    slug: "mostakbal-city",
    ar: "مستقبل سيتي",
    en: "Mostakbal City",
    match: /mostakbal|مستقبل/i,
  },
  {
    slug: "north-coast",
    ar: "الساحل الشمالي",
    en: "North Coast",
    match: /north coast|sahel|الساحل|ras el|راس الحكمه|رأس الحكمة|sidi abdel|العلمين/i,
  },
  {
    slug: "ain-sokhna",
    ar: "العين السخنة",
    en: "Ain Sokhna",
    match: /sokhna|السخنه|السخنة|galala|الجلاله|الجلالة/i,
  },
  {
    slug: "sheikh-zayed",
    ar: "الشيخ زايد",
    en: "Sheikh Zayed",
    match: /sheikh zayed|el sheikh zayed|الشيخ زايد|زايد/i,
  },
  {
    slug: "new-capital",
    ar: "العاصمة الإدارية الجديدة",
    en: "New Capital",
    match: /new capital|administrative capital|العاصمه|العاصمة/i,
  },
  {
    slug: "october",
    ar: "السادس من أكتوبر",
    en: "6th of October",
    match: /6th of october|october|اكتوبر|أكتوبر/i,
  },
  {
    slug: "new-alamein",
    ar: "العلمين الجديدة",
    en: "New Alamein",
    match: /new alamein|العلمين الجديده|العلمين الجديدة/i,
  },
];

const GUIDES = {
  "off-plan-buying-checklist": {
    title: "دليل شراء عقار Off-plan في مصر",
    description:
      "قائمة عملية لمراجعة المطور والعقد والسعر وخطة السداد والاستلام قبل شراء وحدة تحت الإنشاء.",
    summary:
      "قبل شراء وحدة تحت الإنشاء، راجع سجل المطور في التسليم، ملكية الأرض والتراخيص، جدول الأقساط، تعريف التأخير في العقد، مصاريف الصيانة، والمواصفات المكتوبة. قارن السعر النقدي بالقيمة الحالية للأقساط، ولا تعتبر أي عائد مستقبلي ضمانًا.",
    sections: [
      ["١. راجع المطور والمشروع", "اطلب سجل المشروعات المسلّمة، الموقف القانوني للأرض، التراخيص المتاحة، ونموذج العقد قبل دفع جدية الحجز."],
      ["٢. افهم التكلفة الكاملة", "اجمع المقدم والأقساط والدفعات السنوية والصيانة والجراج والكلوب هاوس وأي رسوم تسجيل. السعر الإعلاني وحده لا يكفي للمقارنة."],
      ["٣. ثبّت المواصفات", "المساحة ونسبة التحميل والتشطيب وموعد التسليم وفترة السماح لازم تكون مكتوبة بوضوح في العقد أو الملاحق."],
      ["٤. اختبر قدرتك على السداد", "احسب القسط تحت سيناريو دخل محافظ، واحتفظ بسيولة للطوارئ بدل الاعتماد على إعادة البيع أو الإيجار كأنه مؤكد."],
    ],
  },
  "new-capital-vs-new-cairo": {
    title: "العاصمة الإدارية أم القاهرة الجديدة؟",
    description:
      "مقارنة عملية بين العاصمة الإدارية والقاهرة الجديدة حسب السكن والسيولة وخطة السداد وأفق الاستثمار.",
    summary:
      "القاهرة الجديدة أنسب عادةً لمن يريد خدمات قائمة وطلب إيجاري أوضح وسيولة إعادة بيع أعلى نسبيًا. العاصمة قد تناسب من يقبل أفقًا أطول مقابل أسعار دخول وخطط سداد مختلفة. القرار الصحيح يعتمد على الاستخدام، توقيت التسليم، والمطور—not اسم المنطقة وحده.",
    sections: [
      ["للسكن", "قارن زمن الانتقال اليومي، المدارس والخدمات الموجودة فعلًا، وتاريخ الاستلام. لا تبنِ القرار على المخطط المستقبلي وحده."],
      ["للاستثمار", "قارن سعر الدخول بوحدة مشابهة، حجم المعروض عند الاستلام، الطلب الإيجاري المتوقع، ورسوم الصيانة والتشغيل."],
      ["لخطة السداد", "الخطة الأطول ليست دائمًا الأرخص. قارن إجمالي السعر والقيمة الحالية للدفعات وأي خصم كاش."],
      ["الخلاصة", "اختيار المطور والوحدة الدقيقة قد يكون أهم من اختيار المنطقة. استخدم نفس الميزانية ونفس توقيت التسليم في المقارنة."],
    ],
  },
  "new-cairo-property-prices": {
    title: "دليل أسعار عقارات القاهرة الجديدة",
    description:
      "طريقة قراءة أسعار القاهرة الجديدة ومقارنة الوحدات بدون الوقوع في مقارنة أرقام غير متكافئة.",
    summary:
      "سعر البداية وحده لا يصف الصفقة. للمقارنة العادلة ثبّت نوع الوحدة، المساحة، نسبة التحميل، التشطيب، التسليم، والمقدم ومدة التقسيط. بيانات Tycoons تعرض أحدث الوحدات المتاحة، لكن السعر النهائي والتوفر يُعاد تأكيدهما وقت الطلب.",
    sections: [
      ["قارن نفس نوع الوحدة", "لا تقارن شقة أرضي بحديقة ببنتهاوس أو وحدة كاملة التشطيب بأخرى Core & Shell على أساس سعر المتر فقط."],
      ["افصل السعر عن التمويل", "سعر التقسيط قد يتضمن تكلفة تمويل ضمنية. دوّن السعر الكلي وتوقيت كل دفعة قبل المقارنة."],
      ["راجع تاريخ التحديث", "السوق سريع التغيير. أي سعر بدون تاريخ تحديث أو تأكيد Availability قد يكون غير صالح للقرار."],
    ],
  },
  "payment-plan-comparison": {
    title: "إزاي تقارن خطط سداد العقارات؟",
    description:
      "منهج بسيط لمقارنة المقدم والأقساط والدفعات والتسليم والخصم النقدي.",
    summary:
      "حوّل كل خطة إلى جدول تدفقات نقدية: المقدم، الدفعات بعد التعاقد، الأقساط الدورية، الصيانة، وتاريخ التسليم. بعد كده قارن إجمالي السعر والضغط الشهري والسيولة المطلوبة قبل الاستلام. مدة أطول لا تعني تلقائيًا صفقة أفضل.",
    sections: [
      ["المقدم الحقيقي", "اجمع جدية الحجز والمقدم والدفعات المكملة قبل أول قسط."],
      ["ضغط السيولة", "احسب المتوسط الشهري، لكن راقب أيضًا الدفعات الكبيرة الموسمية أو عند الاستلام."],
      ["السعر الكلي", "قارن إجمالي سعر التقسيط بسعر الكاش وببدائل لها نفس التسليم والتشطيب."],
      ["المخاطر", "اختبر الخطة لو الدخل اتأخر أو إعادة البيع استغرقت وقتًا أطول من المتوقع."],
    ],
  },
  "real-estate-investment-egypt": {
    title: "أساسيات الاستثمار العقاري في مصر",
    description:
      "إطار قرار يقارن العائد والسيولة والمخاطر بدل الاعتماد على توقع ارتفاع الأسعار فقط.",
    summary:
      "قيّم الاستثمار من أربع زوايا: تكلفة الشراء الكاملة، دخل الإيجار الصافي، سهولة إعادة البيع، ومخاطر التنفيذ والتشغيل. افصل بين زيادة السعر الاسمية والعائد الحقيقي، واكتب افتراضاتك بوضوح قبل المقارنة.",
    sections: [
      ["العائد الصافي", "اطرح الصيانة وفترات الفراغ والتجهيز والعمولات والضرائب ذات الصلة من الإيجار المتوقع."],
      ["السيولة", "الوحدة التي تبدو أعلى عائدًا قد تستغرق وقتًا أطول في البيع. حجم الطلب ونوع الوحدة مهمان."],
      ["مخاطر التنفيذ", "في الوحدات تحت الإنشاء، سجل المطور وتوقيت التسليم وشروط العقد عناصر أساسية في العائد."],
      ["السيناريوهات", "اعمل سيناريو محافظ وأساسي ومتفائل، ولا تستخدم نتيجة واحدة كأنها ضمان."],
    ],
  },
  "north-coast-chalet-guide": {
    title: "دليل شراء شاليه في الساحل الشمالي",
    description:
      "مقارنة الموقع والإدارة والتشغيل والتأجير والتسليم قبل اختيار شاليه في الساحل.",
    summary:
      "اختيار الشاليه يبدأ من الاستخدام: شخصي، إيجار موسمي، أو حفظ قيمة. راجع المسافة من القاهرة، جودة الشاطئ والإدارة، تشغيل الخدمات، رسوم الصيانة، قواعد التأجير، وتوقيت التسليم. المشروع الأشهر ليس دائمًا الأنسب لميزانيتك.",
    sections: [
      ["الاستخدام أولًا", "عدد مرات الاستخدام ونوع العائلة يحدد المساحة والموقع داخل المشروع أكثر من اسم المشروع."],
      ["الإدارة والتشغيل", "اسأل عن الجهة المشغلة، الخدمات العاملة فعليًا، الصيانة، وقواعد التأجير وإدخال الضيوف."],
      ["الموقع داخل القرية", "المسافة للشاطئ والإطلالة والخصوصية قد تصنع فرقًا أكبر من فرق بسيط في المساحة."],
      ["العائد الموسمي", "استخدم إشغالًا محافظًا وتكاليف صيانة وتجهيز واقعية. الإيجار المتوقع ليس دخلًا مضمونًا."],
    ],
  },
};

let cache = { units: null, fetchedAt: 0 };

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
  return (
    normalize(value)
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9\u0600-\u06ff]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-") || "property"
  );
}

function projectSlug(name, developer) {
  return `${slugify(name)}--${slugify(developer)}`;
}

function areaFor(location) {
  const value = normalize(location);
  return (
    AREAS.find((area) => area.match.test(value)) || {
      slug: slugify(location),
      ar: String(location || "مصر"),
      en: String(location || "Egypt"),
    }
  );
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function numberValue(value) {
  const parsed = Number(String(value == null ? "" : value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function clean(value, fallback = "—") {
  return String(value || "").replace(/\s+/g, " ").trim() || fallback;
}

function formatPrice(value, lang) {
  const amount = numberValue(value);
  if (!amount) return lang === "ar" ? "السعر عند الطلب" : "Price on request";
  const formatted = new Intl.NumberFormat(lang === "ar" ? "ar-EG" : "en-EG", {
    maximumFractionDigits: 0,
  }).format(amount);
  return `${formatted} ${lang === "ar" ? "جنيه" : "EGP"}`;
}

function formatDate(value, lang) {
  const date = new Date(value || "");
  if (Number.isNaN(date.getTime())) return lang === "ar" ? "غير محدد" : "Not specified";
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

async function fetchUnits() {
  if (cache.units && Date.now() - cache.fetchedAt < 15 * 60 * 1000) return cache.units;
  const columns = [
    "project_name",
    "developer",
    "location",
    "unit_type",
    "bedrooms_text",
    "area_sqm",
    "starting_price",
    "down_payment_text",
    "installments_text",
    "delivery_text",
    "finishing",
    "availability_status",
    "description",
    "image_url",
    "gallery_urls",
    "brochure_url",
    "last_updated_at",
  ].join(",");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8500);
  try {
    const params = new URLSearchParams({
      select: columns,
      availability_status: "eq.available",
      order: "starting_price.asc",
      limit: "5000",
    });
    const response = await fetch(`${SUPABASE_URL}/rest/v1/units?${params}`, {
      headers: { apikey: SUPABASE_KEY, Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`inventory ${response.status}`);
    const rows = await response.json();
    if (!Array.isArray(rows) || !rows.length) throw new Error("inventory empty");
    cache = { units: rows, fetchedAt: Date.now() };
    return rows;
  } catch (error) {
    if (cache.units) return cache.units;
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function groupProjects(units) {
  const grouped = new Map();
  for (const unit of units) {
    const name = clean(unit.project_name, "");
    const developer = clean(unit.developer, "Tycoons verified developer");
    if (!name || numberValue(unit.starting_price) <= 0) continue;
    const slug = projectSlug(name, developer);
    if (!grouped.has(slug)) grouped.set(slug, { slug, name, developer, units: [] });
    grouped.get(slug).units.push(unit);
  }
  return [...grouped.values()];
}

function projectLocation(project) {
  return clean(project.units.find((unit) => unit.location)?.location, "Egypt");
}

function projectImage(project) {
  return clean(project.units.find((unit) => unit.image_url)?.image_url, "");
}

function projectMinPrice(project) {
  return Math.min(...project.units.map((unit) => numberValue(unit.starting_price)).filter(Boolean));
}

function projectMaxPrice(project) {
  return Math.max(...project.units.map((unit) => numberValue(unit.starting_price)).filter(Boolean));
}

function projectLastUpdated(project) {
  const values = project.units
    .map((unit) => new Date(unit.last_updated_at || "").getTime())
    .filter(Number.isFinite);
  return values.length ? new Date(Math.max(...values)).toISOString() : null;
}

function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": ["Organization", "RealEstateAgent"],
    name: "Tycoons Investments",
    url: SITE_URL,
    telephone: `+${WHATSAPP_NUMBER}`,
    sameAs: [
      "https://www.facebook.com/tycoonsinvestments/",
      "https://www.instagram.com/tycoonsinvestment/",
    ],
    areaServed: { "@type": "Country", name: "Egypt" },
    knowsLanguage: ["ar-EG", "en"],
    contactPoint: {
      "@type": "ContactPoint",
      telephone: `+${WHATSAPP_NUMBER}`,
      contactType: "sales",
      areaServed: "EG",
      availableLanguage: ["Arabic", "English"],
    },
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

function styles() {
  return `
  :root{--green:#0d1f18;--gold:#c49b5f;--ink:#1b2420;--muted:#667168;--line:#e7ddc8;--warm:#f7f2ea}
  *{box-sizing:border-box}body{margin:0;background:var(--warm);color:var(--ink);font-family:Arial,"Noto Sans Arabic",sans-serif;line-height:1.75}a{color:inherit}
  header{display:flex;justify-content:space-between;align-items:center;gap:20px;padding:18px max(20px,calc((100% - 1180px)/2));background:var(--green);color:#fff}header a{text-decoration:none;font-weight:700}nav{display:flex;flex-wrap:wrap;gap:16px}
  main{width:min(1120px,calc(100% - 32px));margin:auto;padding:34px 0 70px}.hero,.panel,.card,.table,.answer{background:#fff;border:1px solid var(--line);border-radius:24px}
  .hero{padding:clamp(24px,5vw,52px)}h1{margin:8px 0 18px;font-size:clamp(32px,5vw,54px);line-height:1.2;color:var(--green)}h2{margin:40px 0 16px;color:var(--green)}.lead{font-size:18px;color:var(--muted)}.eyebrow{color:#8a6630;font-weight:800}
  .answer{padding:22px 24px;margin:24px 0;background:#fffaf1}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.card{padding:18px;text-decoration:none}.card img{width:100%;height:180px;object-fit:cover;border-radius:16px}.card p{color:var(--muted)}
  .facts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:24px}.fact{padding:14px;border:1px solid var(--line);border-radius:15px}.fact small{display:block;color:var(--muted)}.cta{display:inline-block;margin-top:18px;padding:11px 18px;border-radius:999px;background:#1faa59;color:#fff;text-decoration:none;font-weight:800}
  .table{overflow:auto}.table table{width:100%;min-width:760px;border-collapse:collapse}.table th,.table td{padding:13px 15px;text-align:start;border-bottom:1px solid var(--line)}.table th{background:#efe7d8}.updated,.note,.crumbs{font-size:13px;color:var(--muted)}
  .guide section{padding:22px 0;border-bottom:1px solid var(--line)}footer{padding:36px max(20px,calc((100% - 1180px)/2));background:var(--green);color:#fff}footer a{margin-inline-end:14px}
  @media(max-width:800px){header{align-items:flex-start;flex-direction:column}.grid{grid-template-columns:1fr}.facts{grid-template-columns:1fr 1fr}}
  `;
}

function renderPage({
  lang = "ar",
  title,
  description,
  path,
  alternatePath,
  body,
  image = "",
  schemas = [],
  robots = "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1",
}) {
  const ar = lang === "ar";
  const canonical = `${SITE_URL}${path}`;
  const alternate = alternatePath ? `${SITE_URL}${alternatePath}` : "";
  return `<!doctype html>
<html lang="${lang}" dir="${ar ? "rtl" : "ltr"}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}"><meta name="robots" content="${robots}">
<link rel="canonical" href="${escapeHtml(canonical)}">
${alternate ? `<link rel="alternate" hreflang="ar-EG" href="${escapeHtml(ar ? canonical : alternate)}">
<link rel="alternate" hreflang="en" href="${escapeHtml(ar ? alternate : canonical)}">
<link rel="alternate" hreflang="x-default" href="${escapeHtml(ar ? canonical : alternate)}">` : `<link rel="alternate" hreflang="${ar ? "ar-EG" : "en"}" href="${escapeHtml(canonical)}">
<link rel="alternate" hreflang="x-default" href="${escapeHtml(canonical)}">`}
<meta property="og:type" content="website"><meta property="og:site_name" content="Tycoons Investments">
<meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${escapeHtml(canonical)}"><meta property="og:locale" content="${ar ? "ar_EG" : "en_US"}">
${image ? `<meta property="og:image" content="${escapeHtml(image)}">` : ""}
<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}">
${[organizationSchema(), ...schemas]
  .map((schema) => `<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, "\\u003c")}</script>`)
  .join("")}
<style>${styles()}</style></head><body>
<header><a href="/">TYCOONS INVESTMENTS</a><nav>
<a href="/${lang}/">${ar ? "دليل المشاريع" : "Project directory"}</a>
<a href="/guides/off-plan-buying-checklist">${ar ? "الأدلة" : "Guides"}</a>
<a href="/methodology">${ar ? "منهجية البيانات" : "Methodology"}</a>
<a href="https://wa.me/${WHATSAPP_NUMBER}">${ar ? "واتساب" : "WhatsApp"}</a>
</nav></header>${body}
<footer><strong>Tycoons Investments</strong><p>${ar ? "بيانات الأسعار والتوفر استرشادية ويتم تأكيدها وقت الطلب. العوائد تقديرية وليست ضمانًا." : "Prices and availability are indicative and reconfirmed on request. Returns are estimates, not guarantees."}</p>
<a href="/methodology">${ar ? "منهجية البيانات" : "Methodology"}</a>
<a href="/corrections">${ar ? "سياسة التصحيح" : "Corrections"}</a>
<a href="/contact">${ar ? "تواصل معنا" : "Contact"}</a></footer></body></html>`;
}

function cards(projects, lang) {
  const ar = lang === "ar";
  return `<div class="grid">${projects
    .map((project) => {
      const image = projectImage(project);
      return `<a class="card" href="/${lang}/projects/${project.slug}">
      ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(project.name)}" loading="lazy" width="640" height="360">` : ""}
      <h3>${escapeHtml(project.name)}</h3><p>${escapeHtml(project.developer)} · ${escapeHtml(projectLocation(project))}</p>
      <strong>${ar ? "يبدأ من" : "Starting from"} ${escapeHtml(formatPrice(projectMinPrice(project), lang))}</strong></a>`;
    })
    .join("")}</div>`;
}

function renderDirectory(projects, lang) {
  const ar = lang === "ar";
  const path = `/${lang}/`;
  const alternatePath = `/${ar ? "en" : "ar"}/`;
  const latest = [...projects]
    .sort((a, b) => String(projectLastUpdated(b)).localeCompare(String(projectLastUpdated(a))))
    .slice(0, 18);
  const areas = [...new Map(projects.map((project) => {
    const area = areaFor(projectLocation(project));
    return [area.slug, area];
  })).values()];
  const title = ar
    ? "مشاريع عقارية في مصر بالأسعار المحدثة | Tycoons Investments"
    : "Egypt property projects with updated prices | Tycoons Investments";
  const description = ar
    ? "دليل مشاريع عقارية مبني على الوحدات المتاحة في قاعدة بيانات Tycoons مع الأسعار والمساحات وخطط السداد."
    : "A property project directory based on currently available Tycoons inventory, including prices, areas and payment plans.";
  const body = `<main><section class="hero"><span class="eyebrow">Tycoons Investments</span><h1>${ar ? "دليل المشاريع العقارية المحدث" : "Updated property project directory"}</h1><p class="lead">${escapeHtml(description)}</p><p class="note">${ar ? `${projects.length} مشروع ظاهر حسب آخر تحميل ناجح للبيانات.` : `${projects.length} projects shown from the latest successful data load.`}</p></section>
  <h2>${ar ? "استكشف حسب المنطقة" : "Explore by area"}</h2><div class="grid">${areas.map((area) => `<a class="card" href="/${lang}/areas/${area.slug}"><h3>${escapeHtml(ar ? area.ar : area.en)}</h3></a>`).join("")}</div>
  <h2>${ar ? "أحدث المشاريع" : "Recently updated projects"}</h2>${cards(latest, lang)}</main>`;
  return renderPage({
    lang,
    title,
    description,
    path,
    alternatePath,
    body,
    schemas: [{ "@context": "https://schema.org", "@type": "CollectionPage", name: title, url: `${SITE_URL}${path}` }],
  });
}

function renderProject(projects, slug, lang) {
  const project = projects.find((item) => item.slug === slug);
  if (!project) return null;
  const ar = lang === "ar";
  const path = `/${lang}/projects/${slug}`;
  const alternatePath = `/${ar ? "en" : "ar"}/projects/${slug}`;
  const location = projectLocation(project);
  const area = areaFor(location);
  const image = projectImage(project);
  const updated = projectLastUpdated(project);
  const units = [...new Map(project.units.map((unit) => [
    [unit.unit_type, unit.bedrooms_text, unit.area_sqm, unit.starting_price].join("|"),
    unit,
  ])).values()].slice(0, 60);
  const description = ar
    ? `${project.name} من ${project.developer} في ${location}. قارن الوحدات المتاحة والأسعار وخطط السداد والاستلام.`
    : `${project.name} by ${project.developer} in ${location}. Compare available units, prices, payment plans and delivery.`;
  const crumbs = [
    { name: ar ? "الرئيسية" : "Home", path: "/" },
    { name: ar ? area.ar : area.en, path: `/${lang}/areas/${area.slug}` },
    { name: project.name, path },
  ];
  const message = encodeURIComponent(
    `Hello Tycoons Investments,\nI am interested in this project:\n\nProject: ${project.name}\nDeveloper: ${project.developer}\nLocation: ${location}\nStarting price: ${formatPrice(projectMinPrice(project), "en")}\nStatus: Available\n\nURL: ${SITE_URL}${path}\n\nPlease send me available options and details.\n\nSource: project_page\nPage: ${SITE_URL}${path}`,
  );
  const body = `<main><p class="crumbs">${crumbs.map((item) => `<a href="${item.path}">${escapeHtml(item.name)}</a>`).join(" / ")}</p>
  <section class="hero"><span class="eyebrow">${escapeHtml(project.developer)} · ${escapeHtml(location)}</span><h1>${escapeHtml(project.name)}</h1><p class="lead">${escapeHtml(description)}</p>
  ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(`${project.name} — ${location}`)}" width="960" height="540" style="width:100%;max-height:460px;object-fit:cover;border-radius:20px" fetchpriority="high">` : ""}
  <div class="facts"><div class="fact"><small>${ar ? "يبدأ من" : "Starting from"}</small><strong>${escapeHtml(formatPrice(projectMinPrice(project), lang))}</strong></div>
  <div class="fact"><small>${ar ? "أعلى سعر ظاهر" : "Highest listed price"}</small><strong>${escapeHtml(formatPrice(projectMaxPrice(project), lang))}</strong></div>
  <div class="fact"><small>${ar ? "الخيارات" : "Options"}</small><strong>${units.length}</strong></div>
  <div class="fact"><small>${ar ? "آخر تحديث" : "Last updated"}</small><strong>${escapeHtml(formatDate(updated, lang))}</strong></div></div>
  <a class="cta" href="https://wa.me/${WHATSAPP_NUMBER}?text=${message}">${ar ? "اطلب أحدث Availability" : "Request current availability"}</a></section>
  <h2>${ar ? "الوحدات المتاحة" : "Available units"}</h2><div class="table"><table><thead><tr><th>${ar ? "النوع" : "Type"}</th><th>${ar ? "الغرف / المساحة" : "Beds / area"}</th><th>${ar ? "السعر" : "Price"}</th><th>${ar ? "المقدم" : "Down payment"}</th><th>${ar ? "التقسيط" : "Installments"}</th><th>${ar ? "الاستلام" : "Delivery"}</th></tr></thead><tbody>
  ${units.map((unit) => `<tr><td>${escapeHtml(clean(unit.unit_type))}</td><td>${escapeHtml(clean(unit.bedrooms_text))}${unit.area_sqm ? ` · ${escapeHtml(unit.area_sqm)} m²` : ""}</td><td>${escapeHtml(formatPrice(unit.starting_price, lang))}</td><td>${escapeHtml(clean(unit.down_payment_text))}</td><td>${escapeHtml(clean(unit.installments_text))}</td><td>${escapeHtml(clean(unit.delivery_text))}</td></tr>`).join("")}
  </tbody></table></div><p class="note">${ar ? "الأسعار والتوفر يتغيران؛ يتم التأكيد مع المطور وقت الطلب." : "Prices and availability change and are reconfirmed with the developer on request."}</p></main>`;
  return renderPage({
    lang,
    title: `${project.name} | ${project.developer} | Tycoons Investments`,
    description,
    path,
    alternatePath,
    body,
    image,
    schemas: [
      breadcrumbSchema(crumbs),
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: project.name,
        url: `${SITE_URL}${path}`,
        dateModified: updated || undefined,
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: units.length,
          itemListElement: units.slice(0, 20).map((unit, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: `${clean(unit.unit_type)} ${clean(unit.area_sqm, "")} ${project.name}`.trim(),
          })),
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "OfferCatalog",
        name: ar ? `الوحدات المتاحة في ${project.name}` : `Available units at ${project.name}`,
        url: `${SITE_URL}${path}`,
        numberOfItems: units.length,
        itemListElement: units.slice(0, 20).map((unit) => ({
          "@type": "Offer",
          url: `${SITE_URL}${path}`,
          price: numberValue(unit.starting_price),
          priceCurrency: "EGP",
          availability: "https://schema.org/InStock",
          itemOffered: {
            "@type": "Accommodation",
            name: `${clean(unit.unit_type)} ${project.name}`,
            floorSize: unit.area_sqm
              ? { "@type": "QuantitativeValue", value: numberValue(unit.area_sqm), unitCode: "MTK" }
              : undefined,
            numberOfBedrooms: numberValue(unit.bedrooms_text) || undefined,
          },
        })),
      },
    ],
  });
}

function renderCollection(projects, kind, slug, lang) {
  const ar = lang === "ar";
  const matches =
    kind === "area"
      ? projects.filter((project) => areaFor(projectLocation(project)).slug === slug)
      : projects.filter((project) => slugify(project.developer) === slug);
  if (!matches.length) return null;
  matches.sort((a, b) => projectMinPrice(a) - projectMinPrice(b));
  const area = kind === "area" ? areaFor(projectLocation(matches[0])) : null;
  const label = kind === "area" ? (ar ? area.ar : area.en) : matches[0].developer;
  const plural = matches.length === 1 ? (ar ? "مشروع واحد" : "1 project") : ar ? `${matches.length} مشروع` : `${matches.length} projects`;
  const path = `/${lang}/${kind === "area" ? "areas" : "developers"}/${slug}`;
  const alternatePath = `/${ar ? "en" : "ar"}/${kind === "area" ? "areas" : "developers"}/${slug}`;
  const min = Math.min(...matches.map(projectMinPrice));
  const max = Math.max(...matches.map(projectMaxPrice));
  const title = ar ? `مشاريع ${label} وأسعار الوحدات | Tycoons Investments` : `${label} projects and prices | Tycoons Investments`;
  const description = ar
    ? `قارن ${plural} مع نطاق الأسعار الظاهر وخطط السداد والاستلام حسب أحدث بيانات متاحة.`
    : `Compare ${plural} with listed price ranges, payment plans and delivery based on the latest available data.`;
  const crumbs = [
    { name: ar ? "الرئيسية" : "Home", path: "/" },
    { name: label, path },
  ];
  const body = `<main><p class="crumbs">${crumbs.map((item) => `<a href="${item.path}">${escapeHtml(item.name)}</a>`).join(" / ")}</p><section class="hero"><span class="eyebrow">${kind === "area" ? (ar ? "دليل منطقة" : "Area guide") : (ar ? "دليل مطور" : "Developer guide")}</span><h1>${escapeHtml(label)}</h1>
  <div class="answer"><strong>${escapeHtml(description)}</strong></div><div class="facts"><div class="fact"><small>${ar ? "عدد المشاريع" : "Projects"}</small><strong>${plural}</strong></div><div class="fact"><small>${ar ? "أقل سعر ظاهر" : "Lowest listed"}</small><strong>${escapeHtml(formatPrice(min, lang))}</strong></div><div class="fact"><small>${ar ? "أعلى سعر ظاهر" : "Highest listed"}</small><strong>${escapeHtml(formatPrice(max, lang))}</strong></div><div class="fact"><small>${ar ? "مصدر البيانات" : "Data source"}</small><strong>Tycoons inventory</strong></div></div></section>
  <h2>${ar ? "المشاريع المتاحة" : "Available projects"}</h2>${cards(matches, lang)}
  <p class="note">${ar ? "النطاق مبني على الوحدات الظاهرة وليس تقييمًا للسوق بالكامل." : "The range is based on listed units and is not a valuation of the whole market."}</p></main>`;
  return renderPage({
    lang,
    title,
    description,
    path,
    alternatePath,
    body,
    image: projectImage(matches[0]),
    schemas: [
      breadcrumbSchema(crumbs),
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: title,
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
    ],
  });
}

function renderGuide(slug) {
  const guide = GUIDES[slug];
  if (!guide) return null;
  const path = `/guides/${slug}/`;
  const body = `<main class="guide"><p class="crumbs"><a href="/">الرئيسية</a> / <a href="/guides/off-plan-buying-checklist">الأدلة</a> / ${escapeHtml(guide.title)}</p>
  <section class="hero"><span class="eyebrow">دليل قرار عقاري · راجعه فريق Tycoons</span><h1>${escapeHtml(guide.title)}</h1><p class="lead">${escapeHtml(guide.description)}</p><div class="answer">${escapeHtml(guide.summary)}</div><p class="updated">آخر مراجعة: 26 يوليو 2026</p></section>
  ${guide.sections.map(([title, text]) => `<section><h2>${escapeHtml(title)}</h2><p>${escapeHtml(text)}</p></section>`).join("")}
  <section><h2>ملاحظة مهمة</h2><p>المحتوى تعليمي وليس استشارة قانونية أو مالية. الأسعار والتوفر والعوائد تتغير، ويفضل مراجعة العقد مع محامٍ مستقل وإعادة تأكيد البيانات وقت القرار.</p><p><a href="/methodology">اقرأ منهجية البيانات والحسابات</a></p></section></main>`;
  return renderPage({
    title: `${guide.title} | Tycoons Investments`,
    description: guide.description,
    path,
    body,
    schemas: [
      breadcrumbSchema([
        { name: "الرئيسية", path: "/" },
        { name: "الأدلة", path: "/guides/off-plan-buying-checklist/" },
        { name: guide.title, path },
      ]),
      {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: guide.title,
        description: guide.description,
        datePublished: "2026-07-26",
        dateModified: "2026-07-26",
        inLanguage: "ar-EG",
        author: { "@type": "Organization", name: "Tycoons Investments", url: `${SITE_URL}/about` },
        reviewedBy: { "@type": "Organization", name: "Tycoons Investments" },
        publisher: { "@type": "Organization", name: "Tycoons Investments", url: SITE_URL },
        mainEntityOfPage: `${SITE_URL}${path}`,
      },
    ],
  });
}

function renderStaticPage(type) {
  const pages = {
    about: {
      title: "من نحن | Tycoons Investments",
      description: "تعرف على Tycoons Investments ومنهجنا في مساعدة مشتري العقارات على المقارنة واتخاذ قرار مبني على بيانات واضحة.",
      body: `<h1>من نحن</h1><div class="answer">Tycoons Investments منصة بحث ومقارنة عقارية مصرية تساعد المشتري يفهم البدائل والأسعار وخطط السداد قبل التواصل مع فريق المبيعات.</div><h2>مهمتنا</h2><p>نحوّل البحث عن عقار من قوائم مشتتة إلى قرار واضح: نفس الميزانية، نفس نوع الوحدة، ونفس توقيت التسليم، مع توضيح الافتراضات والمخاطر.</p><h2>طريقة شغلنا</h2><p>نجمع بيانات الوحدات المتاحة من ملفات وقوائم المطورين، نعرض تاريخ التحديث، ونطلب إعادة تأكيد السعر والتوفر وقت الاستفسار. لا نعتبر أي عائد متوقع ضمانًا.</p><h2>مناسبين لمين؟</h2><p>للمشتري اللي عايز يقارن قبل القرار، وللمستثمر اللي محتاج يفصل بين سعر الشراء وخطة التمويل والسيولة والعائد المحتمل.</p><h2>إمتى منصتنا مش كفاية؟</h2><p>الموقع مش بديل عن مراجعة العقد مع محامٍ مستقل، ولا عن المعاينة وإعادة تأكيد العرض النهائي مع المطور.</p>`,
      schemas: [{
        "@context": "https://schema.org",
        "@type": "AboutPage",
        name: "عن Tycoons Investments",
        url: `${SITE_URL}/about`,
        mainEntity: { "@type": ["Organization", "RealEstateAgent"], name: "Tycoons Investments", url: SITE_URL },
      }],
    },
    faq: {
      title: "الأسئلة الشائعة عن شراء العقارات | Tycoons Investments",
      description: "إجابات واضحة عن الأسعار والتوفر والعمولة وخطط السداد والبحث والمقارنة مع Tycoons Investments.",
      body: `<h1>الأسئلة الشائعة</h1><div class="answer">الأسعار والتوفر وخطط السداد تتغير، لذلك بنعرض أحدث بيانات مسجلة ونأكد العرض النهائي مع المطور وقت الطلب.</div><h2>هل الأسعار نهائية؟</h2><p>هي أحدث أسعار مسجلة عندنا، لكنها تحتاج تأكيد وقت الاستفسار لأن المطور قد يغيّر السعر أوالتوفر.</p><h2>هل Tycoons بتاخد عمولة من المشتري؟</h2><p>لا نضيف عمولة على سعر المطور للمشتري. الاتفاق النهائي والعقد يكونان وفق العرض المؤكد من المطور.</p><h2>إزاي أقارن خطط السداد؟</h2><p>قارن إجمالي السعر، المقدم والدفعات، مدة الأقساط، توقيت التسليم، والتشطيب. مدة تقسيط أطول لا تعني تلقائيًا تكلفة أقل.</p><h2>هل العائد مضمون؟</h2><p>لا. أي ROI أوإيجار متوقع تقدير مبني على افتراضات قابلة للتغير، وليس وعدًا أوضمانًا.</p><h2>إزاي أبلغ عن معلومة غير دقيقة؟</h2><p>ابعت رابط الصفحة والمعلومة الأحدث على <a href="https://wa.me/${WHATSAPP_NUMBER}">واتساب</a>، وهنراجع المصدر حسب <a href="/corrections">سياسة التصحيح</a>.</p>`,
      schemas: [{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          ["هل الأسعار نهائية؟", "هي أحدث أسعار مسجلة عندنا، لكنها تحتاج تأكيد وقت الاستفسار لأن المطور قد يغيّر السعر أو التوفر."],
          ["هل Tycoons بتاخد عمولة من المشتري؟", "لا نضيف عمولة على سعر المطور للمشتري. الاتفاق النهائي والعقد يكونان وفق العرض المؤكد من المطور."],
          ["هل العائد مضمون؟", "لا. أي عائد متوقع هو تقدير مبني على افتراضات قابلة للتغير وليس وعدًا أو ضمانًا."],
        ].map(([name, text]) => ({
          "@type": "Question",
          name,
          acceptedAnswer: { "@type": "Answer", text },
        })),
      }],
    },
    methodology: {
      title: "منهجية بيانات Tycoons Investments",
      description: "كيف نجمع ونراجع ونعرض الأسعار والوحدات وخطط السداد وحسابات المقارنة.",
      body: `<h1>منهجية البيانات والحسابات</h1><div class="answer">نعرض الوحدات المتاحة فقط من قاعدة بيانات Tycoons، ونستخدم أقل سعر داخل كل مجموعة مقارنة. كل سعر أو Availability يحتاج إعادة تأكيد وقت الطلب.</div><h2>مصادر البيانات</h2><p>ملفات Availability وقوائم الأسعار والبروشورات ورسائل فرق المطورين، مع حفظ مرجع المصدر وتاريخ آخر تحديث داخل قاعدة البيانات عند توفرهما.</p><h2>المقارنات</h2><p>السكني يُقارن حسب المشروع ونوع الوحدة وعدد الغرف. الإداري والتجاري يُقارن حسب نوع الوحدة ونطاق المساحة. لا نخلط بين تشطيب أو تسليم مختلفين في استنتاج واحد بدون تنبيه.</p><h2>العائد</h2><p>أي ROI أو عائد إيجاري تقديري يعتمد على افتراضات معلنة: سعر الشراء الكامل، الإيجار، الإشغال، الصيانة، والتكاليف. النتائج ليست ضمانًا.</p><h2>التحديث</h2><p>تاريخ آخر تحديث يظهر على صفحات المشاريع. البيانات القديمة أو غير المؤكدة لا تُعامل كعرض نهائي.</p>`,
    },
    corrections: {
      title: "سياسة التصحيح والتحديث | Tycoons Investments",
      description: "طريقة الإبلاغ عن معلومة عقارية غير دقيقة وكيفية مراجعتها وتصحيحها.",
      body: `<h1>سياسة التصحيح والتحديث</h1><div class="answer">لو اكتشفنا سعرًا أو مساحة أو خطة سداد غير دقيقة، نراجع المصدر الأصلي ونصححها ونحدّث تاريخ المراجعة. لا نخفي التصحيح عندما يؤثر على قرار المستخدم.</div><h2>الإبلاغ عن خطأ</h2><p>أرسل رابط الصفحة ووصف الخطأ والمصدر الأحدث على واتساب <a href="https://wa.me/${WHATSAPP_NUMBER}">+20 120 070 4344</a>.</p><h2>الأولوية</h2><p>الأخطاء المتعلقة بالسعر والتوفر والتسليم وخطة السداد تُراجع أولًا لأنها الأكثر تأثيرًا على القرار.</p>`,
    },
    contact: {
      title: "تواصل مع Tycoons Investments",
      description: "تواصل مع فريق Tycoons Investments للاستفسار عن أحدث الأسعار والتوفر وخطط السداد.",
      body: `<h1>تواصل مع Tycoons Investments</h1><div class="answer">لأحدث Availability وخطط السداد، تواصل مباشرة على واتساب. نخدم العملاء بالعربي والإنجليزي داخل مصر.</div><p><a class="cta" href="https://wa.me/${WHATSAPP_NUMBER}">واتساب +20 120 070 4344</a></p><h2>بيانات النشر</h2><p>الاسم المستخدم على الموقع والسوشيال: Tycoons Investments / تايكونز للاستثمار العقاري.</p><p>العنوان وساعات العمل سيتم إضافتهما بعد اعتماد البيانات الرسمية، لذلك لا ننشر بيانات غير مؤكدة.</p>`,
    },
  };
  const page = pages[type];
  if (!page) return null;
  return renderPage({
    title: page.title,
    description: page.description,
    path: `/${type}`,
    body: `<main><section class="hero">${page.body}<p class="updated">آخر مراجعة: 26 يوليو 2026</p></section></main>`,
    schemas: [
      breadcrumbSchema([
        { name: "الرئيسية", path: "/" },
        { name: page.title, path: `/${type}` },
      ]),
      ...(page.schemas || []),
    ],
  });
}

function notFound(lang = "ar") {
  const ar = lang === "ar";
  return renderPage({
    lang,
    title: ar ? "الصفحة غير موجودة | Tycoons Investments" : "Page not found | Tycoons Investments",
    description: ar ? "الصفحة المطلوبة غير موجودة." : "The requested page does not exist.",
    path: "/404",
    alternatePath: "/404",
    robots: "noindex,follow",
    body: `<main><section class="hero"><h1>${ar ? "الصفحة غير موجودة" : "Page not found"}</h1><p>${ar ? "ارجع للرئيسية أو استخدم دليل المشاريع." : "Return home or use the project directory."}</p><a class="cta" href="/">${ar ? "العودة للرئيسية" : "Back home"}</a></section></main>`,
  });
}

module.exports = {
  SITE_URL,
  CACHE_HEADERS,
  AREAS,
  GUIDES,
  slugify,
  areaFor,
  fetchUnits,
  groupProjects,
  projectLocation,
  projectLastUpdated,
  renderDirectory,
  renderProject,
  renderCollection,
  renderGuide,
  renderStaticPage,
  notFound,
  escapeHtml,
};
