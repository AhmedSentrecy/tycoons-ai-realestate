// «أسئلة بالأرقام»: the questions buyers ask about a project, answered in one sentence each with the number
// and its date, so Google, AI answers (GEO/AEO) and the client all read the same figure.
// Built from the project's expert card (Supabase project_experts → content/project-experts/cards.json)
// and its active sales facts (Supabase sales_facts_public). Same data the search, voice assistant and Sara use.
//
// Rules kept from the expert cards:
// - The disadvantage and ask_only_if_client_asks are NEVER published here.
// - No listing-website names: rent/resale are "متوسط الأسعار المطلوبة في السوق" with their date.
// - Rent is quoted low / average / high; yield is on the amount paid until handover only (the card's own sentence).

const AR = "\\u0600-\\u06FF";
const LISTING_SITES = new RegExp(
  "\\b(nawy|property\\s*finder|propertyfinder|aqarmap|bayut|dubizzle|olx|shary|wiserchat|on-wan|gpmegypt)\\b" +
    `|(?<![${AR}])(نوي|عقار\\s?ماب|بروبرتي\\s?فايندر|دوبيزل|بيوت)(?![${AR}])`,
  "i",
);

const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
const egp = (value) => new Intl.NumberFormat("en-US").format(Math.round(Number(value) || 0));
const safe = (value) => !LISTING_SITES.test(String(value ?? ""));

function bedroomsAr(count) {
  const n = Number(count);
  if (n === 1) return "غرفة واحدة";
  if (n === 2) return "غرفتين";
  if (n >= 3 && n <= 10) return `${n} غرف`;
  return "";
}

/** "X (Developer): text" → "text" when the fact already starts with the project name. */
function factText(fact, projectName) {
  const statement = clean(fact.statement_ar);
  const colon = statement.indexOf(": ");
  const head = colon > 0 ? statement.slice(0, colon) : "";
  const body = head && projectName && head.toLowerCase().includes(String(projectName).toLowerCase()) ? statement.slice(colon + 2) : statement;
  const label = clean(fact.source_label);
  return label ? `${body} (${label})` : body;
}

function rentAnswer(card) {
  const rent = card.rent || {};
  const segments = Array.isArray(rent.segments) ? rent.segments : [];
  const lines = segments
    .filter((seg) => Number(seg.average_egp) > 0)
    .map((seg) => {
      const rooms = bedroomsAr(seg.bedrooms);
      const kind = `شقة ${rooms}${seg.furnished ? " مفروشة" : " مش مفروشة"}`.trim();
      const range = Number(seg.low_egp) && Number(seg.high_egp) ? `من ${egp(seg.low_egp)} لـ ${egp(seg.high_egp)} جنيه في الشهر، والمتوسط حوالي ${egp(seg.average_egp)}` : `حوالي ${egp(seg.average_egp)} جنيه في الشهر`;
      const n = Number(seg.listings);
      const count = n === 1 ? "إعلان واحد" : n === 2 ? "إعلانين" : n >= 3 && n <= 10 ? `${n} إعلانات` : `${n} إعلان`;
      const sample = n ? ` (${count}${n < 3 ? "، عينة صغيرة" : ""})` : "";
      return `${kind}: ${range}${sample}`;
    });
  if (!lines.length) return "";
  const basis = clean(rent.basis) || "متوسط أسعار الإيجار المطلوبة في السوق";
  return `${lines.join(". ")}. ${basis}.`;
}

function resaleAnswer(card) {
  const resale = card.resale || {};
  const p = resale.price_per_sqm_egp || {};
  if (!Number(p.average)) return "";
  const range = Number(p.low) && Number(p.high) ? `من ${egp(p.low)} لـ ${egp(p.high)} جنيه للمتر، والمتوسط حوالي ${egp(p.average)}` : `حوالي ${egp(p.average)} جنيه للمتر`;
  const parts = [`سعر الريسيل ${range}`, clean(resale.basis)].filter(Boolean);
  if (clean(resale.rent_yield_on_full_price)) parts.push(clean(resale.rent_yield_on_full_price));
  // resale.note is guidance for the assistant (how to compare), not text for the page.
  return `${parts.join(". ")}.`;
}

