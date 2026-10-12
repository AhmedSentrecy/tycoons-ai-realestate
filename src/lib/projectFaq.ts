// Buyer FAQ computed from a project's available units (Arabic).
// Shared by the React project page and the static page generator so the
// visible questions and the FAQPage schema always match the live inventory.
// Pure functions only: no browser or Node APIs, no imports.

export interface FaqItem { question: string; answer: string }

export interface FaqUnit {
  project_id?: string | null;
  project_name?: string | null;
  developer?: string | null;
  location?: string | null;
  unit_type?: string | null;
  area_sqm?: number | string | null;
  starting_price?: number | string | null;
  down_payment_text?: string | null;
  installments_text?: string | null;
  delivery_text?: string | null;
  finishing?: string | null;
  last_updated_at?: string | null;
}

export interface FaqProject { name: string; developer: string; location: string }

export interface OtherProject { name: string; developer: string; location: string; minPrice?: number | null }

export interface ResearchFaq { question: string; answer: string; sources?: { url: string; title?: string }[] }

export interface FaqContext {
  /** Other public projects that have available units. */
  otherProjects?: OtherProject[];
  /** Web-researched questions the owner reviewed and saved for this project (projects.targeting.research_faq). */
  research?: ResearchFaq[];
  /** Year shown in the price question; defaults to the latest unit update year. */
  year?: number;
}

const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

// Questions written by the old bulk template: replaced by computed ones.
const TEMPLATE_QUESTION = /^(ما نظام سداد|كيف أتأكد من أحدث|متى استلام وحدات|أين يقع مشروع|ما أسعار .* في 20\d\d|من هو مطور|ما أنواع ومساحات الوحدات|ما أنواع الوحدات|ما أقل سعر ظاهر)/;

const hostOf = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; } };

/** Saved research questions, bounded and https-only (the stored JSON is treated as untrusted). */
export function researchFaqItems(value: unknown): ResearchFaq[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 6).flatMap((item) => {
    const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const question = String(row.question ?? "").trim().slice(0, 200);
    const answer = String(row.answer ?? "").trim().slice(0, 700);
    const sources = (Array.isArray(row.sources) ? row.sources : []).slice(0, 4).flatMap((source) => {
      const url = String((source as Record<string, unknown>)?.url ?? "").trim();
      return /^https:\/\//i.test(url) && hostOf(url) ? [{ url, title: String((source as Record<string, unknown>)?.title ?? "").trim().slice(0, 160) }] : [];
    });
    return question && answer ? [{ question, answer, sources }] : [];
  });
}

/** True when a stored FAQ was written by hand (and should be kept as is). */
export function isCuratedFaq(faq: FaqItem[] | null | undefined): boolean {
  return Array.isArray(faq) && faq.length > 0 && faq.some((item) => !TEMPLATE_QUESTION.test(String(item?.question || "").trim()));
}

