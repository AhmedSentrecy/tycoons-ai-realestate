"use strict";

const { localizedProjectContent, renderSections: renderLocalizedSections } = require("./_localized-project-content.cjs");
const { developerContent } = require("./_developer-content.cjs");

const { renderSafeMarkdown } = require("./_article-render.cjs");
const { buildProjectSchemas } = require("./_project-schema.cjs");
const { unitPath, findUnitByParam } = require("./_unit-url.cjs");
const { developerRank } = require("./_developer-rank.cjs");

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
    "default-src 'self'; img-src 'self' https: data:; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self' https://coqnjymekrkoausiiytm.supabase.co; frame-src https://www.google.com; frame-ancestors 'none'; base-uri 'self'",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-content-type-options": "nosniff",
};

const AREAS = [
  {
    slug: "mostakbal-city",
    ar: "مستقبل سيتي",
    en: "Mostakbal City",
    match: /mostakbal(?: city)?|مستقبل(?: سيتي)?/i,
  },
  {
    slug: "new-alamein",
    ar: "العلمين الجديدة",
    en: "New Alamein",
    match: /new alamein|العلمين الجديده|العلمين الجديدة/i,
  },
  {
    slug: "new-cairo",
    ar: "القاهرة الجديدة والتجمع",
    en: "New Cairo",
    match: /new cairo|fifth settlement|القاهره الجديده|القاهرة الجديدة|التجمع/i,
  },
  {
    slug: "north-coast",
    ar: "الساحل الشمالي",
    en: "North Coast",
    match: /north coast|sahel|الساحل|ras el|راس الحكمه|رأس الحكمة|sidi abdel|(?<!الجديده |الجديدة )العلمين/i,
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
    match: /sheikh zayed|el sheikh zayed|new zayed|sodic west|الشيخ زايد|زايد الجديدة|زايد الجديده/i,
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
];

const AREA_FACTS = {
  "mostakbal-city": {
    contextEn: "Mostakbal City is a fast-growing residential city along the Cairo–Suez Road, next to Madinaty and New Cairo, and one of the areas where developers have launched the most new projects in recent years.",
    buyerNoteEn: "Most projects here are still under construction with long payment plans, so check the developer's delivery record before reserving.",
    context:
      "مستقبل سيتي منطقة سكنية ناشئة على امتداد طريق السويس، قريبة من مدينتي والقاهرة الجديدة، وبقت من أكتر المناطق اللي المطورين بيطلقوا فيها مشاريع جديدة في السنين الأخيرة.",
    buyerNote:
      "غالبية المشاريع هنا لسه تحت الإنشاء بخطط سداد طويلة، فمراجعة سجل تسليم المطور مهمة قبل الحجز.",
  },
  "new-alamein": {
    contextEn: "New Alamein is a new government-backed coastal city on the western North Coast, with year-round residential projects rather than only seasonal ones.",
    buyerNoteEn: "When comparing, separate year-round homes in New Alamein from seasonal units elsewhere on the North Coast, because usage and expected returns differ.",
    context:
      "العلمين الجديدة مدينة ساحلية جديدة غرب الساحل الشمالي بدعم حكومي، وفيها مشاريع سكنية دائمة مش موسمية بس زي باقي الساحل.",
    buyerNote:
      "فرّق وانت بتقارن بين وحدات للسكن الدائم في العلمين الجديدة ووحدات موسمية في باقي الساحل الشمالي، لأن نمط الاستخدام والعائد المتوقع مختلف.",
  },
  "new-cairo": {
    contextEn: "New Cairo and the Fifth Settlement are among the most complete areas of East Cairo for services, with the American University in Cairo (AUC), malls such as Cairo Festival City, and international schools and universities.",
    buyerNoteEn: "The area has some of the strongest rental and resale demand in East Cairo, especially for delivered or near-delivery projects.",
    context:
      "القاهرة الجديدة والتجمع الخامس من أكتر مناطق شرق القاهرة اكتمالاً من ناحية الخدمات — فيها الجامعة الأمريكية بالقاهرة (AUC)، مولات زي كايرو فيستيفال سيتي، ومدارس وجامعات دولية.",
    buyerNote:
      "المنطقة عليها طلب إيجاري وإعادة بيع من الأعلى في القاهرة الجديدة، خصوصاً في المشاريع المُسلَّمة أو القريبة من التسليم.",
  },
  "north-coast": {
    contextEn: "The North Coast is the strip of holiday villages along the Alexandria–Matrouh road, where most units are seasonal chalets and villas sold in early-booking phases before summer.",
    buyerNoteEn: "Separate personal use from seasonal rental and compare the unit's position inside the village and its distance from the beach, because these move the price more than the unit size.",
    context:
      "الساحل الشمالي شريط القرى السياحية على طريق الإسكندرية-مطروح، ومعظم الوحدات فيه شاليهات وفيلات موسمية بتتباع بنظام الحجز المبكر قبل الصيف.",
    buyerNote:
      "افرق بين الاستخدام الشخصي والتأجير الموسمي وانت بتقارن الموقع جوه القرية والمسافة من الشاطئ، لأنها بتأثر على السعر أكتر من مساحة الوحدة نفسها.",
  },
  "ain-sokhna": {
    contextEn: "Ain Sokhna is the closest beach to Cairo on the Gulf of Suez, which makes it a common choice for a weekend chalet instead of the longer trip to the North Coast.",
    buyerNoteEn: "Check the village's distance from the Sokhna highway and its winter services, because many villages reduce services outside summer.",
    context:
      "العين السخنة أقرب شاطئ للقاهرة على خليج السويس، وده بيخليها خيار شائع لشاليه ويك إند بدل رحلة الساحل الشمالي الأطول.",
    buyerNote:
      "راجع مسافة القرية عن طريق السخنة السريع وجودة الخدمة الشتوية، لأن كتير من القرى بتقلل خدماتها بره موسم الصيف.",
  },
  "sheikh-zayed": {
    contextEn: "Sheikh Zayed is West Cairo's extension next to 6th of October, with a mix of delivered compounds and new launches, close to malls such as Mall of Arabia and Hyper One.",
    buyerNoteEn: "The area has steady residential demand, so projects close to the main roads usually keep higher resale liquidity.",
    context:
      "الشيخ زايد امتداد غرب القاهرة بمحاذاة أكتوبر، وفيها خليط من الكمبوندات المُسلَّمة والمشاريع الجديدة، وقريبة من مولات زي مول العرب وهايبر وان.",
    buyerNote:
      "المنطقة عليها طلب سكني مستقر، فالمشاريع القريبة من المحاور الرئيسية عادة بتحافظ على سيولة إعادة بيع أعلى.",
  },
  "new-capital": {
    contextEn: "The New Administrative Capital is a city under construction east of Cairo, home to the Government District and the Iconic Tower, with most residential projects still in early or mid delivery stages.",
    buyerNoteEn: "Because many services are still being built, compare the project's real delivery date with the delivery of surrounding facilities before relying on the developer's schedule alone.",
    context:
      "العاصمة الإدارية الجديدة مدينة قيد الإنشاء شرق القاهرة، فيها الحي الحكومي والبرج الأيقوني، ومعظم مشاريعها السكنية لسه في مراحل تسليم مبكرة أو متوسطة.",
    buyerNote:
      "لأن كتير من الخدمات لسه بتتبني، قارن توقيت التسليم الفعلي للمشروع بجدول تسليم المرافق المحيطة قبل ما تعتمد على جدول المطور وحده.",
  },
  october: {
    contextEn: "6th of October is an established city west of Cairo with universities, industry and ready residential areas, and prices are usually lower than Sheikh Zayed at a similar distance from Cairo.",
    buyerNoteEn: "Ready or near-delivery projects in October are usually a cheaper option for buyers who want West Cairo on a lower budget than Zayed.",
    context:
      "السادس من أكتوبر مدينة راسخة غرب القاهرة فيها جامعات وصناعات ومناطق سكنية جاهزة، وأسعارها عادة أقل من زايد على نفس المسافة من القاهرة.",
    buyerNote:
      "المشاريع الجاهزة أو القريبة من التسليم في أكتوبر عادة بتوفر بديل أرخص لمن يريد سكن غرب القاهرة بميزانية أقل من زايد.",
  },
};

const GENERIC_AREA_FACTS = {
  contextEn: "This area is part of Tycoons' current inventory, and its project data is updated continuously.",
  buyerNoteEn: "Check how close each project is to the main roads and to services that already operate before comparing it with other areas.",
  context: "المنطقة دي من مناطق العرض الحالية في قاعدة بيانات Tycoons، وبتُحدَّث بيانات المشاريع فيها باستمرار.",
  buyerNote: "راجع قرب المشروع من الطرق الرئيسية والخدمات القائمة فعليًا قبل المقارنة بمناطق تانية.",
};

// Search Console-backed intent copy. Keep this limited to areas where real query
// data shows a clear need; generic area pages should not inherit keyword-heavy copy.
const AREA_SEARCH_CONTENT = {
  "mostakbal-city": {
    ar: {
      title: ({ minFmt, plural }) => `مشاريع مستقبل سيتي 2026 — الخريطة والأسعار (${plural}) من ${minFmt} | Tycoons`,
      description: ({ minFmt, plural }) => `خريطة مستقبل سيتي ومكانها، والماستر بلان ومراحل المدينة، و${plural} متاحة حسب المطور بأسعار تبدأ من ${minFmt}. قارن المشاريع والوحدات وخطط السداد في دليل واحد محدث.`,
      map: { heading: "خريطة مستقبل سيتي", query: "Mostakbal City, New Cairo, Egypt", locality: "Mostakbal City, New Cairo" },
      sections: [
        [
          "موقع مستقبل سيتي فين؟",
          "مستقبل سيتي شرق القاهرة على طريق القاهرة–السويس، وبتتوصل بالطريق الدائري الإقليمي والدائري الأوسطي. جيرانها المباشرين مدينتي والشروق والعاصمة الإدارية الجديدة، وحسب شركة مدار (المطور الرئيسي للمدينة) فيه وصول مباشر لمحطة القطار السريع في العاصمة الإدارية.",
        ],
        [
          "الماستر بلان ومراحل مستقبل سيتي",
          "حسب مدار، مساحة مستقبل سيتي الكلية حوالي 5,200 فدان، ومتقسمة لمراحل. المرحلة الأولى حوالي 1,435 فدان قريبة من المدارس والجامعات، والمرحلة التالتة حوالي 1,548 فدان سكني وفيها مول مركاتو المفتوح، والمرحلة الرابعة حوالي 1,806 فدان سكني. موقع كل مشروع جوه المرحلة بيتأكد من الـ master plan الرسمي للمطور قبل الحجز.",
        ],
        [
          "خريطة مشاريع مستقبل سيتي والمطورين",
          "مدار بتقول إن المدينة فيها أكتر من 30 مطور. الدليل اللي تحت بيرتب المشاريع المتاحة عندنا حسب المطور، وبيربط كل مشروع بصفحته ووحداته المتاحة وأسعارها. ده دليل للمشاريع، مش خريطة مساحية؛ حدود ومراحل كل مشروع تتأكد من الـ master plan الرسمي للمطور.",
        ],
      ],
      faq: [
        [
          "موقع مستقبل سيتي فين؟",
          "مستقبل سيتي شرق القاهرة على طريق القاهرة–السويس، جنب مدينتي والشروق والعاصمة الإدارية، وبتتوصل بالدائري الإقليمي والدائري الأوسطي. افتح الخريطة في الصفحة وراجع موقع المشروع نفسه جوه المدينة لأن المراحل والمداخل بتختلف.",
        ],
        [
          "مساحة مستقبل سيتي كام؟",
          "حسب شركة مدار، المطور الرئيسي للمدينة، المساحة الكلية حوالي 5,200 فدان، متقسمة لمراحل سكنية وتجارية.",
        ],
        [
          "مين المطورين في مستقبل سيتي؟",
          "فيه أكتر من 30 مطور في المدينة حسب مدار، منهم Hassan Allam و Mountain View و Tatweer Misr و Madinet Masr و Al Ahly Sabbour. القايمة في الصفحة فيها المطورين اللي عندهم وحدات متاحة دلوقتي عندنا.",
        ],
        [
          "إزاي أشوف خريطة مشاريع مستقبل سيتي؟",
          "الخريطة في الصفحة بتوريك مكان المدينة، ودليل المطورين بيوديك لكل مشروع. ولتحديد المرحلة والقطعة والمداخل بدقة، راجع الـ master plan الرسمي للمطور قبل الحجز.",
        ],
        [
          "هل الاستثمار العقاري في مستقبل سيتي مناسب؟",
          "ممكن يناسب اللي يقبل فترة تطوير وتسليم ويقارن على المدى المتوسط أو الطويل، لكن العائد مش مضمون. راجع سجل تسليم المطور والسيولة المتوقعة وتوقيت تشغيل الخدمات وخطة السداد قبل القرار.",
        ],
      ],
    },
    en: {
      title: ({ minFmt, plural }) => `Mostakbal City Map & Projects 2026 | Tycoons`,
      description: ({ minFmt, plural }) => `Mostakbal City map and location, master plan and phases, and ${plural} by developer starting from ${minFmt}. Compare projects, units and payment plans in one updated guide.`,
      map: { heading: "Mostakbal City map", query: "Mostakbal City, New Cairo, Egypt", locality: "Mostakbal City, New Cairo" },
      sections: [
        [
          "Where is Mostakbal City?",
          "Mostakbal City is in East Cairo on the Cairo–Suez Road, connected to the Regional Ring Road and the Middle Ring Road. Its direct neighbours are Madinaty, El Shorouk and the New Administrative Capital, and according to MIDAR, the city's master developer, it has direct access to the New Capital's high-speed train station.",
        ],
        [
          "Mostakbal City master plan and phases",
          "According to MIDAR, Mostakbal City covers about 5,200 feddans (about 5,408 acres) and is divided into phases. Phase one covers about 1,490 acres near schools and universities, phase three about 1,607 acres of residential districts including the Mercato open-air mall, and phase four about 1,875 acres of residential districts. Confirm each project's exact phase on the developer's official master plan before reserving.",
        ],
        [
          "Mostakbal City projects and developers map",
          "MIDAR lists more than 30 developers in the city. The directory below groups the projects we have available by developer and links each one to its units and prices. It is a project directory, not a surveyed plan; confirm boundaries, phases and entrances on the developer's official master plan.",
        ],
      ],
      faq: [
        [
          "Where is Mostakbal City located?",
          "Mostakbal City is in East Cairo on the Cairo–Suez Road, next to Madinaty, El Shorouk and the New Administrative Capital, and connected to the Regional and Middle Ring Roads. Open the map on this page and confirm the project's exact phase and entrance, because locations vary within the city.",
        ],
        [
          "How big is Mostakbal City?",
          "According to MIDAR, the city's master developer, Mostakbal City covers about 5,200 feddans (about 5,408 acres), split into residential and commercial phases.",
        ],
        [
          "Who are the developers in Mostakbal City?",
          "MIDAR lists more than 30 developers in the city, including Hassan Allam, Mountain View, Tatweer Misr, Madinet Masr and Al Ahly Sabbour. The directory on this page shows the developers with units available in our inventory right now.",
        ],
        [
          "How can I see a map of Mostakbal City projects?",
          "The map on this page shows where the city is, and the developer directory links to every project. For exact phases, plots and entrances, check the developer's official master plan before reserving.",
        ],
        [
          "Is Mostakbal City suitable for property investment?",
          "It may suit buyers who accept a development and delivery period and are comparing a medium- or long-term horizon, but returns are not guaranteed. Review the developer's delivery record, expected liquidity, service activation and payment plan first.",
        ],
      ],
    },
  },
  "new-cairo": {
    ar: {
      title: ({ minFmt, plural }) => `مشاريع القاهرة الجديدة 2026 — الأسعار والمطورين (${plural}) من ${minFmt} | Tycoons`,
      description: ({ minFmt, plural }) => `${plural} في القاهرة الجديدة والتجمع بأسعار تبدأ من ${minFmt}. قارن المطورين والمشاريع والوحدات وخطط السداد والتسليم في دليل محدث.`,
      sections: [
        [
          "إزاي تقارن أسعار مشاريع القاهرة الجديدة؟",
          "قارن وحدات من نفس النوع والمساحة والتشطيب وموعد التسليم، ثم راجع إجمالي سعر التقسيط والمقدم والدفعات الإضافية. سعر البداية أو سعر المتر وحده مش كفاية للحكم على الصفقة.",
        ],
        [
          "مشروعات القاهرة الجديدة حسب المطور",
          "الدليل التالي بيرتب المطورين ومشاريعهم ويربط كل مشروع بالوحدات والأسعار الظاهرة حاليًا. الأسعار والتوفر بيتأكدوا مع المطور وقت الطلب لأن القوائم بتتغير.",
        ],
      ],
      faq: [
        [
          "إزاي أقارن أسعار القاهرة الجديدة بشكل عادل؟",
          "ثبّت نوع الوحدة والمساحة والتشطيب والتسليم، وبعدها قارن السعر الكلي والمقدم ومدة التقسيط والدفعات والصيانة. المقارنة بين وحدتين مختلفتين في التسليم أو التشطيب ممكن تكون مضللة.",
        ],
        [
          "فين ألاقي مشروعات القاهرة الجديدة حسب المطور؟",
          "الصفحة بتجمع المطورين ومشاريعهم في القاهرة الجديدة وتربط كل مشروع بوحداته المتاحة. استخدم القائمة لمقارنة البدائل ثم أكّد السعر والتوفر قبل الحجز.",
        ],
      ],
    },
    en: {
      title: ({ minFmt, plural }) => `New Cairo projects 2026 — prices and developers from ${minFmt} (${plural}) | Tycoons`,
      description: ({ minFmt, plural }) => `${plural} in New Cairo starting from ${minFmt}. Compare developers, projects, units, payment plans and delivery in one updated guide.`,
      sections: [
        [
          "How to compare New Cairo property prices",
          "Compare units with the same type, size, finishing and delivery date, then review the total installment price, down payment and additional payments. A starting price or price per square metre alone does not describe the full deal.",
        ],
        [
          "New Cairo projects by developer",
          "The directory below groups developers and their New Cairo projects and links each project to its currently listed units and prices. Prices and availability are reconfirmed with the developer because inventory changes.",
        ],
      ],
      faq: [
        [
          "How can I compare New Cairo property prices fairly?",
          "Keep the unit type, size, finishing and delivery date consistent, then compare the total price, down payment, installment term, extra payments and maintenance. Comparing units with different delivery or finishing can be misleading.",
        ],
        [
          "Where can I find New Cairo projects by developer?",
          "This page groups New Cairo developers and projects and links each project to its available units. Use the list to compare alternatives, then reconfirm price and availability before reserving.",
        ],
      ],
    },
  },
};

// Project-specific answers are only enabled where Search Console shows a
// distinct intent that the live inventory can answer safely. Values such as
// prices and option counts are always derived from the current data load.
const PROJECT_SEARCH_CONTENT = {
  "mountain-view-icity-october--mountain-view": {
    ar: {
      title: ({ project }) => `${project.name} — الأسعار والموقع والوحدات | Tycoons`,
      description: ({ project, location, priceSummary, unitCount }) => `${project.name} من ${project.developer} في ${location}. ${priceSummary} ${unitCount ? `قارن ${unitCount} خيار متاح وخطط السداد والتسليم` : "اطلب أحدث الأسعار وخطط السداد"}، مع توضيح طريقة التأكد من الموقع والـmaster plan.`,
      sections: ({ project, location, priceSummary }) => [
        [`أسعار ${project.name}`, `${priceSummary} الأرقام مبنية على الوحدات الظاهرة حاليًا في قاعدة بيانات Tycoons، وبتتأكد مع المطور وقت الطلب لأن الأسعار والتوفر بيتغيروا.`],
        [`موقع ${project.name} والـmaster plan`, `سجل Tycoons بيصنّف المشروع في ${location}. لتحديد المرحلة والقطعة وأقرب مدخل بدقة، راجع الـmaster plan الرسمي الصادر من ${project.developer} قبل الحجز؛ الصفحة دي للمقارنة بين الوحدات وليست خريطة مساحية.`],
      ],
      faq: ({ project, location, priceSummary }) => [
        [`ما هي أسعار ${project.name}؟`, `${priceSummary} السعر النهائي والتوفر بيتأكدوا مع المطور وقت الطلب.`],
        [`أين يقع ${project.name}؟`, `المشروع مسجل عندنا في ${location}. موقع المرحلة والمدخل يختلف، لذلك راجع المخطط الرسمي للمطور قبل الحجز.`],
        [`فين ألاقي master plan ${project.name}؟`, `استخدم النسخة الرسمية من ${project.developer} لتأكيد المراحل والمداخل. الصفحة تعرض الوحدات والأسعار للمقارنة ولا تستبدل المخطط المساحي الرسمي.`],
      ],
    },
    en: {
      title: ({ project }) => `${project.name} — prices, location and units | Tycoons`,
      description: ({ project, location, priceSummary, unitCount }) => `${project.name} by ${project.developer} in ${location}. ${priceSummary} ${unitCount ? `Compare ${unitCount} available options, payment plans and delivery` : "Request current prices and payment plans"}, with guidance on confirming the location and master plan.`,
      sections: ({ project, location, priceSummary }) => [
        [`${project.name} prices`, `${priceSummary} These figures come from units currently listed in the Tycoons database and are reconfirmed with the developer because prices and availability change.`],
        [`${project.name} location and master plan`, `The Tycoons record places the project in ${location}. Confirm the exact phase, plot and nearest entrance on the official ${project.developer} master plan before reserving; this page compares inventory and is not a surveyed map.`],
      ],
      faq: ({ project, location, priceSummary }) => [
        [`What are the prices at ${project.name}?`, `${priceSummary} The final price and availability are reconfirmed with the developer on request.`],
        [`Where is ${project.name} located?`, `Our record places the project in ${location}. The phase and entrance can vary, so check the developer's official plan before reserving.`],
        [`Where can I find the ${project.name} master plan?`, `Use the official version from ${project.developer} to confirm phases and entrances. This page compares units and prices and does not replace the official surveyed plan.`],
      ],
    },
  },
};

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

const ENGLISH_GUIDES = {
  "new-cairo-property-prices": {
    title: "New Cairo Property Prices Guide 2026",
    description:
      "A practical guide to comparing New Cairo property prices, payment plans, finishing and delivery without relying on a misleading starting price.",
    summary:
      "A starting price does not describe the full deal. Compare the same unit type, size, finishing and delivery date, then review the total installment price, down payment, payment schedule and maintenance. Tycoons listings show current inventory, but final price and availability are reconfirmed when you enquire.",
    sections: [
      ["Compare the same unit type", "Do not compare a ground-floor apartment with a garden to a penthouse, or a fully finished unit to a core-and-shell unit, using price per square metre alone."],
      ["Separate price from financing", "A longer payment plan can include an implicit financing cost. Record the total price and timing of every payment before comparing alternatives."],
      ["Check finishing and delivery", "Finishing, delivery timing, maintenance and additional payments can materially change the effective cost even when two advertised starting prices look similar."],
      ["Verify the update date", "New Cairo inventory changes quickly. Treat any price without a recent update and availability confirmation as unsuitable for a final decision."],
    ],
  },
};

let cache = { units: null, fetchedAt: 0 };
let projectsCache = { projects: null, fetchedAt: 0 };

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
  const matched = AREAS.find((area) => area.match.test(value));
  if (matched) return { ...matched, indexable: true };
  return {
    slug: slugify(location),
    ar: String(location || "مصر"),
    en: String(location || "Egypt"),
    indexable: false,
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
  // Western digits in both languages: Egyptian buyers search "3,000,000" not "٣٬٠٠٠٬٠٠٠",
  // and titles/snippets should match the query.
  const formatted = new Intl.NumberFormat("en-EG", {
    maximumFractionDigits: 0,
  }).format(amount);
  return `${formatted} ${lang === "ar" ? "جنيه" : "EGP"}`;
}

function formatDate(value, lang) {
  const date = new Date(value || "");
  if (Number.isNaN(date.getTime())) return lang === "ar" ? "غير محدد" : "Not specified";
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-EG-u-nu-latn" : "en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

async function fetchUnits() {
  if (cache.units && Date.now() - cache.fetchedAt < 15 * 60 * 1000) return cache.units;
  const columns = [
    "id",
    "project_id",
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
    // Supabase returns at most 1,000 rows per request, so page through the inventory;
    // a single request silently dropped the most expensive units once stock passed 1,000.
    const rows = [];
    for (let offset = 0; offset < 10000; offset += 1000) {
      const params = new URLSearchParams({
        select: columns,
        availability_status: "eq.available",
        order: "starting_price.asc,id.asc",
        limit: "1000",
        offset: String(offset),
      });
      const response = await fetch(`${SUPABASE_URL}/rest/v1/units?${params}`, {
        headers: { apikey: SUPABASE_KEY, Accept: "application/json" },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`inventory ${response.status}`);
      const page = await response.json();
      if (!Array.isArray(page)) throw new Error("inventory invalid");
      rows.push(...page);
      if (page.length < 1000) break;
    }
    if (!rows.length) throw new Error("inventory empty");
    cache = { units: rows, fetchedAt: Date.now() };
    return rows;
  } catch (error) {
    if (cache.units) return cache.units;
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

// Canonical developer brands (Supabase `developers`): Arabic name, aliases, logo,
// website and a short verified intro. Cached like projects; pages work without it.
let developersCache = { rows: null, fetchedAt: 0 };
async function fetchDevelopers() {
  if (developersCache.rows && Date.now() - developersCache.fetchedAt < 15 * 60 * 1000) return developersCache.rows;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    // `website` and logo source URLs stay in Supabase only: the site never shows another website.
    const params = new URLSearchParams({ select: "slug,name,name_ar,aliases,parent_slug,logo_path,logo_on_dark,about_ar,about_en", limit: "500" });
    const response = await fetch(`${SUPABASE_URL}/rest/v1/developers?${params}`, {
      headers: { apikey: SUPABASE_KEY, Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`developers ${response.status}`);
    const rows = await response.json();
    if (!Array.isArray(rows)) throw new Error("developers invalid");
    developersCache = { rows, fetchedAt: Date.now() };
    return rows;
  } catch {
    return developersCache.rows || [];
  } finally {
    clearTimeout(timer);
  }
}

function developerInfo(nameOrSlug) {
  const rows = developersCache.rows || [];
  const key = String(nameOrSlug || "").trim().toLowerCase();
  if (!key) return null;
  return rows.find((row) => row.slug === key || slugify(row.name) === slugify(key)
    || (Array.isArray(row.aliases) && row.aliases.some((alias) => String(alias).trim().toLowerCase() === key || slugify(alias) === slugify(key)))) || null;
}

function brandLogoUrl(path) {
  return path ? `${SUPABASE_URL}/storage/v1/object/public/brand-logos/${String(path).split("/").map(encodeURIComponent).join("/")}` : "";
}

// The developer's logo is the brand shown on every one of its projects (Ahmed's rule:
// one company logo, never a different logo per project). Project-level logos stay in
// Supabase (projects.logo_path) for other uses but are not rendered.
function projectLogo(project) {
  const developer = developerInfo(project?.developer);
  if (developer?.logo_path) return { src: brandLogoUrl(developer.logo_path), dark: Boolean(developer.logo_on_dark), alt: `${developer.name} logo` };
  return null;
}

function logoBadge(logo, height = 28) {
  if (!logo) return "";
  return `<span class="brand-logo${logo.dark ? " on-dark" : ""}"><img src="${escapeHtml(logo.src)}" alt="${escapeHtml(logo.alt)}" height="${height}" loading="lazy" decoding="async"></span>`;
}

async function fetchProjectsMeta({ strict = false } = {}) {
  if (projectsCache.projects && Date.now() - projectsCache.fetchedAt < 15 * 60 * 1000) return projectsCache.projects;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8500);
  try {
    const params = new URLSearchParams({ select: "id,name,slug,developer,location,image_url,gallery_urls,targeting,logo_path,logo_on_dark", limit: "1000" });
    const response = await fetch(`${SUPABASE_URL}/rest/v1/projects?${params}`, {
      headers: { apikey: SUPABASE_KEY, Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`projects ${response.status}`);
    const rows = await response.json();
    if (!Array.isArray(rows)) throw new Error("projects invalid");
    projectsCache = { projects: rows, fetchedAt: Date.now() };
    return rows;
  } catch (error) {
    if (projectsCache.projects) return projectsCache.projects;
    if (strict) throw error;
    return [];
  } finally {
    clearTimeout(timer);
  }
}

// `units.project_name`/`units.developer` are free-text copies that can drift from the
// canonical `projects` table (renames, merges). When project metadata is available we key
// groups by the real `projects.slug` (via `unit.project_id`) so every project — including
// ones with zero currently-available units — gets a stable page instead of a slug computed
// from possibly-stale text, which silently 404s pages like /en/projects/<slug>.
function groupProjects(units, projectsMeta = []) {
  const grouped = new Map();
  const metaById = new Map();
  for (const meta of projectsMeta) {
    const slug = clean(meta.slug, "");
    if (!slug || !meta.id) continue;
    metaById.set(meta.id, { ...meta, slug });
    if (!grouped.has(slug)) {
      grouped.set(slug, {
        id: meta.id,
        slug,
        name: clean(meta.name, ""),
        developer: clean(meta.developer, "Tycoons verified developer"),
        location: clean(meta.location, ""),
        image_url: clean(meta.image_url, ""),
        gallery_urls: clean(meta.gallery_urls, ""),
        targeting: meta.targeting && typeof meta.targeting === "object" && !Array.isArray(meta.targeting) ? meta.targeting : {},
        logo_path: clean(meta.logo_path, ""),
        logo_on_dark: meta.logo_on_dark === true,
        units: [],
      });
    }
  }
  for (const unit of units) {
    const meta = unit.project_id ? metaById.get(unit.project_id) : null;
    if (meta) {
      grouped.get(meta.slug).units.push(unit);
      continue;
    }
    // Fallback for units without a resolvable project_id (or when project metadata failed
    // to load): keep the legacy text-derived grouping so nothing silently disappears.
    const name = clean(unit.project_name, "");
    const developer = clean(unit.developer, "Tycoons verified developer");
    if (!name || numberValue(unit.starting_price) <= 0) continue;
    const slug = projectSlug(name, developer);
    if (!grouped.has(slug)) grouped.set(slug, { slug, name, developer, location: "", units: [] });
    grouped.get(slug).units.push(unit);
  }
  return [...grouped.values()];
}

function projectLocation(project) {
  return clean(project.location, "") || clean(project.units.find((unit) => unit.location)?.location, "Egypt");
}

function projectImage(project) {
  const galleryImage = clean(project.gallery_urls, "")
    .split(",")
    .map((value) => value.trim())
    .find(Boolean);
  const verifiedImage = clean(project.image_url, "") || galleryImage || clean(project.units.find((unit) => unit.image_url)?.image_url, "");
  if (verifiedImage) return verifiedImage;

  const location = projectLocation(project).toLowerCase();
  if (/north coast|sahel|ras el|sokhna|alamein/.test(location)) return "/images/project-chalet.webp";
  if (/new cairo|mostakbal/.test(location)) return "/images/region-newcairo.webp";
  if (/zayed|october/.test(location)) return "/images/region-zayed.webp";
  if (/capital/.test(location)) return "/images/region-capital.webp";
  return "/images/project-apartment.webp";
}

function projectMinPrice(project) {
  const prices = project.units.map((unit) => numberValue(unit.starting_price)).filter(Boolean);
  return prices.length ? Math.min(...prices) : 0;
}

function projectMaxPrice(project) {
  const prices = project.units.map((unit) => numberValue(unit.starting_price)).filter(Boolean);
  return prices.length ? Math.max(...prices) : 0;
}

function hasAvailableUnits(project) {
  return project.units.length > 0;
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
    "@id": `${SITE_URL}/#organization`,
    name: "Tycoons Investments",
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/images/logo.png`,
      width: 512,
      height: 512,
    },
    image: `${SITE_URL}/images/hero.webp`,
    telephone: `+${WHATSAPP_NUMBER}`,
    // NAP: this address string must stay byte-identical to the Google Business
    // Profile listing. Changing it here without changing it there weakens the
    // local signal.
    address: {
      "@type": "PostalAddress",
      streetAddress: "Hyde Park Business District, Office 14, Fifth Settlement",
      addressLocality: "New Cairo",
      addressRegion: "Cairo",
      postalCode: "11835",
      addressCountry: "EG",
    },
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
  *{box-sizing:border-box}body{margin:0;background:var(--warm);color:var(--ink);font-family:Alexandria,Arial,"Noto Sans Arabic",sans-serif;line-height:1.75}a{color:inherit}
  header.site{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.9);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);box-shadow:0 8px 40px -12px rgba(20,30,25,.25)}.hd{display:flex;align-items:center;justify-content:space-between;gap:18px;height:66px;width:min(1180px,calc(100% - 32px));margin:auto}header.site a{text-decoration:none}.logo{display:flex;align-items:center;gap:11px;color:#182420}.badge{display:grid;place-items:center;width:40px;height:40px;border-radius:12px;background:#14352a}.badge img{width:24px;height:24px}.logo b{display:block;font-size:16px;letter-spacing:.18em;line-height:1.2}.logo small{display:block;font-size:9.5px;letter-spacing:.42em;color:#8a7a58;line-height:1.3}.nav{display:flex;align-items:center;gap:26px}.nav a{font-size:14px;font-weight:600;color:#3d4a43}.nav a:hover{color:var(--gold)}.nav a[aria-current="page"]{color:#14352a;box-shadow:inset 0 -2px 0 var(--gold);padding-bottom:3px}.acts{display:flex;align-items:center;gap:9px}.lang{display:flex;padding:3px;border-radius:999px;background:#ece3d0;font-size:11px;font-weight:700}.lang a{padding:4px 9px;border-radius:999px;color:#5c4f33}.lang a[aria-current="page"]{background:#fff}.wa{display:inline-flex;align-items:center;gap:7px;padding:9px 18px;border-radius:999px;background:#1faa59;color:#fff!important;font-size:14px;font-weight:700;box-shadow:0 10px 30px -8px rgba(31,170,89,.6)}.wa svg{width:16px;height:16px}.menu{display:none;position:relative}.menu summary{list-style:none;cursor:pointer;display:grid;place-items:center;width:40px;height:40px;border-radius:12px;background:#ece3d0;color:#14352a;font-size:20px}.menu summary::-webkit-details-marker{display:none}.menu div{position:absolute;top:48px;inset-inline-end:0;min-width:200px;padding:8px;border-radius:16px;background:#fff;box-shadow:0 20px 50px -20px rgba(0,0,0,.35);display:grid}.menu div a{padding:10px 14px;border-radius:10px;font-weight:600;color:#3d4a43}.menu div a[aria-current="page"]{background:#f6f1e7;color:#14352a}
  @media(max-width:980px){.nav{display:none}.menu{display:block}}@media(max-width:430px){.wa span{display:none}.wa{padding:10px}.logo small{display:none}}
  main{width:min(1120px,calc(100% - 32px));margin:auto;padding:34px 0 70px}.hero,.panel,.card,.table,.answer{background:#fff;border:1px solid var(--line);border-radius:24px}
  .hero{padding:clamp(24px,5vw,52px)}h1{margin:8px 0 18px;font-size:clamp(32px,5vw,54px);line-height:1.2;color:var(--green)}h2{margin:40px 0 16px;color:var(--green)}.lead{font-size:18px;color:var(--muted)}.eyebrow{color:#8a6630;font-weight:800}
  .answer{padding:22px 24px;margin:24px 0;background:#fffaf1}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.card{padding:18px;text-decoration:none}.card img{width:100%;height:180px;object-fit:cover;border-radius:16px}.card p{color:var(--muted)}.brand-logo{display:inline-flex;align-items:center;height:44px;padding:6px 12px;margin:12px 0 2px;border:1px solid var(--line);border-radius:12px;background:#fff}.brand-logo.on-dark{background:#0d1f18;border-color:#0d1f18}.brand-logo img,.card .brand-logo img{width:auto;height:28px;max-width:160px;object-fit:contain;border-radius:0}.hero .brand-logo{height:56px}.hero .brand-logo img{height:40px;max-width:220px}
  .facts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:24px}.fact{padding:14px;border:1px solid var(--line);border-radius:15px}.fact small{display:block;color:var(--muted)}.cta{display:inline-block;margin-top:18px;padding:11px 18px;border-radius:999px;background:#1faa59;color:#fff;text-decoration:none;font-weight:800}
  .table{overflow:auto}.table table{width:100%;min-width:760px;border-collapse:collapse}.table th,.table td{padding:13px 15px;text-align:start;border-bottom:1px solid var(--line)}.table th{background:#efe7d8}.updated,.note,.crumbs{font-size:13px;color:var(--muted)}
  .guide section{padding:22px 0;border-bottom:1px solid var(--line)}footer{padding:36px max(20px,calc((100% - 1180px)/2));background:var(--green);color:#fff}footer a{margin-inline-end:14px}
  @media(max-width:800px){.grid{grid-template-columns:1fr}.facts{grid-template-columns:1fr 1fr}main{width:min(100% - 24px,1120px);padding:24px 0 54px}.hero{padding:24px 20px;border-radius:20px}h1{font-size:clamp(30px,9vw,40px)}h2{margin-top:32px;font-size:28px}.lead{font-size:16px}.card{padding:16px}}
  `;
}


const WA_ICON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3a.4.4 0 0 0 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 2.9 2.9 0 0 0-.9 2.2 5 5 0 0 0 1 2.7 11.5 11.5 0 0 0 4.4 3.9c1.6.7 2.3.8 3.1.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.2c0-.1-.2-.2-.4-.3z"/></svg>';

// One header for every server-rendered page: same look, links and order as the homepage navbar.
function siteHeader(lang, path = "/", arHref = "", enHref = "") {
  const ar = lang === "ar";
  const links = ar
    ? [["الرئيسية", "/", "home"], ["المشاريع", "/ar/", "projects"], ["المناطق", "/ar/#areas", "areas"], ["المطورين", "/ar/#developers", "developers"], ["الأدلة", "/guides/", "guides"], ["من نحن", "/about", "about"]]
    : [["Home", "/en/", "home"], ["Projects", "/en/directory/", "projects"], ["Areas", "/en/directory/#areas", "areas"], ["Developers", "/en/directory/#developers", "developers"], ["Guides", "/en/guides/", "guides"], ["About", "/en/#about", "about"]];
  const p = String(path || "/");
  const active = /\/areas\//.test(p) ? "areas" : /\/developers\//.test(p) ? "developers" : /\/guides\b/.test(p) ? "guides"
    : /^\/(about|contact|methodology|corrections|privacy|faq)\b/.test(p) ? "about" : /^\/(ar\/|en\/directory|projects\/|en\/projects\/|units\/)/.test(p) ? "projects" : "";
  const nav = links.map(([label, href, key]) => `<a href="${href}"${key === active ? ' aria-current="page"' : ""}>${label}</a>`).join("");
  const arLink = arHref || "/";
  const enLink = enHref || "/en/";
  return `<header class="site"><div class="hd">
<a class="logo" href="${ar ? "/" : "/en/"}" aria-label="Tycoons Investments"><span class="badge"><img src="/images/logo-badge-gold.png" alt="" width="24" height="24"></span><span><b>TYCOONS</b><small>INVESTMENTS</small></span></a>
<nav class="nav" aria-label="${ar ? "القائمة الرئيسية" : "Main menu"}">${nav}</nav>
<div class="acts"><span class="lang" aria-label="${ar ? "اختيار اللغة" : "Choose language"}"><a href="${escapeHtml(arLink)}" lang="ar"${ar ? ' aria-current="page"' : ""}>عربي</a><a href="${escapeHtml(enLink)}" lang="en"${ar ? "" : ' aria-current="page"'}>EN</a></span>
<a class="wa" href="https://wa.me/${WHATSAPP_NUMBER}" rel="noopener">${WA_ICON}<span>${ar ? "واتساب" : "WhatsApp"}</span></a>
<details class="menu"><summary aria-label="${ar ? "القائمة" : "Menu"}">☰</summary><div>${nav}</div></details></div>
</div></header>`;
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
  canonicalPath = "",
}) {
  const ar = lang === "ar";
  const canonical = `${SITE_URL}${canonicalPath || path}`;
  const alternate = alternatePath ? `${SITE_URL}${alternatePath}` : "";
  return `<!doctype html>
<html lang="${lang}" dir="${ar ? "rtl" : "ltr"}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="icon" type="image/png" href="/images/logo.png">
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
  .map((schema) => `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", ...schema }).replace(/</g, "\\u003c")}</script>`)
  .join("")}
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alexandria:wght@400;600;700;800&display=swap">
<style>${styles()}</style></head><body>
${siteHeader(lang, path, ar ? canonical : alternate, ar ? alternate : canonical)}${body}
<footer><strong>Tycoons Investments</strong><p>${ar ? "بيانات الأسعار والتوفر استرشادية ويتم تأكيدها وقت الطلب. العوائد تقديرية وليست ضمانًا." : "Prices and availability are indicative and reconfirmed on request. Returns are estimates, not guarantees."}</p>
<a href="/methodology">${ar ? "منهجية البيانات" : "Methodology"}</a>
<a href="/corrections">${ar ? "سياسة التصحيح" : "Corrections"}</a>
<a href="/contact">${ar ? "تواصل معنا" : "Contact"}</a></footer>${String(body).includes("data-tycoons-search") ? '<script type="module" src="/assets/search-widget.js"></script>' : ""}</body></html>`;
}

function cards(projects, lang) {
  const ar = lang === "ar";
  return `<div class="grid">${projects
    .map((project) => {
      const image = projectImage(project);
      const projectPath = ar ? `/projects/${project.slug}` : `/en/projects/${project.slug}`;
      return `<a class="card" href="${projectPath}">
      ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(project.name)}" loading="lazy" width="640" height="360">` : ""}
      ${logoBadge(projectLogo(project))}
      <h3>${escapeHtml(project.name)}</h3><p>${escapeHtml(project.developer)} · ${escapeHtml(projectLocation(project))}</p>
      <strong>${ar ? "يبدأ من" : "Starting from"} ${escapeHtml(formatPrice(projectMinPrice(project), lang))}</strong></a>`;
    })
    .join("")}</div>`;
}

// Buyer-comparison numbers computed from the listed units (no invented data).
function pricePerSqm(unit) {
  const price = numberValue(unit.starting_price);
  const area = numberValue(unit.area_sqm);
  return price > 0 && area >= 20 ? Math.round(price / area) : 0;
}
function percentValue(text) {
  const match = String(text || "").match(/(\d+(?:\.\d+)?)\s*%/);
  return match ? Number(match[1]) : null;
}
function yearsValue(text) {
  const match = String(text || "").match(/(\d+(?:\.\d+)?)\s*(?:years?|yrs?|سنين|سنوات|سنة|عام)/i);
  return match ? Number(match[1]) : null;
}
function projectBuyerStats(units) {
  const perSqm = units.map(pricePerSqm).filter(Boolean).sort((a, b) => a - b);
  const downs = units.map((unit) => percentValue(unit.down_payment_text)).filter((v) => v !== null && v >= 0 && v <= 100);
  const years = units.map((unit) => yearsValue(unit.installments_text)).filter((v) => v && v <= 20);
  const median = perSqm.length ? perSqm[Math.floor((perSqm.length - 1) / 2)] : 0;
  return { minSqm: perSqm[0] || 0, medianSqm: median, minDown: downs.length ? Math.min(...downs) : null, maxYears: years.length ? Math.max(...years) : null, sqmCount: perSqm.length };
}
function millions(value) {
  const m = numberValue(value) / 1e6;
  return m >= 1 ? (Math.round(m * 10) / 10).toString() : "";
}

const FOCUS_DEVELOPERS = ["mountain-view", "sodic", "palm-hills-developments", "la-vista-developments", "hyde-park-developments", "ora-developers", "madinet-masr"];
const OTHER_AREA_AR = { "el-shorouk": "الشروق", "al-shorouk": "الشروق", alexandria: "الإسكندرية", "el-gouna": "الجونة", "downtown-cairo": "وسط القاهرة", "central-cairo": "وسط القاهرة", "suez-road": "طريق السويس" };

function unitCategories(project) {
  const found = new Set();
  for (const unit of project.units) {
    const t = String(unit.unit_type || "").toLowerCase();
    if (/chalet|شاليه/.test(t)) found.add("chalet");
    else if (/villa|فيلا|standalone/.test(t) && !/ivilla|i-villa/.test(t)) found.add("villa");
    else if (/town|twin|ths|تاون|توين/.test(t)) found.add("townhouse");
    else if (/duplex|ivilla|i-villa|دوبلكس/.test(t)) found.add("duplex");
    else if (/office|clinic|retail|shop|admin|commercial|مكتب|عيادة|محل|تجاري|إداري/.test(t)) found.add("commercial");
    else if (/apartment|millennial|penthouse|loft|studio|\bb\b|\d\s*b\b|شقة|بنتهاوس|استوديو/.test(t)) found.add("apartment");
  }
  return [...found];
}
const CATEGORY_LABEL = { apartment: ["شقق", "Apartments"], villa: ["فيلات", "Villas"], townhouse: ["تاون هاوس", "Townhouses"], duplex: ["دوبلكس", "Duplexes"], chalet: ["شاليهات", "Chalets"], commercial: ["تجاري وإداري", "Commercial"] };

function deliveryTag(project, ar) {
  const texts = project.units.map((unit) => String(unit.delivery_text || "")).filter(Boolean);
  if (!texts.length) return "";
  if (texts.some((t) => /ready|immediate|فوري|جاهز/i.test(t))) return ar ? "استلام فوري" : "Ready to move";
  const years = texts.map((t) => (t.match(/20\d\d/) || [])[0]).filter(Boolean).sort();
  if (years.length) return ar ? `استلام ${years[0]}` : `Delivery ${years[0]}`;
  const inYears = texts.map((t) => Number((t.match(/(\d+)\s*years?/i) || [])[1])).filter(Boolean).sort((x, y) => x - y)[0];
  if (inYears) return ar ? `استلام ${inYears} ${inYears > 2 ? "سنين" : "سنة"}` : `Delivery in ${inYears} years`;
  return "";
}

function developerKey(name) {
  const info = developerInfo(name);
  return info?.slug || slugify(String(name || "").replace(/\(.*?\)/g, ""));
}

function devDisplayName(name, lang) {
  const info = developerInfo(name);
  return lang === "ar" ? (info?.name_ar || info?.name || name) : (info?.name || name);
}

// One project card (photo, delivery tag, developer logo, price, unit types, CTAs) shared by
// the directory, area and developer pages. data-* attributes feed the CSS-only filters.
function projectCardHtml(project, lang) {
  const ar = lang === "ar";
  const href = ar ? `/projects/${project.slug}` : `/en/projects/${project.slug}`;
  const area = areaFor(projectLocation(project));
  const cats = unitCategories(project);
  const tag = deliveryTag(project, ar);
  const min = projectMinPrice(project);
  const ready = /استلام فوري|Ready/.test(tag);
  const message = encodeURIComponent(`${ar ? "أهلاً Tycoons، مهتم بمشروع" : "Hello Tycoons, I am interested in"} ${project.name}\n${SITE_URL}${href}`);
  return `<article class="pcard" data-area="${escapeHtml(area.slug)}" data-types="${cats.join(" ")}"${ready ? " data-ready" : ""}${min && min < 10000000 ? " data-u10" : ""}>
<div class="pimg"><a href="${href}" tabindex="-1" aria-hidden="true"><img src="${escapeHtml(projectImage(project))}" alt="" loading="lazy" width="400" height="190"></a>${tag ? `<span class="tag">${escapeHtml(tag)}</span>` : ""}${logoBadge(projectLogo(project), 28)}</div>
<div class="pbody"><h3><a href="${href}">${escapeHtml(project.name)}</a></h3><p class="ploc">${escapeHtml(area.indexable ? (ar ? area.ar : area.en) : projectLocation(project))} · ${escapeHtml(devDisplayName(project.developer, lang))}</p>
<p class="pprice">${min ? `${ar ? "يبدأ من" : "From"} <b>${escapeHtml(new Intl.NumberFormat("en-EG").format(min))}</b> ${ar ? "ج.م" : "EGP"}` : (ar ? "السعر عند الطلب" : "Price on request")}</p>
<div class="pmeta">${cats.slice(0, 3).map((cat) => `<span>${CATEGORY_LABEL[cat][ar ? 0 : 1]}</span>`).join("")}<span>${project.units.length} ${ar ? "وحدة متاحة" : "units available"}</span></div>
<div class="pcta"><a class="go" href="${href}">${ar ? "الوحدات والأسعار" : "Units & prices"}</a><a class="w" href="https://wa.me/${WHATSAPP_NUMBER}?text=${message}" rel="noopener">${ar ? "واتساب" : "WhatsApp"}</a></div></div></article>`;
}

// Server-rendered search box (works without JavaScript). /assets/search-widget.js
// upgrades it in place to the homepage's AI search bar with the voice agent.
function searchMount(lang, placeholder = "") {
  const ar = lang === "ar";
  const hint = placeholder || (ar ? "مثال: شقة في التجمع تحت 10 مليون ومقدم 5%" : "e.g. apartment in New Cairo under 10M");
  return `<div class="tsearch" data-tycoons-search data-lang="${ar ? "ar" : "en"}" data-placeholder="${escapeHtml(hint)}"><form class="dsearch" action="/search" method="get" role="search"><input name="q" type="search" aria-label="${ar ? "ابحث عن عقار" : "Search properties"}" placeholder="${escapeHtml(hint)}"><button type="submit">${ar ? "اعرض النتائج" : "Search"}</button></form></div>`;
}

function directoryStyles() {
  return `.dhero{background:linear-gradient(rgba(20,53,42,.86),rgba(20,53,42,.94)),url(/images/hero.webp) center/cover;color:#fff;padding:52px 0 58px}.dwrap{width:min(1180px,calc(100% - 32px));margin:auto}.dhero .crumbs,.dhero .crumbs a{color:#d8c9a8}.dhero h1{color:#fff;font-size:clamp(30px,4.6vw,46px);margin:10px 0 8px;font-weight:800}.dhero .lead{color:#dfe6e1;max-width:760px}
.dsearch{display:flex;gap:8px;margin-top:24px;max-width:860px;padding:8px;border-radius:18px;background:#fff;box-shadow:0 20px 50px -20px rgba(0,0,0,.5)}.dsearch input{flex:1;min-width:0;border:0;outline:0;padding:12px 14px;font:inherit;font-size:15px;color:var(--ink);background:transparent}.dsearch button{border:0;border-radius:12px;padding:0 26px;background:var(--gold);color:#fff;font:inherit;font-weight:700;cursor:pointer}
.stats{display:flex;flex-wrap:wrap;gap:16px 44px;margin-top:28px}.stats b{display:block;font-size:30px;font-weight:800;color:var(--gold);line-height:1.3}.stats span{font-size:13px;color:#cfd8d2}
.dmain{width:min(1180px,calc(100% - 32px));margin:auto;padding:12px 0 40px}.sh{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;margin:46px 0 18px}.sh h2{margin:0;font-size:28px}.sh p{margin:4px 0 0;color:var(--muted);font-size:14px}.more{flex:none;padding:8px 16px;border:1px solid var(--line);border-radius:999px;background:#fff;color:#14352a;font-weight:700;font-size:14px;text-decoration:none}
.areas{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}.area{position:relative;display:block;height:190px;border-radius:18px;overflow:hidden;color:#fff;text-decoration:none;background:#14352a}.area img{width:100%;height:100%;object-fit:cover}.area:after{content:"";position:absolute;inset:0;background:linear-gradient(transparent 25%,rgba(10,25,20,.9))}.area div{position:absolute;inset:auto 16px 14px;z-index:1}.area h3{margin:0;font-size:19px;line-height:1.4}.area span{font-size:13px;color:#e8dcc2}
.chips{display:flex;flex-wrap:wrap;gap:9px;margin-top:14px}.chip{padding:7px 15px;border:1px solid var(--line);border-radius:999px;background:#fff;color:var(--muted);font-size:13px;text-decoration:none}
.devs{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:12px}.dev{display:block;padding:16px 10px;border:1px solid var(--line);border-radius:16px;background:#fff;text-align:center;text-decoration:none}.dev .lg{display:grid;place-items:center;height:56px;border-radius:10px;padding:6px}.dev .lg.dark{background:#14352a}.dev .lg img{max-width:100%;max-height:44px;object-fit:contain}.dev .lg em{font-style:normal;font-weight:800;color:#14352a;font-size:14px}.dev b{display:block;margin-top:8px;font-size:14px}.dev span{font-size:12px;color:var(--muted)}
.alldevs{margin-top:16px;border:1px solid var(--line);border-radius:16px;background:#fff;padding:4px 16px}.alldevs summary{cursor:pointer;padding:12px 0;font-weight:700;color:#14352a}.alldevs div{display:flex;flex-wrap:wrap;gap:8px;padding:4px 0 16px}
.fbar{display:flex;flex-wrap:wrap;gap:9px;margin-bottom:18px}.fbar input{position:absolute;opacity:0;pointer-events:none}.fbar label{padding:8px 16px;border:1px solid var(--line);border-radius:999px;background:#fff;color:#3d4a43;font-size:13px;font-weight:700;cursor:pointer}.fbar input:checked+label{background:#14352a;border-color:#14352a;color:#fff}.fbar input:focus-visible+label{outline:2px solid var(--gold)}
.pgrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}.pcard{overflow:hidden;border:1px solid var(--line);border-radius:20px;background:#fff;box-shadow:0 14px 34px -24px rgba(20,30,25,.5)}.pimg{position:relative;height:190px;background:#e9e1d0}.pimg>a>img{width:100%;height:190px;object-fit:cover;display:block}.tag{position:absolute;top:12px;inset-inline-start:12px;padding:4px 11px;border-radius:999px;background:rgba(20,53,42,.92);color:#fff;font-size:12px}.pimg .brand-logo{position:absolute;bottom:-22px;inset-inline-end:14px;margin:0;height:44px;box-shadow:0 6px 16px -6px rgba(0,0,0,.3)}.pbody{padding:24px 18px 18px}.pbody h3{margin:0;font-size:18px;line-height:1.5}.pbody h3 a{text-decoration:none}.ploc{margin:2px 0 0;font-size:13px;color:var(--muted)}.pprice{margin:12px 0 0;font-size:13px;color:var(--muted)}.pprice b{font-size:21px;color:#14352a}.pmeta{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.pmeta span{padding:4px 9px;border-radius:8px;background:var(--warm);font-size:12px;color:#3d4a43}.pcta{display:flex;gap:8px;margin-top:14px}.pcta a{flex:1;padding:10px;border-radius:12px;text-align:center;font-weight:700;font-size:13px;text-decoration:none}.pcta .go{background:#14352a;color:#fff}.pcta .w{background:#e9f7ef;color:#137a3f}
.pgrid.lim .pcard:nth-child(n+13){display:none}#show-all:checked~.pgrid .pcard{display:block}.showall{text-align:center;margin-top:22px}.showall label{display:inline-block;cursor:pointer}#show-all:checked~.showall{display:none}
.guides3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.g3{display:block;padding:20px;border:1px solid var(--line);border-radius:16px;background:#fff;text-decoration:none}.g3 small{color:var(--gold);font-weight:700}.g3 h3{margin:6px 0 0;font-size:16px;line-height:1.7}
.tsearch{margin-top:24px;max-width:860px}.tsearch .dsearch{margin-top:0}.dhero .brand-logo{display:flex;width:max-content;margin:0 0 12px}.dhero .eyebrow{color:#d9b87c}.dchips{display:flex;flex-wrap:wrap;gap:10px}.dchip{display:inline-flex;align-items:center;gap:10px;padding:8px 14px;border:1px solid var(--line);border-radius:14px;background:#fff;text-decoration:none;font-weight:700;color:#14352a}.dchip img{height:26px;width:auto;max-width:110px;object-fit:contain}.dchip .dk{background:#14352a;border-radius:8px;padding:3px 6px}.dchip span{font-weight:400;color:var(--muted);font-size:13px}.dgroup{margin-top:26px}.dgroup h3{margin:0 0 14px;font-size:20px}.dgroup h3 a{text-decoration:none;color:#14352a}.dgroup h3 span{font-size:14px;color:var(--muted);font-weight:400}.prose{max-width:900px}.prose iframe{max-width:100%}
.band{margin-top:56px;background:#14352a;color:#fff;padding:36px 0}.band .dwrap{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:18px}.band h2{margin:0;color:#fff}.band p{margin:4px 0 0;color:#cfd8d2}
@media(max-width:980px){.areas{grid-template-columns:repeat(2,minmax(0,1fr))}.devs{grid-template-columns:repeat(4,minmax(0,1fr))}.pgrid,.guides3{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:620px){.areas{grid-template-columns:1fr 1fr;gap:10px}.area{height:150px}.area h3{font-size:16px}.devs{grid-template-columns:repeat(2,minmax(0,1fr))}.pgrid,.guides3{grid-template-columns:1fr}.dsearch{flex-direction:column}.dsearch button{padding:12px}.stats b{font-size:24px}.sh{flex-direction:column;align-items:flex-start}}`;
}

function renderDirectory(allProjects, lang, articles = []) {
  const ar = lang === "ar";
  const path = ar ? "/ar/" : "/en/directory/";
  const alternatePath = ar ? "/en/directory/" : "/ar/";
  const listedProjects = allProjects.filter(hasAvailableUnits);
  const unitCount = listedProjects.reduce((sum, project) => sum + project.units.length, 0);
  const lastUpdated = listedProjects.map(projectLastUpdated).filter(Boolean).sort().pop();
  const projectsPath = (project) => (ar ? `/projects/${project.slug}` : `/en/projects/${project.slug}`);
  const devName = (name) => { const info = developerInfo(name); return ar ? (info?.name_ar || info?.name || name) : (info?.name || name); };

  // Areas: the main indexable areas as photo cards, ordered by how many projects they have.
  const areaStats = new Map();
  const otherAreas = new Map();
  for (const project of listedProjects) {
    const area = areaFor(projectLocation(project));
    if (!area.indexable) {
      if (OTHER_AREA_AR[area.slug] || !ar) otherAreas.set(area.slug, ar ? OTHER_AREA_AR[area.slug] : area.en);
      continue;
    }
    const entry = areaStats.get(area.slug) || { area, projects: [], min: 0 };
    entry.projects.push(project);
    const min = projectMinPrice(project);
    if (min && (!entry.min || min < entry.min)) entry.min = min;
    areaStats.set(area.slug, entry);
  }
  const areaList = [...areaStats.values()].sort((a, b) => b.projects.length - a.projects.length);
  const areaImage = (entry) => {
    const top = [...entry.projects].sort((a, b) => b.units.length - a.units.length).find((project) => clean(project.image_url, ""));
    return top ? projectImage(top) : projectImage(entry.projects[0]);
  };
  const areaCards = areaList.map((entry) => `<a class="area" href="/${lang}/areas/${entry.area.slug}"><img src="${escapeHtml(areaImage(entry))}" alt="${escapeHtml(ar ? entry.area.ar : entry.area.en)}" loading="lazy" width="400" height="190"><div><h3>${escapeHtml(ar ? entry.area.ar : entry.area.en)}</h3><span>${entry.projects.length} ${ar ? (entry.projects.length > 10 || entry.projects.length < 3 ? "مشروع" : "مشاريع") : "projects"}${entry.min ? ` · ${ar ? "من" : "from"} ${escapeHtml(formatPrice(entry.min, lang))}` : ""}</span></div></a>`).join("");
  const otherAreaChips = [...new Set(otherAreas.values())].filter(Boolean).slice(0, 10);

  // Developers: the seven focus brands with logos first, then everyone else (deduplicated).
  const devGroups = new Map();
  for (const project of listedProjects) {
    const key = developerKey(project.developer);
    const entry = devGroups.get(key) || { key, name: project.developer, slug: slugify(project.developer), count: 0 };
    entry.count += 1;
    devGroups.set(key, entry);
  }
  const focus = FOCUS_DEVELOPERS.map((slug) => devGroups.get(slug)).filter(Boolean);
  const devCards = focus.map((entry) => {
    const info = developerInfo(entry.name);
    const logo = info?.logo_path ? `<img src="${escapeHtml(brandLogoUrl(info.logo_path))}" alt="${escapeHtml(`${info.name} logo`)}" loading="lazy">` : `<em>${escapeHtml(devName(entry.name))}</em>`;
    return `<a class="dev" href="/${lang}/developers/${info?.slug || entry.slug}"><span class="lg${info?.logo_on_dark ? " dark" : ""}">${logo}</span><b>${escapeHtml(devName(entry.name))}</b><span>${entry.count} ${ar ? (entry.count > 10 || entry.count < 3 ? "مشروع" : "مشاريع") : "projects"}</span></a>`;
  }).join("");
  const others = [...devGroups.values()].filter((entry) => !FOCUS_DEVELOPERS.includes(entry.key)).sort((a, b) => developerRank(a.name) - developerRank(b.name) || b.count - a.count || a.name.localeCompare(b.name));

  // Projects: every listed project is in the HTML (crawlable); CSS-only filters and "show all".
  const sorted = [...listedProjects].sort((a, b) => developerRank(a.developer) - developerRank(b.developer) || b.units.length - a.units.length);
  const topAreas = areaList.slice(0, 3).map((entry) => entry.area);
  const filters = [
    ["all", ar ? "الكل" : "All", ""],
    ...topAreas.map((area) => [`a-${area.slug}`, ar ? area.ar : area.en, `.pcard:not([data-area="${area.slug}"])`]),
    ["ready", ar ? "استلام فوري" : "Ready to move", ".pcard:not([data-ready])"],
    ["apartment", ar ? "شقق" : "Apartments", '.pcard:not([data-types~="apartment"])'],
    ["villa", ar ? "فيلات" : "Villas", '.pcard:not([data-types~="villa"])'],
    ["chalet", ar ? "شاليهات" : "Chalets", '.pcard:not([data-types~="chalet"])'],
    ["u10", ar ? "أقل من 10 مليون" : "Under 10M EGP", ".pcard:not([data-u10])"],
  ];
  const filterCss = filters.filter(([, , rule]) => rule).map(([id, , rule]) => `.dproj:has(#f-${id}:checked) .pcard{display:block}.dproj:has(#f-${id}:checked) ${rule}{display:none}`).join("")
    + ".dproj:has(.fbar input:checked:not(#f-all)) .showall{display:none}";
  const filterBar = `<div class="fbar" role="radiogroup" aria-label="${ar ? "فلترة المشاريع" : "Filter projects"}">${filters.map(([id, label], index) => `<input type="radio" name="pf" id="f-${id}"${index === 0 ? " checked" : ""}><label for="f-${id}">${escapeHtml(label)}</label>`).join("")}</div>`;
  const projectCards = sorted.map((project) => projectCardHtml(project, lang)).join("");

  const guideList = (articles || []).filter((article) => (article.language || "ar") === lang && article.slug && article.title).slice(0, 3);
  const guideCards = guideList.length
    ? guideList.map((article) => `<a class="g3" href="${lang === "en" ? "/en" : ""}/guides/${escapeHtml(article.slug)}/"><small>${ar ? "دليل" : "Guide"}</small><h3>${escapeHtml(article.title)}</h3></a>`).join("")
    : Object.entries(ar ? GUIDES : ENGLISH_GUIDES).slice(0, 3).map(([slug, guide]) => `<a class="g3" href="${ar ? "" : "/en"}/guides/${slug}/"><small>${ar ? "دليل" : "Guide"}</small><h3>${escapeHtml(guide.title || guide.h1 || slug)}</h3></a>`).join("");

  const title = ar
    ? `دليل المشاريع العقارية في مصر 2026 — ${listedProjects.length} مشروع بالأسعار | Tycoons`
    : `Egypt Property Projects 2026 — ${listedProjects.length} Projects with Prices | Tycoons`;
  const description = ar
    ? `قارن ${listedProjects.length} مشروع عقاري و${unitCount} وحدة متاحة في التجمع الخامس والساحل الشمالي والشيخ زايد ومستقبل سيتي: الأسعار والمساحات وأنظمة السداد والاستلام من المطورين مباشرة.`
    : `Compare ${listedProjects.length} property projects and ${unitCount} available units in New Cairo, North Coast, Sheikh Zayed and Mostakbal City: prices, sizes, payment plans and delivery, direct from developers.`;
  const body = `<style>${directoryStyles()}${filterCss}</style>
<section class="dhero"><div class="dwrap"><p class="crumbs"><a href="${ar ? "/" : "/en/"}">${ar ? "الرئيسية" : "Home"}</a> ‹ ${ar ? "دليل المشاريع" : "Project directory"}</p>
<h1>${ar ? "دليل المشاريع العقارية في مصر 2026" : "Egypt property project directory 2026"}</h1>
<p class="lead">${ar ? `قارن ${listedProjects.length} مشروع من أكبر المطورين بالأسعار المحدّثة والمساحات وأنظمة السداد ومواعيد الاستلام — من مخزون المطورين مباشرة.` : `Compare ${listedProjects.length} projects from Egypt's leading developers by updated price, size, payment plan and delivery — straight from developer inventory.`}</p>
${searchMount(lang)}
<div class="stats"><div><b>${listedProjects.length}</b><span>${ar ? "مشروع متاح" : "projects"}</span></div><div><b>${new Intl.NumberFormat("en-EG").format(unitCount)}</b><span>${ar ? "وحدة محدّثة" : "units"}</span></div><div><b>${devGroups.size}</b><span>${ar ? "مطور عقاري" : "developers"}</span></div>${lastUpdated ? `<div><b>${escapeHtml(formatDate(lastUpdated, lang))}</b><span>${ar ? "آخر تحديث للأسعار" : "last price update"}</span></div>` : ""}</div>
</div></section>
<main class="dmain">
<div class="sh" id="areas"><div><h2>${ar ? "استكشف حسب المنطقة" : "Explore by area"}</h2><p>${ar ? "أسعار البداية من الوحدات المتاحة حاليًا" : "Starting prices from currently available units"}</p></div></div>
<div class="areas">${areaCards}</div>
${otherAreaChips.length ? `<div class="chips"><span class="chip">${ar ? "مناطق تانية:" : "Other areas:"}</span>${[...otherAreas.entries()].filter(([, name]) => name).filter(([, name], i, list) => list.findIndex(([, n]) => n === name) === i).slice(0, 10).map(([slug, name]) => `<a class="chip" href="/${lang}/areas/${escapeHtml(slug)}">${escapeHtml(name)}</a>`).join("")}</div>` : ""}
<div class="sh" id="developers"><div><h2>${ar ? "أشهر المطورين" : "Leading developers"}</h2><p>${ar ? "لوجو الشركة بيظهر على كل مشاريعها" : "Each developer's logo appears on all of its projects"}</p></div></div>
<div class="devs">${devCards}</div>
<details class="alldevs"><summary>${ar ? `كل المطورين (${devGroups.size})` : `All developers (${devGroups.size})`}</summary><div>${others.map((entry) => `<a class="chip" href="/${lang}/developers/${escapeHtml(entry.slug)}">${escapeHtml(devName(entry.name))} · ${entry.count}</a>`).join("")}</div></details>
<section class="dproj" aria-labelledby="projects-h"><div class="sh"><div><h2 id="projects-h">${ar ? "المشاريع المتاحة" : "Available projects"}</h2><p>${ar ? "اختار فلتر عشان تضيّق النتايج" : "Pick a filter to narrow the list"}</p></div></div>
${filterBar}<input type="checkbox" id="show-all" hidden><div class="pgrid lim">${projectCards}</div>
<div class="showall"><label class="more" for="show-all">${ar ? `اعرض كل المشاريع (${listedProjects.length})` : `Show all projects (${listedProjects.length})`}</label></div></section>
<div class="sh"><div><h2>${ar ? "أدلة تساعدك تقرر" : "Guides to help you decide"}</h2></div><a class="more" href="${ar ? "/guides/" : "/en/guides/"}">${ar ? "كل الأدلة ←" : "All guides →"}</a></div>
<div class="guides3">${guideCards}</div>
</main>
<div class="band"><div class="dwrap"><div><h2>${ar ? "محتار بين مشروعين؟" : "Torn between two projects?"}</h2><p>${ar ? "ابعتلنا الميزانية والمنطقة ونرشحلك أنسب 3 مشاريع." : "Send us your budget and preferred area and we'll shortlist the best 3 projects."}</p></div><a class="wa" href="https://wa.me/${WHATSAPP_NUMBER}" rel="noopener">${WA_ICON}<span>${ar ? "كلمنا على واتساب" : "Chat on WhatsApp"}</span></a></div></div>`;
  return renderPage({
    lang,
    title,
    description,
    path,
    alternatePath,
    body,
    schemas: [
      { "@context": "https://schema.org", "@type": "CollectionPage", name: title, url: `${SITE_URL}${path}`, description, inLanguage: ar ? "ar-EG" : "en", ...(lastUpdated ? { dateModified: lastUpdated } : {}) },
      { "@context": "https://schema.org", "@type": "ItemList", name: ar ? "المشاريع المتاحة" : "Available projects", numberOfItems: sorted.length, itemListElement: sorted.slice(0, 50).map((project, index) => ({ "@type": "ListItem", position: index + 1, name: project.name, url: `${SITE_URL}${projectsPath(project)}` })) },
    ],
  });
}

function renderProject(projects, slug, lang, article = null) {
  const project = projects.find((item) => item.slug === slug);
  if (!project) return null;
  const ar = lang === "ar";
  const path = ar ? `/projects/${slug}` : `/en/projects/${slug}`;
  const alternatePath = ar ? `/en/projects/${slug}` : `/projects/${slug}`;
  const location = projectLocation(project);
  const area = areaFor(location);
  const image = projectImage(project);
  const updated = projectLastUpdated(project);
  const units = [...new Map(project.units.map((unit) => [
    [unit.unit_type, unit.bedrooms_text, unit.area_sqm, unit.starting_price].join("|"),
    unit,
  ])).values()].slice(0, 60);
  const minPrice = projectMinPrice(project);
  const maxPrice = projectMaxPrice(project);
  const hasUnits = units.length > 0;
  const buyer = projectBuyerStats(units);
  const priceSummary = hasUnits
    ? (ar
      ? `الأسعار الظاهرة بتبدأ من ${formatPrice(minPrice, lang)} وبتوصل إلى ${formatPrice(maxPrice, lang)} عبر ${units.length} خيار.`
      : `Currently listed prices range from ${formatPrice(minPrice, lang)} to ${formatPrice(maxPrice, lang)} across ${units.length} options.`)
    : (ar ? "لا توجد أسعار تفصيلية منشورة حاليًا." : "No detailed prices are currently published.");
  const localizedContent = localizedProjectContent(project,lang);
  // Leaders' title pattern: project + intent words + year + "from" price, Western digits.
  const minM = millions(minPrice);
  const defaultTitle = ar
    ? `${project.name}: الأسعار وأنظمة السداد 2026${minM ? ` — من ${minM} مليون` : ""} | Tycoons`
    : `${project.name} Prices & Payment Plans 2026${minM ? ` — from EGP ${minM}M` : ""} | Tycoons`;
  const searchContent = PROJECT_SEARCH_CONTENT[slug]?.[lang];
  const contentVars = { project, location, priceSummary, unitCount: units.length };
  const description = localizedContent?.seo_description || searchContent?.description?.(contentVars) || (ar
    ? `${project.name} من ${project.developer} في ${location}. قارن الوحدات المتاحة والأسعار وخطط السداد والاستلام.`
    : `${project.name} by ${project.developer} in ${location}. Compare available units, prices, payment plans and delivery.`);
  const crumbs = [
    { name: ar ? "الرئيسية" : "Home", path: "/" },
    { name: ar ? area.ar : area.en, path: `/${lang}/areas/${area.slug}` },
    { name: project.developer, path: `/${lang}/developers/${slugify(project.developer)}` },
    { name: project.name, path },
  ];
  const message = encodeURIComponent(
    `Hello Tycoons Investments,\nI am interested in this project:\n\nProject: ${project.name}\nDeveloper: ${project.developer}\nLocation: ${location}\nStarting price: ${formatPrice(projectMinPrice(project), "en")}\nStatus: Available\n\nURL: ${SITE_URL}${path}\n\nPlease send me available options and details.\n\nSource: project_page\nPage: ${SITE_URL}${path}`,
  );
  const extraSections = localizedContent?.article_sections?.length
    ? renderLocalizedSections(localizedContent.article_sections,{escapeHtml,replaceTokens:(value)=>value})
    : (searchContent?.sections?.(contentVars) || [])
    .map(([heading, text]) => `<section><h2>${escapeHtml(heading)}</h2><p>${escapeHtml(text)}</p></section>`)
    .join("");
  const projectFaq = localizedContent?.faq?.length?localizedContent.faq.map((item)=>[item.question,item.answer]):(searchContent?.faq?.(contentVars) || []);
  const visibleProjectFaq = localizedContent?.article_sections?.length ? [] : projectFaq;
  const body = `<main><p class="crumbs">${crumbs.map((item) => `<a href="${item.path}">${escapeHtml(item.name)}</a>`).join(" / ")}</p>
  <section class="hero">${logoBadge(projectLogo(project), 40)}<span class="eyebrow">${escapeHtml(project.developer)} · ${escapeHtml(location)}</span><h1>${escapeHtml(localizedContent?.h1 || project.name)}</h1><p class="lead">${escapeHtml(description)}</p>
  ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(`${project.name} — ${location}`)}" width="960" height="540" style="width:100%;max-height:460px;object-fit:cover;border-radius:20px" fetchpriority="high">` : ""}
  <div class="facts">${hasUnits ? `<div class="fact"><small>${ar ? "يبدأ من" : "Starting from"}</small><strong>${escapeHtml(formatPrice(minPrice, lang))}</strong></div>
  <div class="fact"><small>${ar ? "أعلى سعر ظاهر" : "Highest listed price"}</small><strong>${escapeHtml(formatPrice(projectMaxPrice(project), lang))}</strong></div>
  <div class="fact"><small>${ar ? "الخيارات" : "Options"}</small><strong>${units.length}</strong></div>${buyer.medianSqm ? `<div class="fact"><small>${ar ? "متوسط سعر المتر" : "Median price per m²"}</small><strong>${escapeHtml(formatPrice(buyer.medianSqm, lang))}</strong></div>` : ""}${buyer.minDown !== null ? `<div class="fact"><small>${ar ? "أقل مقدم" : "Lowest down payment"}</small><strong>${buyer.minDown}%</strong></div>` : ""}${buyer.maxYears ? `<div class="fact"><small>${ar ? "أطول فترة تقسيط" : "Longest instalment plan"}</small><strong>${buyer.maxYears} ${ar ? (buyer.maxYears > 2 && buyer.maxYears < 11 ? "سنين" : "سنة") : "years"}</strong></div>` : ""}` : `<div class="fact"><small>${ar ? "الأسعار" : "Pricing"}</small><strong>${ar ? "تواصل معنا لأحدث سعر" : "Contact us for the latest price"}</strong></div>`}
  <div class="fact"><small>${ar ? "آخر تحديث" : "Last updated"}</small><strong>${escapeHtml(formatDate(updated, lang))}</strong></div></div>
  <a class="cta" href="https://wa.me/${WHATSAPP_NUMBER}?text=${message}">${ar ? "اطلب أحدث Availability" : "Request current availability"}</a></section>${extraSections}
  ${article && article.body_markdown ? `<section id="article"><span class="eyebrow">${ar ? "دليل Tycoons — تمت مراجعته قبل النشر" : "Tycoons guide — reviewed before publication"}</span><h2>${escapeHtml(article.title)}</h2>${article.excerpt ? `<p class="lead">${escapeHtml(article.excerpt)}</p>` : ""}${renderSafeMarkdown(publicEditorialMarkdown(article.body_markdown, ar))}</section>` : ""}
  ${(() => { const info = developerInfo(project.developer); const about = info && (ar ? info.about_ar : info.about_en); return about ? `<section><h2>${ar ? `عن المطور: ${escapeHtml(info.name_ar || info.name)}` : `About the developer: ${escapeHtml(info.name)}`}</h2><p>${escapeHtml(about)}</p><p><a href="/${lang}/developers/${escapeHtml(info.slug)}">${ar ? "كل مشاريع المطور" : "All projects by this developer"}</a></p></section>` : ""; })()}
  <h2>${ar ? "الوحدات المتاحة" : "Available units"}</h2>${
    hasUnits
      ? `<div class="table"><table><thead><tr><th>${ar ? "النوع" : "Type"}</th><th>${ar ? "الغرف / المساحة" : "Beds / area"}</th><th>${ar ? "السعر" : "Price"}</th><th>${ar ? "سعر المتر" : "Per m²"}</th><th>${ar ? "المقدم" : "Down payment"}</th><th>${ar ? "التقسيط" : "Installments"}</th><th>${ar ? "الاستلام" : "Delivery"}</th></tr></thead><tbody>
  ${units.map((unit) => `<tr><td>${escapeHtml(clean(unit.unit_type))}</td><td>${escapeHtml(clean(unit.bedrooms_text))}${unit.area_sqm ? ` · ${escapeHtml(unit.area_sqm)} m²` : ""}</td><td>${escapeHtml(formatPrice(unit.starting_price, lang))}</td><td>${pricePerSqm(unit) ? escapeHtml(new Intl.NumberFormat("en-EG").format(pricePerSqm(unit))) : "—"}</td><td>${escapeHtml(clean(unit.down_payment_text))}</td><td>${escapeHtml(clean(unit.installments_text))}</td><td>${escapeHtml(clean(unit.delivery_text))}</td></tr>`).join("")}
  </tbody></table></div>`
      : `<p class="note">${ar ? `لا توجد وحدات منشورة بأسعار تفصيلية لـ${project.name} حاليًا. تواصل معنا على واتساب وسنرسل لك أحدث قائمة أسعار وخطط سداد متاحة من ${project.developer}.` : `No units with detailed pricing are published for ${project.name} right now. Message us on WhatsApp and we'll send the latest price list and payment plans from ${project.developer}.`}</p>`
  }<p class="note">${ar ? "الأسعار والتوفر يتغيران؛ يتم التأكيد مع المطور وقت الطلب." : "Prices and availability change and are reconfirmed with the developer on request."}</p>
  ${visibleProjectFaq.map(([question, answer]) => `<section><h2>${escapeHtml(question)}</h2><p>${escapeHtml(answer)}</p></section>`).join("")}</main>`;
  const unitNavigation = hasUnits
    ? `<section aria-labelledby="unit-links"><h2 id="unit-links">${ar ? "روابط الوحدات المتاحة" : "Available unit links"}</h2><div class="grid">${units.map((unit) => `<article class="card"><h3><a href="${escapeHtml(unitPath({ ...unit, project_slug: project.slug }))}">${escapeHtml(clean(unit.unit_type))}${unit.area_sqm ? ` - ${escapeHtml(unit.area_sqm)} m²` : ""}</a></h3><p>${escapeHtml(clean(unit.bedrooms_text))} · ${escapeHtml(formatPrice(unit.starting_price, lang))}</p><p>${escapeHtml(clean(unit.delivery_text))}</p></article>`).join("")}</div></section>`
    : "";

  return renderPage({
    lang,
    title: localizedContent?.seo_title || searchContent?.title?.(contentVars) || defaultTitle,
    description,
    path,
    alternatePath,
    body: body.replace("</main>", `${unitNavigation}</main>`),
    image,
    robots: hasUnits
      ? "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"
      : "noindex,follow",
    schemas: [
      breadcrumbSchema(crumbs),
      ...buildProjectSchemas({ url: `${SITE_URL}${path}`, name: project.name, projectSlug: project.slug, location, description,
        title: localizedContent?.seo_title || searchContent?.title?.(contentVars) || defaultTitle,
        language: lang, images: image ? [image] : [], modified: updated, units,
        articleSections: localizedContent?.article_sections?.length ? localizedContent.article_sections :
          (searchContent?.sections?.(contentVars) || []).map(([heading, paragraph]) => ({ heading, paragraphs: [paragraph] })),
      }),
      ...(projectFaq.length
        ? [{
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: projectFaq.map(([name, text]) => ({ "@type": "Question", name, acceptedAnswer: { "@type": "Answer", text } })),
          }]
        : []),
    ],
  });
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
  const pricePerSqm = area > 0 ? Math.round(price / area) : 0;
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
  return { price, area, pricePerSqm, minPrice, maxPrice, minArea, maxArea, priceRank, sizeRank, siblingCount: siblings.length };
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

const UNIT_FAQ_PRICE_BANK = [
  (u) => `السعر يبدأ من ${u.price} لمساحة ${u.area} م²، حسب آخر تحديث بتاريخ ${u.updated}. السعر والتوفر يحتاجان تأكيد وقت الطلب.`,
  (u) => `أحدث سعر مسجّل عندنا لـ${u.unitType} في ${u.projectName} يبدأ من ${u.price} (${u.area} م²)، وآخر تحديث كان ${u.updated}. راجع التوفر مع فريقنا قبل الحجز.`,
];

const UNIT_FAQ_AREA_BANK = [
  (u) => u.buyerNote,
  (u) => `${u.buyerNote} ده جزء من تقييمنا العام لمنطقة ${u.areaAr}، مش توصية استثمارية مضمونة.`,
];

function renderUnitFaq(unit, project, stats, area, unitTypeAr, priceFmt, updatedText) {
  const seed = unit.id || `${unit.project_name}-${unit.unit_type}-${unit.area_sqm}`;
  const faq = [
    [
      `كام سعر ${unitTypeAr} في ${project.name}؟`,
      pick(UNIT_FAQ_PRICE_BANK, seed, "price")({
        price: priceFmt,
        area: clean(unit.area_sqm, "—"),
        unitType: unitTypeAr,
        projectName: project.name,
        updated: updatedText,
      }),
    ],
    [
      "إيه خطة السداد المتاحة؟",
      `${clean(unit.down_payment_text, "المقدم يُحدَّد حسب المشروع.")} ${clean(unit.installments_text, "الأقساط تُحدَّد حسب المشروع وموعد الاستلام.")}`,
    ],
    ["امتى الاستلام؟", clean(unit.delivery_text, "موعد الاستلام يتأكد مع المطور وقت الطلب.")],
    [
      `هل ${area.ar} مكان مناسب للسكن أو الاستثمار؟`,
      pick(UNIT_FAQ_AREA_BANK, seed, "area")({ buyerNote: area.buyerNote, areaAr: area.ar }),
    ],
  ];
  if (stats.siblingCount > 0) {
    faq.push([
      `فيه بدائل تانية في ${project.name}؟`,
      `أيوه، عندنا ${stats.siblingCount} وحدة تانية متاحة حاليًا في نفس المشروع بمساحات وأسعار مختلفة — شوف الجدول أسفل أو صفحة المشروع الكاملة.`,
    ]);
  }
  return faq;
}

function renderUnit(projects, unitId, lang = "ar") {
  // unitId is the URL parameter: a readable slug (8-hex prefix + words) or a legacy UUID.
  const unit = findUnitByParam(projects.flatMap((item) => item.units), unitId);
  const project = unit ? projects.find((item) => item.units.includes(unit)) : null;
  if (!unit || !project) return null;
  unitId = clean(unit.id, "");

  const ar = lang === "ar";
  const path = unitPath({ ...unit, project_slug: project.slug });
  const location = clean(unit.location, projectLocation(project));
  const area = areaFor(location);
  const areaFacts = AREA_FACTS[area.slug] || GENERIC_AREA_FACTS;
  const unitTypeAr = clean(unit.unit_type);
  const siblings = project.units.filter((row) => clean(row.id, "") !== unitId);
  const stats = unitStats(unit, siblings);
  const priceFmt = formatPrice(unit.starting_price, lang);
  const updated = clean(unit.last_updated_at, "");
  const updatedText = formatDate(updated, lang);
  const seed = unit.id || `${unit.project_name}-${unit.unit_type}-${unit.area_sqm}`;

  const introVars = {
    unitType: unitTypeAr,
    area: clean(unit.area_sqm, "—"),
    projectName: project.name,
    developer: project.developer,
    areaAr: area.ar,
    rank: rankClause(stats),
    price: priceFmt,
    delivery: clean(unit.delivery_text, "يتأكد مع المطور"),
    installments: clean(unit.installments_text, "تُحدَّد حسب المشروع"),
  };
  const intro = pick(UNIT_INTRO_BANK, seed, "intro")(introVars);

  const title = `${unitTypeAr} ${clean(unit.area_sqm, "")} م² في ${project.name} | Tycoons`;
  const description = `${unitTypeAr} في ${project.name} بسعر يبدأ من ${priceFmt}. اعرف المساحة وخطة السداد والتشطيب والبدائل القريبة.`;

  const crumbs = [
    { name: ar ? "الرئيسية" : "Home", path: "/" },
    { name: ar ? area.ar : area.en, path: `/${lang}/areas/${area.slug}` },
    { name: project.developer, path: `/${lang}/developers/${slugify(project.developer)}` },
    { name: project.name, path: ar ? `/projects/${project.slug}` : `/en/projects/${project.slug}` },
    { name: unitTypeAr, path },
  ];

  const alternates = [...siblings]
    .sort((a, b) => Math.abs(numberValue(a.starting_price) - stats.price) - Math.abs(numberValue(b.starting_price) - stats.price))
    .slice(0, 4);

  const faq = renderUnitFaq(unit, project, stats, area, unitTypeAr, priceFmt, updatedText);

  const message = encodeURIComponent(
    `Hello Tycoons Investments,\nI am interested in this available unit:\n\nProject: ${project.name}\nDeveloper: ${project.developer}\nLocation: ${location}\nUnit type: ${unit.unit_type}\nBedrooms: ${clean(unit.bedrooms_text, "Not specified")}\nArea: ${unit.area_sqm} sqm\nStarting price: ${formatPrice(unit.starting_price, "en")}\n\nURL: ${SITE_URL}${path}\n\nPlease send me the latest availability and payment plan.\n\nSource: unit_page\nPage: ${SITE_URL}${path}`,
  );

  const body = `<main><p class="crumbs">${crumbs.map((item) => `<a href="${item.path}">${escapeHtml(item.name)}</a>`).join(" / ")}</p>
  <section class="hero"><span class="eyebrow">${escapeHtml(project.developer)} · ${escapeHtml(area.ar)}</span><h1>${escapeHtml(`${unitTypeAr} ${clean(unit.area_sqm, "")} م² في ${project.name}`)}</h1>
  <p class="lead">${escapeHtml(intro)}</p>
  <div class="facts"><div class="fact"><small>${ar ? "السعر يبدأ من" : "Starting from"}</small><strong>${escapeHtml(priceFmt)}</strong></div>
  <div class="fact"><small>${ar ? "المساحة" : "Area"}</small><strong>${escapeHtml(clean(unit.area_sqm, "—"))} م²</strong></div>
  <div class="fact"><small>${ar ? "الغرف" : "Bedrooms"}</small><strong>${escapeHtml(clean(unit.bedrooms_text, "غير محدد"))}</strong></div>
  <div class="fact"><small>${ar ? "آخر تحديث" : "Last updated"}</small><strong>${escapeHtml(updatedText)}</strong></div></div>
  <a class="cta" href="https://wa.me/${WHATSAPP_NUMBER}?text=${message}">${ar ? "تأكيد السعر والمتاح" : "Confirm price and availability"}</a></section>

  <h2>عن المنطقة — ${escapeHtml(area.ar)}</h2><p>${escapeHtml(areaFacts.context)}</p><p class="note">${escapeHtml(areaFacts.buyerNote)}</p>

  ${alternates.length ? `<h2>بدائل قريبة داخل ${escapeHtml(project.name)}</h2><div class="table"><table><thead><tr><th>النوع</th><th>الغرف / المساحة</th><th>السعر</th></tr></thead><tbody>
  ${alternates.map((row) => `<tr><td>${escapeHtml(clean(row.unit_type))}</td><td>${escapeHtml(clean(row.bedrooms_text))}${row.area_sqm ? ` · ${escapeHtml(row.area_sqm)} م²` : ""}</td><td>${escapeHtml(formatPrice(row.starting_price, lang))}</td></tr>`).join("")}
  </tbody></table></div><p class="note"><a href="/projects/${escapeHtml(project.slug)}">شوف كل وحدات ${escapeHtml(project.name)}</a></p>` : `<p class="note"><a href="/projects/${escapeHtml(project.slug)}">شوف كل وحدات ${escapeHtml(project.name)}</a></p>`}

  <h2>أسئلة شائعة</h2>${faq.map(([q, a]) => `<section><h3>${escapeHtml(q)}</h3><p>${escapeHtml(a)}</p></section>`).join("")}
  <p class="note">الأسعار والتوفر وخطط السداد تتغير ويتم تأكيدها مع المطور وقت الطلب.</p></main>`;

  const entityNavigation = `<nav class="crumbs" aria-label="Entity navigation"><a href="/${lang}/areas/${area.slug}">${escapeHtml(ar ? area.ar : area.en)}</a> / <a href="/${lang}/developers/${slugify(project.developer)}">${escapeHtml(project.developer)}</a> / <a href="${ar ? `/projects/${project.slug}` : `/en/projects/${project.slug}`}">${escapeHtml(project.name)}</a>${alternates.map((row) => ` / <a href="${escapeHtml(unitPath({ ...row, project_slug: project.slug }))}">${escapeHtml(clean(row.unit_type))}</a>`).join("")}</nav>`;

  return renderPage({
    lang,
    title,
    description,
    path,
    body: `${entityNavigation}${body}`,
    image: clean(unit.image_url, "") || clean(project.image_url, ""),
    schemas: [
      breadcrumbSchema(crumbs),
      {
        "@context": "https://schema.org",
        "@type": "RealEstateListing",
        "@id": `${SITE_URL}${path}#listing`,
        url: `${SITE_URL}${path}`,
        name: `${unitTypeAr} في ${project.name}`,
        description: intro,
        dateModified: updated || undefined,
        offers: { "@type": "Offer", price: stats.price, priceCurrency: "EGP", availability: "https://schema.org/InStock" },
        accommodation: {
          "@type": "Accommodation",
          floorSize: unit.area_sqm ? { "@type": "QuantitativeValue", value: numberValue(unit.area_sqm), unitCode: "MTK" } : undefined,
          numberOfRooms: numberValue(unit.bedrooms_text) || undefined,
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faq.map(([name, text]) => ({ "@type": "Question", name, acceptedAnswer: { "@type": "Answer", text } })),
      },
    ],
  });
}

function renderCollection(projects, kind, slug, lang, guides = []) {
  const ar = lang === "ar";
  const matches =
    kind === "area"
      ? projects.filter((project) => hasAvailableUnits(project) && areaFor(projectLocation(project)).slug === slug)
      : projects.filter((project) => hasAvailableUnits(project) && slugify(project.developer) === slug);
  if (!matches.length) return null;
  // Best-known developers first (see _developer-rank.cjs), then the cheaper project.
  matches.sort((a, b) => developerRank(a.developer) - developerRank(b.developer) || (projectMinPrice(a) || Infinity) - (projectMinPrice(b) || Infinity));
  const area = kind === "area" ? areaFor(projectLocation(matches[0])) : null;
  const rawAreaFacts = kind === "area" ? AREA_FACTS[area.slug] || GENERIC_AREA_FACTS : null;
  const areaFacts = rawAreaFacts && !ar
    ? { context: rawAreaFacts.contextEn || rawAreaFacts.context, buyerNote: rawAreaFacts.buyerNoteEn || rawAreaFacts.buyerNote }
    : rawAreaFacts;
  const devInfo = kind === "developer" ? developerInfo(slug) || developerInfo(matches[0].developer) : null;
  const label = kind === "area" ? (ar ? area.ar : area.en) : (ar ? devInfo?.name_ar || devInfo?.name : devInfo?.name) || matches[0].developer;
  const plural = matches.length === 1 ? (ar ? "مشروع واحد" : "1 project") : ar ? `${matches.length} مشروع` : `${matches.length} projects`;
  const path = `/${lang}/${kind === "area" ? "areas" : "developers"}/${slug}`;
  const alternatePath = `/${ar ? "en" : "ar"}/${kind === "area" ? "areas" : "developers"}/${slug}`;
  const numericPrices = matches.flatMap((project) =>
    project.units.map((unit) => numberValue(unit.starting_price)).filter(Boolean));
  const min = numericPrices.length ? Math.min(...numericPrices) : 0;
  const max = numericPrices.length ? Math.max(...numericPrices) : 0;
  const minFmt = formatPrice(min, lang);
  const searchContent = kind === "area" ? AREA_SEARCH_CONTENT[area.slug]?.[lang] : null;
  const editorial = kind === "developer" ? developerContent(slug, lang) : null;
  const devAreas = kind === "developer"
    ? [...new Set(matches.map((project) => { const a = areaFor(projectLocation(project)); return a.indexable ? (ar ? a.ar : a.en) : ""; }).filter(Boolean))].slice(0, 4)
    : [];
  const devTitle = devInfo && (ar
    ? `مشاريع ${devInfo.name_ar || devInfo.name} (${devInfo.name}) 2026 — الأسعار وأنظمة السداد | Tycoons`
    : `${devInfo.name} Projects 2026 — Prices, Compounds & Payment Plans | Tycoons`);
  const devDescription = devInfo && (ar
    ? `${plural} من ${devInfo.name_ar || devInfo.name} بأسعار تبدأ من ${minFmt}${devAreas.length ? ` في ${devAreas.join(" و")}` : ""}. قارن الكمبوندات والوحدات المتاحة وأنظمة السداد والاستلام في مكان واحد.`
    : `${plural} by ${devInfo.name} starting from ${minFmt}${devAreas.length ? ` in ${devAreas.join(", ")}` : ""}. Compare compounds, available units, payment plans and delivery in one place.`);
  const legacyTitle = devTitle || searchContent?.title?.({ minFmt, plural }) || (ar
    ? `مشاريع ${label} 2026 — أسعار من ${minFmt} (${plural}) | Tycoons`
    : `${label} projects 2026 — prices from ${minFmt} (${plural}) | Tycoons`);
  const legacyDescription = devDescription || searchContent?.description?.({ minFmt, plural }) || (ar
    ? `${plural} في ${label} بأسعار تبدأ من ${minFmt}. قارن السعر والمساحة وخطة السداد والاستلام لكل مشروع في مكان واحد.`
    : `${plural} in ${label} starting from ${minFmt}. Compare price, size, payment plan and delivery for each project in one place.`);
  const title = editorial?.seo_title || legacyTitle;
  const description = editorial?.seo_description || legacyDescription;
  const crumbs = [
    { name: ar ? "الرئيسية" : "Home", path: "/" },
    { name: label, path },
  ];
  const contextSection =
    kind === "area"
      ? `<h2>${ar ? `عن ${escapeHtml(label)}` : `About ${escapeHtml(label)}`}</h2><p>${escapeHtml(areaFacts.context)}</p><p class="note">${escapeHtml(areaFacts.buyerNote)}</p>${searchContent?.map ? `<section><h2>${escapeHtml(searchContent.map.heading)}</h2><iframe title="${escapeHtml(searchContent.map.heading)}" src="https://www.google.com/maps?q=${encodeURIComponent(searchContent.map.query)}&amp;output=embed" width="100%" height="360" style="border:0;border-radius:16px" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe><p><a href="https://www.google.com/maps/search/?api=1&amp;query=${encodeURIComponent(searchContent.map.query)}" target="_blank" rel="noopener">${ar ? "افتح الخريطة على Google Maps" : "Open in Google Maps"}</a></p></section>` : ""}${(searchContent?.sections || []).map(([heading, text]) => `<section><h2>${escapeHtml(heading)}</h2><p>${escapeHtml(text)}</p></section>`).join("")}`
      : devInfo && (ar ? devInfo.about_ar : devInfo.about_en)
        ? `<h2>${ar ? `عن ${escapeHtml(devInfo.name_ar || devInfo.name)}` : `About ${escapeHtml(devInfo.name)}`}</h2><p>${escapeHtml(ar ? devInfo.about_ar : devInfo.about_en)}</p>`
        : "";
  const editorialSection = editorial?.sections?.length ? renderLocalizedSections(editorial.sections, { escapeHtml, replaceTokens: (value) => value }) : "";
  // Buyer-question guides about this area's projects (or the area itself), linked under the FAQ.
  const matchIds = new Set(matches.map((project) => String(project.id || "")).filter(Boolean));
  const areaGuides = kind === "area" ? (Array.isArray(guides) ? guides : []).filter((guide) => guide && guide.slug && guide.title
    && ((guide.project_id && matchIds.has(String(guide.project_id))) || (guide.target_type === "area" && areaFor(guide.area_name || "").slug === slug))).slice(0, 12) : [];
  const areaGuidesHtml = areaGuides.length
    ? `<section aria-labelledby="area-buyer-questions"><h2 id="area-buyer-questions">${ar ? `عايز تفاصيل أكتر؟ أسئلة المشترين عن ${escapeHtml(label)}` : `Buyer questions about ${escapeHtml(label)}`}</h2><ul>${areaGuides.map((guide) => `<li><a href="${escapeHtml(editorialGuidePath(guide))}">${escapeHtml(guide.title)}</a></li>`).join("")}</ul></section>`
    : "";
  const projectUnitCount = matches.reduce((total, project) => total + project.units.length, 0);
  const branches = kind === "area"
    ? [...new Map(matches.map((project) => [slugify(project.developer), {
        slug: slugify(project.developer),
        label: project.developer,
        projects: matches.filter((item) => slugify(item.developer) === slugify(project.developer)),
      }])).values()].sort((a, b) => developerRank(a.label) - developerRank(b.label) || b.projects.length - a.projects.length)
    : [...new Map(matches.map((project) => {
        const projectArea = areaFor(projectLocation(project));
        return [projectArea.slug, {
          slug: projectArea.slug,
          label: ar ? projectArea.ar : projectArea.en,
          projects: matches.filter((item) => areaFor(projectLocation(item)).slug === projectArea.slug),
        }];
      })).values()];
  const branchHeading = kind === "area"
    ? (ar ? `المطورون ومشاريعهم في ${label}` : `Developers and their projects in ${label}`)
    : (ar ? `مشاريع ${label} حسب المنطقة` : `${label} projects by area`);
  // Area pages: the developers active here, with their logos. Developer pages: the projects
  // grouped by area, each as a photo card that opens the project page with all its units.
  const branchHtml = kind === "area"
    ? `<div class="sh" id="developers"><div><h2>${escapeHtml(branchHeading)}</h2></div></div><div class="dchips">${branches.map((branch) => {
        const info = developerInfo(branch.label);
        const logo = info?.logo_path ? `<img class="${info.logo_on_dark ? "dk" : ""}" src="${escapeHtml(brandLogoUrl(info.logo_path))}" alt="" loading="lazy">` : "";
        return `<a class="dchip" href="/${lang}/developers/${branch.slug}">${logo}${escapeHtml(devDisplayName(branch.label, lang))} <span>${branch.projects.length} ${ar ? (branch.projects.length > 2 && branch.projects.length < 11 ? "مشاريع" : "مشروع") : (branch.projects.length === 1 ? "project" : "projects")}</span></a>`;
      }).join("")}</div>`
    : `<div class="sh" id="projects"><div><h2>${escapeHtml(branchHeading)}</h2><p>${ar ? "اضغط على أي مشروع تشوف كل وحداته وأسعارها وأنظمة السداد" : "Open any project to see all its units, prices and payment plans"}</p></div></div>${branches.map((branch) => `<section class="dgroup"><h3><a href="/${lang}/areas/${branch.slug}">${escapeHtml(branch.label)}</a> <span>· ${branch.projects.length} ${ar ? (branch.projects.length > 2 && branch.projects.length < 11 ? "مشاريع" : "مشروع") : (branch.projects.length === 1 ? "project" : "projects")}</span></h3><div class="pgrid">${branch.projects.map((project) => projectCardHtml(project, lang)).join("")}</div></section>`).join("")}`;
  const faq =
    kind === "area"
      ? [
          [
            ar ? `كام سعر شقة أو وحدة في ${label}؟` : `How much does a unit cost in ${label}?`,
            ar
              ? `الأسعار الظاهرة حاليًا في ${label} بتتراوح من ${minFmt} لحد ${escapeHtml(formatPrice(max, lang))} حسب المشروع والمساحة ونوع الوحدة، وده بناءً على ${plural} مسجّلة عندنا. السعر النهائي يتأكد مع المطور وقت الطلب.`
              : `Listed prices in ${label} currently range from ${minFmt} to ${escapeHtml(formatPrice(max, lang))} depending on the project, size and unit type, based on ${plural} in our inventory. Confirm the final price with the developer at inquiry time.`,
          ],
          [
            ar ? `هل ${label} منطقة مناسبة للسكن أو الاستثمار؟` : `Is ${label} a good area to live in or invest?`,
            areaFacts.buyerNote,
          ],
          [
            ar ? `كام مشروع متاح حاليًا في ${label}؟` : `How many projects are currently available in ${label}?`,
            ar
              ? `عندنا ${plural} مسجّلة حاليًا في ${label} في قاعدة بياناتنا، وبيتم تحديثها باستمرار — شوف القائمة كاملة تحت.`
              : `We currently have ${plural} listed in ${label} in our database, updated continuously — see the full list below.`,
          ],
          ...(searchContent?.faq || []),
        ]
      : devInfo
        ? [
            [
              ar ? `أسعار مشاريع ${label} بتبدأ من كام؟` : `What is the starting price of ${label} projects?`,
              ar
                ? `أقل سعر ظاهر حاليًا في مشاريع ${label} عندنا ${minFmt}، وأعلى سعر ${escapeHtml(formatPrice(max, lang))}، حسب المشروع ونوع الوحدة. السعر النهائي يتأكد مع المطور وقت الطلب.`
                : `The lowest price currently listed for ${label} projects is ${minFmt} and the highest is ${escapeHtml(formatPrice(max, lang))}, depending on the project and unit type. Confirm the final price with the developer at inquiry time.`,
            ],
            [
              ar ? `كام مشروع لـ ${label} متاح حاليًا؟` : `How many ${label} projects are available now?`,
              ar
                ? `عندنا ${plural} لـ ${label} فيها وحدات متاحة دلوقتي${devAreas.length ? `، في ${devAreas.join(" و")}` : ""}. القائمة كاملة تحت.`
                : `We have ${plural} by ${label} with units available now${devAreas.length ? `, in ${devAreas.join(", ")}` : ""}. The full list is below.`,
            ],
            [
              ar ? `إزاي أحجز وحدة في مشاريع ${label}؟` : `How do I reserve a unit in a ${label} project?`,
              ar
                ? `اختار المشروع والوحدة من القائمة، وكلّم فريق Tycoons على واتساب يأكدلك السعر ونظام السداد والتوافر وقت طلبك قبل أي دفع.`
                : `Pick the project and unit from the list, then message the Tycoons team on WhatsApp to confirm the price, payment plan and availability before any payment.`,
            ],
          ]
        : [];
  const heroLogo = devInfo?.logo_path ? logoBadge({ src: brandLogoUrl(devInfo.logo_path), dark: Boolean(devInfo.logo_on_dark), alt: `${devInfo.name} logo` }, 40) : "";
  const placeholder = kind === "area"
    ? (ar ? `مثال: شقة في ${label} تحت 10 مليون ومقدم 5%` : `e.g. apartment in ${label} under 10M`)
    : (ar ? `مثال: فيلا من ${label} في التجمع تحت 20 مليون` : `e.g. ${label} villa in New Cairo under 20M`);
  const stat = (value, labelText) => `<div><b>${escapeHtml(value)}</b><span>${escapeHtml(labelText)}</span></div>`;
  const areaProjects = kind === "area"
    ? `<div class="sh" id="projects"><div><h2>${ar ? `المشاريع المتاحة في ${escapeHtml(label)}` : `Available projects in ${escapeHtml(label)}`}</h2><p>${ar ? "اضغط على أي مشروع تشوف كل وحداته وأسعارها وأنظمة السداد" : "Open any project to see all its units, prices and payment plans"}</p></div></div><input type="checkbox" id="show-all" hidden><div class="pgrid lim">${matches.map((project) => projectCardHtml(project, lang)).join("")}</div>${matches.length > 12 ? `<div class="showall"><label class="more" for="show-all">${ar ? `اعرض كل المشاريع (${matches.length})` : `Show all projects (${matches.length})`}</label></div>` : ""}`
    : "";
  const body = `<style>${directoryStyles()}</style>
<section class="dhero"><div class="dwrap"><p class="crumbs">${crumbs.map((item) => `<a href="${item.path}">${escapeHtml(item.name)}</a>`).join(" ‹ ")}</p>${heroLogo}<span class="eyebrow">${kind === "area" ? (ar ? "دليل منطقة" : "Area guide") : (ar ? "دليل مطور" : "Developer guide")}</span>
<h1>${escapeHtml(editorial?.h1 || label)}</h1><p class="lead">${escapeHtml(description)}</p>
${searchMount(lang, placeholder)}
<div class="stats">${stat(plural, ar ? "متاحة دلوقتي" : "available now")}${stat(new Intl.NumberFormat("en-EG").format(projectUnitCount), ar ? "وحدة متاحة" : "available units")}${min ? stat(minFmt, ar ? "أقل سعر ظاهر" : "lowest listed") : ""}${max ? stat(formatPrice(max, lang), ar ? "أعلى سعر ظاهر" : "highest listed") : ""}</div></div></section>
<main class="dmain">
  ${areaProjects}
  ${branchHtml}
  <div class="prose">
  ${contextSection}
  ${editorialSection}
  ${faq.length ? `<h2>${ar ? "أسئلة شائعة" : "Frequently asked questions"}</h2>${faq.map(([q, a]) => `<section><h3>${escapeHtml(q)}</h3><p>${escapeHtml(a)}</p></section>`).join("")}` : ""}
  ${areaGuidesHtml}
  <p class="note">${ar ? "النطاق مبني على الوحدات الظاهرة وليس تقييمًا للسوق بالكامل." : "The range is based on listed units and is not a valuation of the whole market."}</p></div></main>
<div class="band"><div class="dwrap"><div><h2>${ar ? `محتار بين مشاريع ${escapeHtml(label)}؟` : `Not sure which ${escapeHtml(label)} project fits?`}</h2><p>${ar ? "ابعتلنا الميزانية ونرشحلك أنسب 3 مشاريع." : "Send us your budget and we'll shortlist the best 3 projects."}</p></div><a class="wa" href="https://wa.me/${WHATSAPP_NUMBER}" rel="noopener">${WA_ICON}<span>${ar ? "كلمنا على واتساب" : "Chat on WhatsApp"}</span></a></div></div>`;
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
      ...(devInfo ? [{
        "@context": "https://schema.org",
        "@type": "Organization",
        name: devInfo.name,
        alternateName: [...new Set([devInfo.name_ar, ...(Array.isArray(devInfo.aliases) ? devInfo.aliases : [])].filter((value) => value && value !== devInfo.name))],
        ...(devInfo.logo_path ? { logo: brandLogoUrl(devInfo.logo_path) } : {}),
        ...(devInfo.about_en || devInfo.about_ar ? { description: ar ? devInfo.about_ar : devInfo.about_en } : {}),
      }] : []),
      ...(searchContent?.map ? [{
        "@context": "https://schema.org",
        "@type": "Place",
        name: label,
        address: { "@type": "PostalAddress", addressLocality: searchContent.map.locality, addressCountry: "EG" },
        hasMap: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchContent.map.query)}`,
        url: `${SITE_URL}${path}`,
      }] : []),
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
            url: `${SITE_URL}${ar ? `/projects/${project.slug}` : `/en/projects/${project.slug}`}`,
          })),
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: branchHeading,
        numberOfItems: branches.length,
        itemListElement: branches.map((branch, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: branch.label,
          url: `${SITE_URL}/${lang}/${kind === "area" ? "developers" : "areas"}/${branch.slug}`,
        })),
      },
      ...(faq.length
        ? [
            {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: faq.map(([name, text]) => ({ "@type": "Question", name, acceptedAnswer: { "@type": "Answer", text } })),
            },
          ]
        : []),
    ],
  });
}

function renderGuide(slug, lang = "ar") {
  const ar = lang !== "en";
  const guide = ar ? GUIDES[slug] : ENGLISH_GUIDES[slug];
  if (!guide) return null;
  const path = ar ? `/guides/${slug}/` : `/en/guides/${slug}/`;
  const alternatePath = ar && ENGLISH_GUIDES[slug]
    ? `/en/guides/${slug}/`
    : (!ar && GUIDES[slug] ? `/guides/${slug}/` : undefined);
  const guideIndex = ar ? "/guides/off-plan-buying-checklist" : "/en/guides/new-cairo-property-prices/";
  const modified = slug === "new-cairo-property-prices" ? "2026-08-26" : "2026-07-26";
  const body = `<main class="guide"><p class="crumbs"><a href="/">${ar ? "الرئيسية" : "Home"}</a> / <a href="${guideIndex}">${ar ? "الأدلة" : "Guides"}</a> / ${escapeHtml(guide.title)}</p>
  <section class="hero"><span class="eyebrow">${ar ? "دليل قرار عقاري · راجعه فريق Tycoons" : "Property decision guide · reviewed by Tycoons"}</span><h1>${escapeHtml(guide.title)}</h1><p class="lead">${escapeHtml(guide.description)}</p><div class="answer">${escapeHtml(guide.summary)}</div><p class="updated">${ar ? `آخر مراجعة: ${modified === "2026-08-26" ? "26 أغسطس 2026" : "26 يوليو 2026"}` : `Last reviewed: ${modified}`}</p></section>
  ${guide.sections.map(([title, text]) => `<section><h2>${escapeHtml(title)}</h2><p>${escapeHtml(text)}</p></section>`).join("")}
  <section><h2>${ar ? "ملاحظة مهمة" : "Important note"}</h2><p>${ar ? "المحتوى تعليمي وليس استشارة قانونية أو مالية. الأسعار والتوفر والعوائد تتغير، ويفضل مراجعة العقد مع محامٍ مستقل وإعادة تأكيد البيانات وقت القرار." : "This content is educational, not legal or financial advice. Prices, availability and returns change; reconfirm the data and have an independent lawyer review the contract before deciding."}</p><p><a href="/methodology">${ar ? "اقرأ منهجية البيانات والحسابات" : "Read our data and calculation methodology"}</a></p></section></main>`;
  return renderPage({
    lang,
    title: `${guide.title} | Tycoons Investments`,
    description: guide.description,
    path,
    alternatePath,
    body,
    schemas: [
      breadcrumbSchema([
        { name: ar ? "الرئيسية" : "Home", path: "/" },
        { name: ar ? "الأدلة" : "Guides", path: guideIndex },
        { name: guide.title, path },
      ]),
      {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: guide.title,
        description: guide.description,
        datePublished: ar ? "2026-07-26" : modified,
        dateModified: modified,
        inLanguage: ar ? "ar-EG" : "en",
        image: `${SITE_URL}/images/hero.webp`,
        author: { "@type": "Organization", name: "Tycoons Investments", url: `${SITE_URL}/about` },
        reviewedBy: { "@type": "Organization", name: "Tycoons Investments" },
        publisher: {
          "@type": "Organization",
          "@id": `${SITE_URL}/#organization`,
          name: "Tycoons Investments",
          url: SITE_URL,
          logo: { "@type": "ImageObject", url: `${SITE_URL}/images/logo.png`, width: 512, height: 512 },
        },
        mainEntityOfPage: `${SITE_URL}${path}`,
      },
    ],
  });
}