function plansAnswer(card) {
  const plans = card.payment_plans || {};
  const phases = Array.isArray(plans.phases) ? plans.phases : [];
  const lines = phases
    .filter((phase) => clean(phase.down_payment) && Number(phase.years))
    .map((phase) => {
      const extras = [phase.cash_discount ? `وخصم الكاش ${clean(phase.cash_discount)}` : "", clean(phase.note)].filter(Boolean).join("، ");
      return `${clean(phase.phase)}: مقدم ${clean(phase.down_payment)} والباقي على ${phase.years} سنين${extras ? `، ${extras}` : ""}`;
    });
  if (!lines.length) return "";
  const source = clean(plans.source);
  const delivery = clean(plans.delivery);
  return `${lines.join(". ")}.${delivery ? ` ${delivery}.` : ""}${source ? ` (${source})` : ""}`;
}

function developerAnswer(card, facts, projectName) {
  const dev = card?.developer_summary || {};
  const parts = [];
  if (dev.founded) parts.push(`اتأسست سنة ${dev.founded}`);
  if (dev.delivered_units_total?.value) parts.push(`سلّمت ${clean(dev.delivered_units_total.value)}${dev.delivered_units_total.basis ? ` (${clean(dev.delivered_units_total.basis)})` : ""}`);
  if (dev.deliveries_2025?.value) parts.push(`وفي 2025 سلّمت ${clean(dev.deliveries_2025.value)}`);
  const track = facts.filter((fact) => fact.category === "track_record").map((fact) => factText(fact, projectName));
  const text = [parts.join("، "), ...track].filter(Boolean).join(". ");
  return text ? `${text}.`.replace(/\.\.$/, ".") : "";
}

/**
 * The questions and answers for one project. card: the expert card or null. facts: the project's active
 * sales facts. Returns [] when there is nothing with a number to say.
 */
function numbersFaq({ projectName, developer, card, facts = [] }) {
  const name = clean(card?.project?.name_ar) || clean(projectName);
  const items = [];
  const add = (question, answer) => {
    if (clean(answer) && safe(answer) && safe(question)) items.push({ question: clean(question), answer: clean(answer) });
  };
  const own = (Array.isArray(facts) ? facts : []).filter((fact) => fact && clean(fact.statement_ar));
  const deals = own.filter((fact) => fact.category === "offer" || fact.category === "urgency" || fact.category === "eoi");

  if (card) {
    add(`إيجار الشقق في ${name} كام؟`, rentAnswer(card));
    // The card's spoken sentence says «الشقة دي», so the page names the example unit first.
    const example = clean(card.yield_example?.unit);
    const spoken = clean(card.yield_example?.spoken);
    add(`العائد من إيجار شقة في ${name} كام؟`, spoken ? `${example ? `مثال: ${example}. ` : ""}${spoken}` : "");
    add(`سعر الريسيل في ${name} كام للمتر؟`, resaleAnswer(card));
    add(`إيه أنظمة السداد في ${name}؟`, plansAnswer(card));
  }
  if (deals.length) add(`إيه العروض الحالية في ${name}؟`, deals.map((fact) => factText(fact, projectName)).join(". "));
  const rentFacts = own.filter((fact) => fact.category === "rental");
  if (!card && rentFacts.length) add(`الإيجار والعائد في ${name} كام؟`, rentFacts.map((fact) => factText(fact, projectName)).join(". "));
  const devName = clean(card?.project?.developer) || clean(developer);
  if (devName) add(`${devName} سلّمت إيه قبل كده؟`, developerAnswer(card, own, projectName));
  return items;
}

/** Newest date behind the answers (card version or the newest fact), for «آخر تحديث». */
function numbersFaqUpdated({ card, facts = [] }) {
  const dates = [card?.card_version, ...facts.map((fact) => fact.source_date)].map((value) => String(value || "").slice(0, 10)).filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value));
  return dates.sort().pop() || "";
}

function dayAr(value) {
  const day = String(value || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return "";
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** The «أسئلة بالأرقام عن <project>» section (empty string when there are no items). */
function numbersFaqHtml(items, { projectName, updated, escapeHtml }) {
  if (!items.length) return "";
  const when = dayAr(updated);
  const rows = items.map((item) => `<div class="mt-4 rounded-2xl border border-[#e3e9f2] bg-white/80 p-5"><h3 class="font-extrabold">${escapeHtml(item.question)}</h3><p class="mt-3 leading-loose text-[#556070]">${escapeHtml(item.answer)}</p></div>`).join("");
  return `<section class="mb-12" id="numbers"><h2 class="text-3xl font-extrabold">أسئلة بالأرقام عن ${escapeHtml(projectName)}</h2>${when ? `<p class="mt-3 text-sm text-[#556070]">آخر تحديث: ${escapeHtml(when)}. الأرقام بتتأكد وقت الحجز.</p>` : ""}${rows}</section>`;
}

module.exports = { numbersFaq, numbersFaqHtml, numbersFaqUpdated, LISTING_SITES };