function num(value: unknown): number | null {
  const match = String(value ?? "").replace(/,/g, "").match(/[0-9]+(?:\.[0-9]+)?/);
  const parsed = match ? Number(match[0]) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const dec = (n: number) => String(Math.round(n * 10) / 10);
const moneyShort = (n: number) => (n >= 1_000_000 ? `${dec(n / 1_000_000)} مليون` : `${fmt(n / 1000)} ألف`);
const thousands = (n: number) => `${fmt(n / 1000)} ألف`;
const arMonth = (d: Date) => `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;

function yearsAr(n: number): string {
  if (n === 1) return "سنة";
  if (n === 2) return "سنتين";
  return n <= 10 ? `${dec(n)} سنوات` : `${dec(n)} سنة`;
}

export function unitFamily(type: string): string {
  const t = type || "";
  if (/i-?villa/i.test(t)) return "ivilla";
  if (/twin/i.test(t)) return "twin";
  if (/town|\bths\b/i.test(t)) return "town";
  if (/triplex/i.test(t)) return "triplex";
  if (/suite/i.test(t)) return "suite";
  if (/quadro/i.test(t)) return "quadro";
  if (/pent/i.test(t)) return "penthouse";
  if (/duplex|maisonette/i.test(t)) return "duplex";
  if (/chalet|cabin/i.test(t)) return "chalet";
  if (/studio/i.test(t)) return "studio";
  if (/loft/i.test(t)) return "loft";
  if (/clinic|medical|pharmacy|laborator/i.test(t)) return "medical";
  if (/office|admin/i.test(t)) return "office";
  if (/retail|f&b|bank|shop|commercial/i.test(t)) return "retail";
  if (/villa|stand ?alone|single storey/i.test(t)) return "villa";
  if (/apart|apt|bed|[0-9] ?br|[0-9] ?bd|[0-9]b |millennial|typical|ground|garden|terrace|floor|flat|serviced/i.test(t)) return "apartment";
  return "unit";
}

const PLURAL: Record<string, string> = {
  apartment: "الشقق", villa: "الفيلات المستقلة", ivilla: "الآي فيلا", town: "التاون هاوس", twin: "التوين هاوس",
  quadro: "الكوادرو", penthouse: "البنتهاوس", duplex: "الدوبلكس", chalet: "الشاليهات", studio: "الستوديوهات",
  triplex: "التريبلكس", suite: "الأجنحة الفندقية", loft: "اللوفت", medical: "الوحدات الطبية",
  office: "المكاتب الإدارية", retail: "المحلات التجارية", unit: "الوحدات",
};
const SINGLE: Record<string, string> = {
  apartment: "شقة", villa: "فيلا مستقلة", ivilla: "آي فيلا", town: "تاون هاوس", twin: "توين هاوس",
  quadro: "كوادرو", penthouse: "بنتهاوس", duplex: "دوبلكس", chalet: "شاليه", studio: "ستوديو",
  triplex: "تريبلكس", suite: "جناح فندقي", loft: "لوفت", medical: "وحدة طبية",
  office: "مكتب إداري", retail: "محل تجاري", unit: "وحدة",
};
const plural = (f: string) => PLURAL[f] || "الوحدات";
const single = (f: string) => SINGLE[f] || "وحدة";

const LOCATIONS: [RegExp, string][] = [
  [/mostakbal/i, "مستقبل سيتي"],
  [/\br4\b|\br8\b|capital/i, "العاصمة الإدارية الجديدة"],
  [/fifth|5th/i, "التجمع الخامس بالقاهرة الجديدة"],
  [/6th settlement/i, "التجمع السادس بالقاهرة الجديدة"],
  [/golden square/i, "منطقة الجولدن سكوير بالقاهرة الجديدة"],
  [/north investors/i, "منطقة المستثمرين الشمالية بالقاهرة الجديدة"],
  [/south investors/i, "منطقة المستثمرين الجنوبية بالقاهرة الجديدة"],
  [/lotus/i, "منطقة اللوتس بالقاهرة الجديدة"],
  [/90/, "شارع التسعين بالقاهرة الجديدة"],
  [/south new cairo/i, "جنوب القاهرة الجديدة"],
  [/suez road/i, "طريق السويس بالقاهرة الجديدة"],
  [/shorouk/i, "مدينة الشروق"],
  [/new cairo|east cairo|heliopolis|القاهرة الجديدة/i, "القاهرة الجديدة"],
  [/new zayed/i, "الشيخ زايد الجديدة"],
  [/zayed|sodic west|west cairo/i, "الشيخ زايد"],
  [/october/i, "مدينة السادس من أكتوبر"],
  [/hekma|hikma/i, "رأس الحكمة بالساحل الشمالي"],
  [/alamein/i, "العلمين الجديدة بالساحل الشمالي"],
  [/dabaa/i, "الضبعة بالساحل الشمالي"],
  [/sidi abdel/i, "سيدي عبد الرحمن بالساحل الشمالي"],
  [/ghazala/i, "خليج غزالة بالساحل الشمالي"],
  [/hamam/i, "الحمام بالساحل الشمالي"],
  [/north coast|sahel|الساحل/i, "الساحل الشمالي"],
  [/sokhna|galala/i, "العين السخنة"],
  [/gouna/i, "الجونة"],
  [/alexandria/i, "الإسكندرية"],
  [/downtown|central cairo/i, "وسط القاهرة"],
];

export function locationAr(location: string): string {
  const value = String(location || "").trim();
  return LOCATIONS.find(([pattern]) => pattern.test(value))?.[1] || value;
}

// Placeholder text written by an old bulk import: not real project data.
const isPlaceholder = (unit: FaqUnit) => /في بعض المشاريع/.test(unit.down_payment_text || "") || /تختلف حسب المشروع/.test(unit.finishing || "");

function downPayment(text: string): number | null {
  const match = String(text || "").match(/([0-9]+(?:\.[0-9]+)?)\s*%/);
  return match ? Number(match[1]) : null;
}

function installmentYears(text: string): number | null {
  const values = [...String(text || "").matchAll(/([0-9]+(?:\.[0-9]+)?)\s*(?:years?|yrs?|y\b|سنة|سنوات|سنين)/gi)].map((m) => Number(m[1]));
  return values.length ? Math.max(...values) : null;
}

function deliveryLabel(text: string): string | null {
  const t = String(text || "").trim();
  if (!t || /varies/i.test(t)) return null;
  if (/ready|immediate|فوري/i.test(t)) return "استلام فوري";
  let m = t.match(/([0-9]{4})-([0-9]{2})/);
  if (m) return `في ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
  m = t.match(/Q\s*([1-4])\D*([0-9]{4})/i);
  if (m) return `في الربع ${["الأول", "الثاني", "الثالث", "الرابع"][Number(m[1]) - 1]} من ${m[2]}`;
  m = t.match(/([0-9]+(?:\.[0-9]+)?)\s*(?:years?|سنوات|سنة|سنين)/i);
  if (m) return `خلال ${yearsAr(Number(m[1]))} من التعاقد`;
  m = t.match(/([0-9]+)\s*months?/i);
  if (m) return `خلال ${m[1]} شهر من التعاقد`;
  m = t.match(/(20[2-4][0-9])/);
  return m ? `في ${m[1]}` : null;
}

