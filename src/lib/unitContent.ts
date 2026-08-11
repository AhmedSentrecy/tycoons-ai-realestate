// Mirrors the content-generation logic in netlify/functions/_seo-utils.cjs (renderUnit)
// so the client-rendered unit page presents the same facts as the server-rendered
// version bots see. Wording is not required to be byte-identical, only the underlying
// facts (price rank, area context, FAQs) need to match.

export interface AreaInfo {
  slug: string;
  ar: string;
  en: string;
  indexable: boolean;
}

const AREAS: Array<{ slug: string; ar: string; en: string; match: RegExp }> = [
  { slug: "mostakbal-city", ar: "مستقبل سيتي", en: "Mostakbal City", match: /mostakbal(?: city)?|مستقبل(?: سيتي)?/i },
  { slug: "new-alamein", ar: "العلمين الجديدة", en: "New Alamein", match: /new alamein|العلمين الجديده|العلمين الجديدة/i },
  { slug: "new-cairo", ar: "القاهرة الجديدة والتجمع", en: "New Cairo", match: /new cairo|fifth settlement|القاهره الجديده|القاهرة الجديدة|التجمع/i },
  {
    slug: "north-coast",
    ar: "الساحل الشمالي",
    en: "North Coast",
    match: /north coast|sahel|الساحل|ras el|راس الحكمه|رأس الحكمة|sidi abdel|(?<!الجديده |الجديدة )العلمين/i,
  },
  { slug: "ain-sokhna", ar: "العين السخنة", en: "Ain Sokhna", match: /sokhna|السخنه|السخنة|galala|الجلاله|الجلالة/i },
  { slug: "sheikh-zayed", ar: "الشيخ زايد", en: "Sheikh Zayed", match: /sheikh zayed|el sheikh zayed|new zayed|sodic west|الشيخ زايد|زايد الجديدة|زايد الجديده/i },
  { slug: "new-capital", ar: "العاصمة الإدارية الجديدة", en: "New Capital", match: /new capital|administrative capital|العاصمه|العاصمة/i },
  { slug: "october", ar: "السادس من أكتوبر", en: "6th of October", match: /6th of october|october|اكتوبر|أكتوبر/i },
];

const AREA_FACTS: Record<string, { context: string; buyerNote: string }> = {
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

function normalize(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .toLowerCase()
    .trim();
}

function slugify(value: string) {
  return (
    normalize(value)
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9؀-ۿ]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-") || "property"
  );
}

export function areaFor(location: string): AreaInfo {
  const value = normalize(location || "");
  const matched = AREAS.find((area) => area.match.test(value));
  if (matched) return { ...matched, indexable: true };
  return { slug: slugify(location || "egypt"), ar: location || "مصر", en: location || "Egypt", indexable: false };
}

export function areaFacts(slug: string) {
  return AREA_FACTS[slug] || GENERIC_AREA_FACTS;
}

export interface SiblingUnit {
  id: string;
  unit_type: string;
  bedrooms_text: string;
  area_sqm: number;
  starting_price: number;
}

export interface UnitStats {
  price: number;
  area: number;
  priceRank: "cheapest" | "priciest" | "mid" | "only";
  sizeRank: "largest" | "smallest" | "mid" | "only";
  siblingCount: number;
}

export function computeUnitStats(price: number, area: number, siblings: SiblingUnit[]): UnitStats {
  const siblingPrices = siblings.map((s) => s.starting_price).filter(Boolean);
  const siblingAreas = siblings.map((s) => s.area_sqm).filter(Boolean);
  const minPrice = siblingPrices.length ? Math.min(...siblingPrices) : price;
  const maxPrice = siblingPrices.length ? Math.max(...siblingPrices) : price;
  const minArea = siblingAreas.length ? Math.min(...siblingAreas) : area;
  const maxArea = siblingAreas.length ? Math.max(...siblingAreas) : area;
  const priceRank: UnitStats["priceRank"] =
    siblingPrices.length < 2 ? "only" : price <= minPrice * 1.02 ? "cheapest" : price >= maxPrice * 0.98 ? "priciest" : "mid";
  const sizeRank: UnitStats["sizeRank"] =
    siblingAreas.length < 2 ? "only" : area >= maxArea * 0.98 ? "largest" : area <= minArea * 1.02 ? "smallest" : "mid";
  return { price, area, priceRank, sizeRank, siblingCount: siblings.length };
}

export function rankClause(stats: UnitStats) {
  const parts: string[] = [];
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

function hashPick(seed: string, length: number) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return length > 0 ? hash % length : 0;
}

export function pick<T>(bank: T[], seed: string, salt = ""): T {
  return bank[hashPick(`${seed}:${salt}`, bank.length)];
}