// The stored body keeps the exact reviewed fact lines (the review contract binds
// unit, value and source date). Visitors get the same facts without internal
// review wording, with readable prices.
function publicEditorialMarkdown(markdown, ar) {
  const money = (value) => String(value).replace(/(\d{4,})\s*EGP/g, (_, digits) => `${Number(digits).toLocaleString("en-US")} ${ar ? "جنيه" : "EGP"}`);
  return String(markdown || "").split("\n").map((line) => {
    let next = line;
    if (/^##\s+حقائق تجارية موثقة للمراجعة\s*$/.test(next)) return "## الأسعار وخطط السداد (تُؤكَّد وقت الطلب)";
    if (/^##\s+Sourced commercial facts for review\s*$/i.test(next)) return "## Prices and payment terms (reconfirmed on request)";
    next = next
      .replace(/\s—\s(?:الحالة في بيانات المصدر|source status):\s*available\s(?=—)/, " ")
      .replace(/\s—\s(?:يجب التحقق منه قبل النشر|must be verified before publication)\.?\s*$/, "")
      .replace(/(?:تاريخ المصدر):\s*(\d{4}-\d{2}-\d{2})\.?/, "آخر تحديث: $1")
      .replace(/(?:source updated):\s*(\d{4}-\d{2}-\d{2})\.?/, "last updated: $1");
    return /^-\s/.test(next) ? money(next) : next;
  }).join("\n");
}

function editorialGuidePath(article) {
  return article.language === "en" ? `/en/guides/${article.slug}/` : `/guides/${article.slug}/`;
}

// /guides/ and /en/guides/: one hub linking every buyer guide and published article,
// so guides are no longer orphans and crawlers have a single entry point.
function renderGuidesIndex(lang = "ar", articles = []) {
  const ar = lang !== "en";
  const path = ar ? "/guides/" : "/en/guides/";
  const alternatePath = ar ? "/en/guides/" : "/guides/";
  const staticGuides = Object.entries(ar ? GUIDES : ENGLISH_GUIDES).map(([slug, guide]) => ({
    title: guide.title, description: guide.description, href: ar ? `/guides/${slug}/` : `/en/guides/${slug}/`,
  }));
  const published = (Array.isArray(articles) ? articles : [])
    .filter((article) => article && article.slug && article.title && (ar ? article.language !== "en" : article.language === "en"))
    .map((article) => ({ title: article.title, description: article.excerpt || "", href: editorialGuidePath(article) }));
  const items = [...staticGuides, ...published];
  const title = ar ? `أدلة شراء العقارات في مصر 2026 — ${items.length} دليل | Tycoons` : `Egypt Property Buying Guides 2026 — ${items.length} guides | Tycoons`;
  const description = ar
    ? "كل أدلة Tycoons لشراء عقار في مصر: الأسعار، خطط السداد، الشراء تحت الإنشاء، ودليل لكل مشروع عن موقعه ووحداته ولمين يناسب."
    : "All Tycoons guides to buying property in Egypt: prices, payment plans, off-plan buying, and project guides on location, units and who each project suits.";
  const crumbs = [
    { name: ar ? "الرئيسية" : "Home", path: "/" },
    { name: ar ? "الأدلة" : "Guides", path },
  ];
  const list = items.map((item) => `<li style="margin:0 0 14px"><a href="${escapeHtml(item.href)}"><strong>${escapeHtml(item.title)}</strong></a>${item.description ? `<br><span class="note">${escapeHtml(item.description)}</span>` : ""}</li>`).join("");
  const body = `<main><p class="crumbs">${crumbs.map((item) => `<a href="${item.path}">${escapeHtml(item.name)}</a>`).join(" / ")}</p><section class="hero"><span class="eyebrow">Tycoons Investments</span><h1>${ar ? "أدلة شراء العقارات في مصر" : "Egypt property buying guides"}</h1><p class="lead">${escapeHtml(description)}</p></section><ul style="list-style:none;padding:0;margin-top:24px">${list}</ul></main>`;
  return renderPage({
    lang,
    title,
    description,
    path,
    alternatePath,
    body,
    schemas: [
      breadcrumbSchema(crumbs),
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: title,
        url: `${SITE_URL}${path}`,
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: items.length,
          itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.title, url: `${SITE_URL}${item.href}` })),
        },
      },
    ],
  });
}