function finishingLabel(text: string): string | null {
  const t = String(text || "").trim();
  if (!t) return null;
  if (/core/i.test(t)) return "كور آند شل (بدون تشطيب داخلي)";
  if (/semi/i.test(t)) return "نصف تشطيب";
  if (/not fin|unfinish/i.test(t)) return "بدون تشطيب";
  if (/flexi/i.test(t)) return "تشطيب مرن (Flexi)";
  if (/furnish/i.test(t)) return "مفروشة";
  if (/finish|تشطيب كامل/i.test(t)) return "تشطيب كامل";
  return null;
}

const areaRange = (a1: number | null, a2: number | null) => (a1 == null || a2 == null ? null : a1 === a2 ? `${fmt(a1)} م²` : `${fmt(a1)}–${fmt(a2)} م²`);

interface Row { fam: string; area: number | null; price: number | null; dp: number | null; yrs: number | null; deliv: string | null; fin: string | null; updated: number }

interface FamilyStats { fam: string; count: number; minArea: number | null; maxArea: number | null; minPrice: number; minPpm: number | null; maxPpm: number | null }

function families(rows: Row[]): FamilyStats[] {
  const map = new Map<string, Row[]>();
  for (const row of rows) map.set(row.fam, [...(map.get(row.fam) || []), row]);
  return [...map.entries()].map(([fam, list]) => {
    const areas = list.map((r) => r.area).filter((a): a is number => a != null);
    const ppms = list.filter((r) => r.area != null && r.price != null).map((r) => (r.price as number) / (r.area as number));
    return {
      fam, count: list.length,
      minArea: areas.length ? Math.min(...areas) : null, maxArea: areas.length ? Math.max(...areas) : null,
      minPrice: Math.min(...list.map((r) => r.price as number)),
      minPpm: ppms.length ? Math.min(...ppms) : null, maxPpm: ppms.length ? Math.max(...ppms) : null,
    };
  });
}

/** Most common location string among the units (ties: alphabetical). */
export function dominantLocation(units: FaqUnit[]): string {
  const counts = new Map<string, number>();
  for (const unit of units) {
    const value = String(unit.location || "").trim();
    if (value) counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || "";
}

/** One entry per project (grouped by project id) built from inventory units. */
export function projectsFromUnits(units: FaqUnit[]): OtherProject[] {
  const groups = new Map<string, FaqUnit[]>();
  for (const unit of units) {
    const key = String(unit.project_id || unit.project_name || "");
    if (key) groups.set(key, [...(groups.get(key) || []), unit]);
  }
  return [...groups.values()].map((list) => ({
    name: String(list[0].project_name || "").trim(),
    developer: String(list[0].developer || "").trim(),
    location: dominantLocation(list),
    minPrice: Math.min(...list.map((unit) => num(unit.starting_price) ?? Infinity)),
  })).filter((p) => p.name);
}

const names = (list: string[]) => [...new Set(list)].sort((a, b) => a.localeCompare(b)).slice(0, 3).join("، ");

export function buildProjectFaq(project: FaqProject, units: FaqUnit[], context: FaqContext = {}): FaqItem[] {
  const rows: Row[] = units.map((unit) => {
    const placeholder = isPlaceholder(unit);
    return {
      fam: unitFamily(unit.unit_type || ""),
      area: num(unit.area_sqm),
      price: num(unit.starting_price),
      dp: placeholder ? null : downPayment(unit.down_payment_text || ""),
      yrs: placeholder ? null : installmentYears(unit.installments_text || ""),
      deliv: placeholder ? null : deliveryLabel(unit.delivery_text || ""),
      fin: placeholder ? null : finishingLabel(unit.finishing || ""),
      updated: Date.parse(unit.last_updated_at || "") || 0,
    };
  });
  const priced = rows.filter((r) => r.price != null);
  if (!priced.length) return [];

  const n = project.name;
  const loc = locationAr(project.location);
  const latest = Math.max(...rows.map((r) => r.updated));
  const dated = latest ? ` آخر تحديث: ${arMonth(new Date(latest))}.` : "";
  const year = context.year || (latest ? new Date(latest).getUTCFullYear() : new Date().getUTCFullYear());
  const fams = families(priced);
  const faq: FaqItem[] = [];

  // 1. Starting price + per-type starting prices
  const cheapest = [...priced].sort((a, b) => (a.price as number) - (b.price as number) || (a.area ?? Infinity) - (b.area ?? Infinity))[0];
  const others = fams.filter((f) => f.fam !== cheapest.fam).sort((a, b) => a.minPrice - b.minPrice).slice(0, 4)
    .map((f) => `${plural(f.fam)} من حوالي ${moneyShort(f.minPrice)} جنيه`);
  faq.push({
    question: `أسعار ${n} بتبدأ من كام في ${year}؟`,
    answer: `تبدأ الأسعار المعروضة في ${n} من ${fmt(cheapest.price as number)} جنيه (${single(cheapest.fam)}${cheapest.area != null ? ` ${fmt(cheapest.area)} م²` : ""}).${others.length ? ` وبحسب النوع: ${others.join("، ")}.` : ""}${dated}`,
  });

  // 2. Payment plan
  const dps = rows.map((r) => r.dp).filter((v): v is number => v != null);
  const yrs = rows.map((r) => r.yrs).filter((v): v is number => v != null);
  if (dps.length || yrs.length) {
    const parts: string[] = [];
    if (dps.length) {
      const dmin = Math.min(...dps), dmax = Math.max(...dps);
      parts.push(dmin === dmax && dmin === 0 ? "بدون مقدم" : dmin === dmax ? `مقدم ${dec(dmin)}%` : dmin === 0 ? "مقدم يبدأ من 0% (بدون مقدم) في بعض الوحدات" : `مقدم يبدأ من ${dec(dmin)}%`);
    }
    if (yrs.length) {
      const ymin = Math.min(...yrs), ymax = Math.max(...yrs);
      parts.push(ymin === ymax ? `تقسيط على ${yearsAr(ymax)}` : `تقسيط يصل إلى ${yearsAr(ymax)}`);
    }
    faq.push({
      question: `إيه نظام السداد في ${n}؟`,
      answer: `نظام السداد المتاح على الوحدات المعروضة في ${n}: ${parts.join(" و")}. قد تختلف الخطة حسب الوحدة وتاريخ الحجز، ونأكدها وقت الطلب.${dated}`,
    });
  }

  // 3. Price per square meter
  const ppms = priced.filter((r) => r.area != null).map((r) => (r.price as number) / (r.area as number));
  if (ppms.length >= 2) {
    const pmin = Math.min(...ppms), pmax = Math.max(...ppms);
    let text = Math.round(pmin / 1000) === Math.round(pmax / 1000)
      ? `سعر المتر في الوحدات المعروضة في ${n} حوالي ${thousands(pmin)} جنيه.`
      : `سعر المتر في الوحدات المعروضة في ${n} يتراوح بين حوالي ${thousands(pmin)} و${thousands(pmax)} جنيه حسب نوع الوحدة.`;
    if (fams.length >= 2) {
      const perFamily = fams.filter((f) => f.minPpm != null).sort((a, b) => (a.minPpm as number) - (b.minPpm as number)).slice(0, 4)
        .map((f) => `${plural(f.fam)}${Math.round((f.minPpm as number) / 1000) === Math.round((f.maxPpm as number) / 1000) ? ` حوالي ${thousands(f.minPpm as number)}` : ` من ${fmt((f.minPpm as number) / 1000)} لـ${thousands(f.maxPpm as number)}`}`);
      if (perFamily.length) text += ` ${perFamily.join("، ")} جنيه للمتر.`;
    }
    faq.push({ question: `سعر المتر في ${n} كام؟`, answer: `${text}${dated}` });
  }

  // 4. Maintenance deposit (confirmed by the owner for Mountain View projects only)
  if (/^mountain view/i.test(project.developer || "")) {
    faq.push({
      question: `وديعة الصيانة في ${n} كام؟`,
      answer: "وديعة الصيانة في مشاريع Mountain View عمومًا 8% من سعر الوحدة. تأكد من النسبة وموعد سدادها في عقد الوحدة قبل التعاقد.",
    });
  }

  // 5. Unit types and areas
  const allFams = families(rows.map((r) => ({ ...r, price: r.price ?? Infinity })));
  faq.push({
    question: `إيه أنواع الوحدات والمساحات في ${n}؟`,
    answer: `الوحدات المعروضة في ${n} تشمل ${allFams.sort((a, b) => a.minPrice - b.minPrice).map((f) => `${plural(f.fam)}${areaRange(f.minArea, f.maxArea) ? ` ${areaRange(f.minArea, f.maxArea)}` : ""}`).join("، ")}. المساحات المتاحة بتتغير حسب المخزون.${dated}`,
  });

  // 6. Difference between the two most common types
  if (fams.length >= 2) {
    const ranked = [...fams].sort((a, b) => b.count - a.count || a.minPrice - b.minPrice);
    const [a, b] = [ranked[0], ranked[1]].sort((x, y) => x.minPrice - y.minPrice);
    const side = (f: FamilyStats, prefix: string) => {
      const range = areaRange(f.minArea, f.maxArea);
      return `${range ? ` ${prefix}${f.minArea === f.maxArea ? "بمساحة" : "بمساحات"} ${range}` : ""} وتبدأ من حوالي ${moneyShort(f.minPrice)} جنيه${f.minPpm != null ? ` (من حوالي ${thousands(f.minPpm)} جنيه للمتر)` : ""}`;
    };
    faq.push({
      question: `إيه الفرق بين ${plural(a.fam)} و${plural(b.fam)} في ${n}؟`,
      answer: `${plural(a.fam)} في ${n}${side(a, "")}، أما ${plural(b.fam)}${side(b, "ف")}.${dated}`,
    });
  }

  // 7. Finishing
  const finishes = [...new Set(rows.map((r) => r.fin).filter((v): v is string => Boolean(v)))];
  if (finishes.length === 1) {
    faq.push({
      question: `الوحدات في ${n} بتتسلم بأي تشطيب؟`,
      answer: `الوحدات المعروضة حاليًا في ${n} بتتسلم ${finishes[0]}. تأكد من مواصفات التشطيب المكتوبة في عقد الوحدة نفسها.${dated}`,
    });
  } else if (finishes.length > 1) {
    const byFamily = new Map<string, Set<string>>();
    for (const r of rows) if (r.fin) byFamily.set(r.fam, (byFamily.get(r.fam) || new Set()).add(r.fin));
    const list = [...byFamily.entries()].sort((x, y) => x[0].localeCompare(y[0])).map(([fam, set]) => `${plural(fam)}: ${[...set].sort().join(" أو ")}`);
    faq.push({
      question: `الوحدات في ${n} بتتسلم بأي تشطيب؟`,
      answer: `التشطيب في ${n} بيختلف حسب الوحدة — ${list.join("، ")}. تأكد من مواصفات التشطيب المكتوبة في عقد الوحدة نفسها.${dated}`,
    });
  }

  // 8. Location + nearby projects on the site
  const otherProjects = (context.otherProjects || []).filter((p) => p.name && p.name !== n);
  // Same area, closest starting price first (a useful comparison for the same budget).
  const startPrice = cheapest.price as number;
  const distance = (p: OtherProject) => (p.minPrice && Number.isFinite(p.minPrice) ? Math.abs(Math.log(p.minPrice / startPrice)) : Infinity);
  const nearby = [...new Map(otherProjects.filter((p) => locationAr(p.location) === loc).map((p) => [p.name, p])).values()]
    .sort((a, b) => distance(a) - distance(b) || a.name.localeCompare(b.name)).slice(0, 3).map((p) => p.name).join("، ");
  faq.push({
    question: `${n} فين بالظبط؟`,
    answer: `يقع ${n} في ${loc}.${nearby ? ` ومن المشاريع القريبة بأسعار قريبة على Tycoons: ${nearby}.` : ""}`,
  });

  // 9. Delivery
  const delivered = rows.filter((r) => r.deliv);
  if (delivered.length) {
    const ready = delivered.filter((r) => r.deliv === "استلام فوري").length;
    const counts = new Map<string, number>();
    for (const r of delivered) if (r.deliv !== "استلام فوري") counts.set(r.deliv as string, (counts.get(r.deliv as string) || 0) + 1);
    const labels = [...counts.entries()].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0])).slice(0, 3).map(([label]) => label).join(" أو ");
    if (ready) {
      faq.push({
        question: `هل في وحدات استلام فوري في ${n}؟`,
        answer: labels
          ? `نعم، في ${ready} وحدة استلام فوري من الوحدات المعروضة في ${n}، وباقي الوحدات موعد استلامها ${labels}.${dated}`
          : `نعم، كل الوحدات المعروضة حاليًا في ${n} استلام فوري.${dated}`,
      });
    } else {
      faq.push({
        question: `موعد استلام ${n} إمتى؟`,
        answer: `موعد الاستلام المعلن للوحدات المعروضة في ${n} ${labels} حسب الوحدة، والموعد النهائي بيتحدد في عقد الحجز.${dated}`,
      });
    }
  }

  // Researched questions (reviewed by the owner), each citing its websites.
  // Same question as a computed one (e.g. the location): the researched answer replaces it,
  // keeping the computed "nearby projects" line.
  for (const item of researchFaqItems(context.research)) {
    const hosts = [...new Set((item.sources || []).map((source) => hostOf(source.url)).filter(Boolean))].slice(0, 2);
    const answer = `${item.answer}${hosts.length ? ` المصدر: ${hosts.join("، ")}.` : ""}`;
    const existing = faq.find((entry) => entry.question === item.question);
    if (existing) {
      const nearbyLine = existing.answer.match(/ ومن المشاريع القريبة[^]*$/)?.[0] || "";
      existing.answer = `${answer}${nearbyLine}`;
    } else faq.push({ question: item.question, answer });
  }

  // 10. Developer + their other projects on the site
  const sameDeveloper = names(otherProjects.filter((p) => p.developer === project.developer).map((p) => p.name));
  faq.push({
    question: `مين مطور ${n}؟`,
    answer: `مطور ${n} هو ${project.developer}.${sameDeveloper ? ` وله مشاريع تانية معروضة على Tycoons منها ${sameDeveloper}.` : ""}`,
  });

  return faq;
}