// `translation` is the published counterpart in the other language (same
// translation_key), or null. Only then are hreflang alternates emitted.
// `extras.project` is the article's public project row ({name, slug, developer,
// location, image_url}); `extras.related` other published guides about it.
function editorialArticleView(article, translation = null, extras = {}) {
  if (!article || article.status !== "published" || !article.published_at || !article.reviewed_at) return null;
  const project = extras.project && extras.project.slug && extras.project.name ? extras.project : null;
  const related = (Array.isArray(extras.related) ? extras.related : []).filter((item) => item && item.slug && item.title && item.slug !== article.slug).slice(0, 8);
  const lang = article.language === "en" ? "en" : "ar";
  const ar = lang === "ar";
  const path = editorialGuidePath(article);
  const pair = translation && translation.status === "published" && translation.slug && translation.language !== article.language
    && article.translation_key && translation.translation_key === article.translation_key ? translation : null;
  const reviewedDate = new Date(article.reviewed_at).toISOString().slice(0, 10);
  const takeaways = (Array.isArray(article.key_takeaways) ? article.key_takeaways : []).map((item) => String(item || "").trim()).filter(Boolean).slice(0, 6);
  const faq = (Array.isArray(article.faq) ? article.faq : [])
    .map((item) => [String(item?.question || "").trim(), String(item?.answer || "").trim()])
    .filter(([question, answer]) => question && answer).slice(0, 10);
  // Only a real image file may become og:image / Article.image (never a page URL).
  const image = /^https:\/\/[^\s"'<>?#]+\.(?:jpe?g|png|webp|avif|gif)(?:\?[^\s"'<>]*)?$/i.test(String(article.hero_image_url || "")) ? String(article.hero_image_url) : "";
  const takeawaysHtml = takeaways.length
    ? `<div class="answer" id="key-takeaways"><h2>${ar ? "الخلاصة" : "Key takeaways"}</h2><ul>${takeaways.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>`
    : "";
  const webSources = (Array.isArray(article.source_refs) ? article.source_refs : [])
    .filter((ref) => ref?.type === "web" && /^https:\/\/[^\s"'<>]+$/.test(String(ref.url || "")) && String(ref.label || "").trim())
    .slice(0, 12);
  const webSourcesHtml = webSources.length
    ? `<section aria-labelledby="guide-sources"><h2 id="guide-sources">${ar ? "المصادر" : "Sources"}</h2><ul>${webSources.map((ref) => `<li>${escapeHtml(String(ref.label).slice(0, 160))}</li>`).join("")}</ul></section>`
    : "";
  const faqHtml = faq.length
    ? `<section aria-labelledby="guide-faq"><h2 id="guide-faq">${ar ? "أسئلة شائعة" : "Frequently asked questions"}</h2>${faq.map(([question, answer]) => `<h3>${escapeHtml(question)}</h3><p>${escapeHtml(answer)}</p>`).join("")}</section>`
    : "";
  const area = areaFor(project?.location || article.area_name || "");
  const projectPath = project ? (ar ? `/projects/${project.slug}` : `/en/projects/${project.slug}`) : "";
  const crumbs = [
    { name: ar ? "الرئيسية" : "Home", path: "/" },
    ...(area.indexable ? [{ name: ar ? area.ar : area.en, path: `/${lang}/areas/${area.slug}` }] : []),
    ...(project ? [{ name: project.name, path: projectPath }] : []),
    { name: article.title, path },
  ];
  const message = encodeURIComponent(`${ar ? "السلام عليكم Tycoons، قريت مقال" : "Hello Tycoons, I read"}: ${article.title}\n${SITE_URL}${path}`);
  const projectCard = project
    ? `<section class="answer" aria-label="${ar ? "المشروع" : "Project"}"><p><strong>${ar ? "المقال ده عن" : "This guide is about"}:</strong> <a href="${escapeHtml(projectPath)}">${escapeHtml(project.name)}</a> — ${escapeHtml(project.developer || "")}${area.indexable ? ` · ${escapeHtml(ar ? area.ar : area.en)}` : ""}</p><p><a class="cta" href="${escapeHtml(projectPath)}">${ar ? "شوف الوحدات المتاحة" : "See available units"}</a> <a class="cta" href="https://wa.me/${WHATSAPP_NUMBER}?text=${message}">${ar ? "اسأل على واتساب" : "Ask on WhatsApp"}</a></p></section>`
    : "";
  const relatedHtml = related.length && project
    ? `<section aria-labelledby="guide-related"><h2 id="guide-related">${ar ? `أسئلة تانية عن ${escapeHtml(project.name)}` : `More questions about ${escapeHtml(project.name)}`}</h2><ul>${related.map((item) => `<li><a href="${escapeHtml(editorialGuidePath(item))}">${escapeHtml(item.title)}</a></li>`).join("")}</ul></section>`
    : "";
  const floating = `<a href="https://wa.me/${WHATSAPP_NUMBER}?text=${message}" aria-label="${ar ? "تواصل على واتساب" : "WhatsApp"}" style="position:fixed;bottom:20px;left:20px;z-index:40;background:#1faa59;color:#fff;border-radius:999px;padding:14px 20px;font-weight:700;box-shadow:0 8px 24px rgba(0,0,0,.2)">${ar ? "واتساب" : "WhatsApp"}</a>`;
  const body = `<main class="guide"><p class="crumbs">${crumbs.slice(0, -1).map((item) => `<a href="${escapeHtml(item.path)}">${escapeHtml(item.name)}</a>`).join(" / ")} / ${escapeHtml(article.title)}</p>
  <section class="hero"><span class="eyebrow">${ar ? "دليل مستقل تمت مراجعته قبل النشر" : "Independent guide reviewed before publication"}</span><h1>${escapeHtml(article.title)}</h1><p class="lead">${escapeHtml(article.excerpt)}</p>${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(article.title)}" width="1200" height="630" loading="eager" style="width:100%;height:auto;border-radius:16px;margin-top:12px">` : ""}<p class="updated">${ar ? "تاريخ المراجعة" : "Reviewed"}: ${escapeHtml(reviewedDate)}</p></section>
  ${projectCard}
  ${takeawaysHtml}
  <article>${renderSafeMarkdown(publicEditorialMarkdown(article.body_markdown, ar))}</article>
  ${faqHtml}
  ${relatedHtml}
  ${webSourcesHtml}
  <section><h2>${ar ? "ملاحظة مهمة" : "Important note"}</h2><p>${ar ? "المعلومات تعليمية وتتغير بمرور الوقت. أعد تأكيد أي تفاصيل تجارية قبل اتخاذ قرار." : "This is educational content. Reconfirm time-sensitive commercial details before deciding."}</p></section></main>${floating}`;
  const keyword = String(article.focus_keyword || "").trim();
  // The newest guide about a project is shown in full on the project page, which is
  // then its canonical URL (one strong page instead of two copies of the same text).
  const newest = Array.isArray(extras.related) ? extras.related[0] : null;
  const embeddedInProject = Boolean(project && newest && newest.slug === article.slug);
  return {
    lang,
    title: article.meta_title || `${article.title} | Tycoons Investments`,
    description: article.meta_description || article.excerpt,
    path,
    canonicalPath: embeddedInProject ? projectPath : "",
    alternatePath: embeddedInProject ? undefined : (pair ? editorialGuidePath(pair) : undefined),
    image,
    body,
    schemas: [
      breadcrumbSchema(crumbs),
      {
        "@context": "https://schema.org", "@type": "Article", headline: article.title,
        description: article.meta_description || article.excerpt,
        datePublished: article.published_at, dateModified: article.updated_at || article.reviewed_at,
        inLanguage: ar ? "ar-EG" : "en", mainEntityOfPage: `${SITE_URL}${path}`,
        ...(keyword ? { keywords: keyword } : {}),
        ...(image ? { image: [image] } : {}),
        ...(takeaways.length ? { abstract: takeaways.join(" ") } : {}),
        ...(webSources.length ? { citation: webSources.map((ref) => ({ "@type": "CreativeWork", name: String(ref.label).slice(0, 160) })) } : {}),
        author: { "@type": "Organization", name: "Tycoons Investments", url: `${SITE_URL}/about` },
        reviewedBy: { "@type": "Person", name: article.reviewed_by_name },
        publisher: { "@type": "Organization", "@id": `${SITE_URL}/#organization`, name: "Tycoons Investments", url: SITE_URL },
      },
      ...(faq.length
        ? [{
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faq.map(([name, text]) => ({ "@type": "Question", name, acceptedAnswer: { "@type": "Answer", text } })),
          }]
        : []),
    ],
  };
}

function renderEditorialArticle(article, translation = null, extras = {}) {
  const view = editorialArticleView(article, translation, extras);
  return view ? renderPage(view) : null;
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
    privacy: {
      title: "سياسة الخصوصية | Tycoons Investments",
      description: "إيه البيانات اللي Tycoons Investments بتجمعها لما تتواصل معانا أو تستخدم المساعد الصوتي، وبنستخدمها في إيه، وإزاي تطلب تصحيحها أو حذفها.",
      body: `<h1>سياسة الخصوصية</h1><div class="answer">بنجمع بس البيانات اللي إنت بتختار تبعتها لنا، زي الاسم ورقم التواصل وتفاصيل طلبك، وبنستخدمها لمتابعة طلبك العقاري. مشاركة الاسم والرقم اختيارية، ولا تعني الموافقة على رسائل تسويقية.</div><h2>البيانات اللي بنجمعها</h2><p>لما تطلب بروشور أو تبعت استفسار: الاسم ورقم الواتساب والمشروع أو الوحدة اللي بتسأل عنها. لما تستخدم البحث على الموقع: نص البحث بدون بيانات شخصية، عشان نحسّن النتائج.</p><h2>المساعد الصوتي</h2><p>المساعد الصوتي يعمل بالذكاء الاصطناعي، ويُستخدم صوتك لمعالجة طلبك والرد عليك. أثناء المحادثة يُجهّز تسجيل ونص مؤقتان على جهازك، وبعد إنهائها تقدر تراجع بيانات التواصل ونص الطلب وتأكد إرسالهم للفريق، وإرفاق الصوت اختياري. إغلاق النموذج من غير إرسال لا يرفع البيانات.</p><h2>بنستخدم البيانات في إيه؟</h2><p>متابعة طلبك وتوصيلك بالعرض المناسب، ومراجعة جودة الخدمة. لا نبيع بياناتك لأي جهة.</p><h2>فين بتتحفظ ومين يشوفها؟</h2><p>البيانات بتتحفظ في مساحة خاصة على Supabase، والوصول ليها مقصور على صاحب الحساب والموظف المسؤول عن طلبك.</p><h2>حقوقك</h2><p>تقدر تطلب توضيح بشأن بياناتك أو تصحيحها أو حذفها في أي وقت عن طريق <a href="https://wa.me/${WHATSAPP_NUMBER}">واتساب</a>. لا تشارك بيانات بطاقات الدفع أو كلمات المرور معانا في أي محادثة.</p>`,
      schemas: [{
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "سياسة الخصوصية",
        url: `${SITE_URL}/privacy`,
        publisher: { "@type": ["Organization", "RealEstateAgent"], name: "Tycoons Investments", url: SITE_URL },
      }],
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
  publicEditorialMarkdown,
  unitPath,
  findUnitByParam,
  renderGuidesIndex,
  fetchDevelopers,
  developerInfo,
  projectLogo,
  brandLogoUrl,
  SITE_URL,
  CACHE_HEADERS,
  AREAS,
  GUIDES,
  ENGLISH_GUIDES,
  slugify,
  areaFor,
  fetchUnits,
  fetchProjectsMeta,
  groupProjects,
  projectLocation,
  projectLastUpdated,
  renderDirectory,
  renderProject,
  renderUnit,
  renderCollection,
  renderGuide,
  renderEditorialArticle,
  editorialArticleView,
  editorialGuidePath,
  renderStaticPage,
  notFound,
  escapeHtml,
};
