"use strict";

// Facts for the page guide orb (public/guide-orb.js), read from a page of the site itself.
//
// - Every fact is a short sentence that is already on the page (or in the confirmed offer /
//   developer article the page is built from), tagged with a topic so the orb can say it when
//   the reader is looking at that part of the page.
// - fallbackLines() turns the facts into ready lines for free (no AI).
// - checkLine() is the guard for AI-written lines: every number in a line must be a number that
//   is in its facts, so the AI can reword but never invent a price, a percentage or a year.

let SHOWCASE = {};
try { SHOWCASE = require("../../content/project-showcase.json").projects || {}; } catch { SHOWCASE = {}; }
let DEVELOPER_ARTICLES = [];
try { DEVELOPER_ARTICLES = require("../../content/developer-articles.source.json").articles || []; } catch { DEVELOPER_ARTICLES = []; }

const TOPICS = ["offer", "payment", "price", "units", "delivery", "location", "developer", "general"];
const MAX_FACTS = 24;

// Topic of a piece of text (a fact, or the part of the page the reader is looking at).
const TOPIC_RULES = [
  ["offer", /عرض|خصم|offer|discount|promo/i],
  ["payment", /مقدم|قسط|تقسيط|أقساط|دفعة|سداد|down ?payment|instal?ments?|monthly|payment plan|years? plan/i],
  ["delivery", /استلام|تسليم|delivery|handover|ready to move|جاهز|فوري/i],
  ["price", /سعر|أسعار|جنيه|مليون|price|egp|million|per m|للمتر/i],
  ["units", /شقة|شقق|فيلا|فيلات|تاون|توين|دوبلكس|شاليه|بنتهاوس|ستوديو|غرف|م²|apartment|villa|townhouse|twin|duplex|chalet|penthouse|studio|bedroom|sqm|m²/i],
  ["location", /طريق|دقيقة|دقايق|منطقة|موقع|قريب|جنب|المطار|road|minutes|location|near|airport|district/i],
  ["developer", /مطور|المطور|تأسست|شركة|developer|founded|company|track record|سابقة/i],
];

function topicOf(text) {
  for (const [topic, rule] of TOPIC_RULES) if (rule.test(text)) return topic;
  return "general";
}

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const latinDigits = (value) => String(value).replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)));

/** Every number in a text, normalised: Arabic digits → Latin, thousands commas removed. */
function numbersIn(text) {
  return (latinDigits(text).replace(/(\d)[,٬](?=\d{3}\b)/g, "$1").match(/\d+(?:[.٫]\d+)?/g) || []).map((n) => n.replace("٫", "."));
}

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'", "#x27": "'" };
function decode(text) {
  return String(text)
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z0-9#]+);/gi, (match, name) => ENTITIES[name.toLowerCase()] ?? match);
}
const textOf = (html) => decode(String(html).replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

/** The page's readable body: no scripts, styles, navigation, header or footer. */
function readableHtml(html) {
  return String(html || "")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|template|iframe)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(nav|header|footer|form)\b[\s\S]*?<\/\1>/gi, " ");
}

function sentences(text) {
  return String(text)
    .split(/(?<=[.!؟?])\s+|\s+[—–]\s+(?=\S)/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Text that is page furniture, not a fact worth saying.
const NOISE = /واتساب|whatsapp|اطلب|تواصل|اتصل|contact|call us|book|cookie|سياسة|policy|منهجية|methodology|حقوق|copyright|استرشادية|indicative|ليست ضمان|not a guarantee|يتم التأكيد|confirmed at|اضغط|click/i;

// A long sentence is cut at a comma so it still fits in the orb's bubble.
function shorten(text, max = 210) {
  if (text.length <= max) return text;
  const cut = text.lastIndexOf("،", max) > 70 ? text.lastIndexOf("،", max) : text.lastIndexOf(",", max);
  return cut > 70 ? `${text.slice(0, cut).trim()}.` : text;
}

function addFact(list, seen, text, topic, source) {
  const clean = shorten(String(text || "").replace(/\s+/g, " ").replace(/\s+([،,.:؛!؟?])/g, "$1").trim());
  if (clean.length < 12 || clean.length > 230 || NOISE.test(clean)) return;
  const key = latinDigits(clean).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
  if (!key || seen.has(key)) return;
  seen.add(key);
  list.push({ id: `f${list.length + 1}`, topic: topic || topicOf(clean), text: clean, source });
}

function pageName(html) {
  const h1 = String(html).match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  return h1 ? textOf(h1[1]).split(/\s+[—–|]\s+/)[0].trim() : "";
}

/** "label → value" stat boxes: <small>يبدأ من</small><strong>11,500,000 جنيه</strong> (either order). */
function statPairs(html) {
  const pairs = [];
  const re = /<small\b[^>]*>([\s\S]{1,80}?)<\/small>\s*<strong\b[^>]*>([\s\S]{1,80}?)<\/strong>|<strong\b[^>]*>([\s\S]{1,80}?)<\/strong>\s*<small\b[^>]*>([\s\S]{1,80}?)<\/small>/gi;
  for (const m of html.matchAll(re)) {
    const label = textOf(m[1] ?? m[4]);
    const value = textOf(m[2] ?? m[3]);
    if (label && value && /\d/.test(value) && !/تحديث|updated/i.test(label)) pairs.push({ label, value });
  }
  return pairs;
}

const STAT_LINES = [
  [/يبدأ من|starting|from/i, (name, v, en) => (en ? `${name ? `${name} prices` : "Prices"} start from ${v}.` : `${name ? `أسعار ${name}` : "الأسعار"} بتبدأ من ${v}.`), "price"],
  [/أعلى سعر|highest/i, (name, v, en) => (en ? `The highest listed price here is ${v}.` : `أعلى سعر معروض هنا ${v}.`), "price"],
  [/متوسط سعر المتر|price per m|per sqm|per m²/i, (name, v, en) => (en ? `The average price per m² is about ${v}.` : `متوسط سعر المتر حوالي ${v}.`), "price"],
  [/الخيارات|الوحدات|options|units/i, (name, v, en) => (en ? `There are ${v} options listed on this page right now.` : `فيه ${v} اختيارات متاحة في الصفحة دي دلوقتي.`), "units"],
  [/مقدم|first payment|down/i, (name, v, en) => (en ? `The down payment starts at ${v}.` : `المقدم بيبدأ من ${v}.`), "payment"],
  [/تقسيط|مدة|years|instal/i, (name, v, en) => (en ? `Instalments run up to ${v}.` : `التقسيط بيوصل لـ ${v}.`), "payment"],
];

function statFact(pair, name, en) {
  for (const [rule, line, topic] of STAT_LINES) if (rule.test(pair.label)) return { text: line(name, pair.value, en), topic };
  return { text: `${pair.label}: ${pair.value}`, topic: topicOf(`${pair.label} ${pair.value}`) };
}

/** Unit types and delivery years from the page's tables (one fact each, not one per row). */
function tableFacts(html, en) {
  const types = new Set();
  const years = new Set();
  for (const row of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((c) => textOf(c[1]));
    if (cells.length < 2) continue;
    if (cells[0] && cells[0].length < 40 && !/\d{4,}/.test(cells[0])) types.add(cells[0]);
    for (const cell of cells) {
      const y = latinDigits(cell).match(/\b(20[2-4]\d)\b/);
      if (y && cell.length < 30) years.add(y[1]);
    }
  }
  const out = [];
  const typeList = [...types].slice(0, 5);
  if (typeList.length) out.push({ text: en ? `Unit types on this page: ${typeList.join(", ")}.` : `أنواع الوحدات المتاحة هنا: ${typeList.join("، ")}.`, topic: "units" });
  const yearList = [...years].sort();
  if (yearList.length) out.push({ text: en ? `Delivery for these units: ${yearList.join(", ")}.` : `استلام الوحدات دي: ${yearList.join(" و")}.`, topic: "delivery" });
  return out;
}

function proseFacts(html, keepWords = false) {
  const out = [];
  for (const m of html.matchAll(/<(p|li|dd|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    for (const s of sentences(textOf(m[2]))) out.push(s);
  }
  // Numbers and concrete words first: they make the best one-line hooks.
  const words = (s) => (s.match(/\p{L}{2,}/gu) || []).length;
  const score = (s) => (keepWords && words(s) >= 5 ? 1 : 0) + (words(s) < 5 ? -9 : 0) + (/\d|[٠-٩]/.test(s) ? 2 : 0) + (topicOf(s) !== "general" ? 1 : 0) + (s.length < 160 ? 1 : 0);
  return out.map((s, i) => ({ s, i, k: score(s) })).filter((x) => x.k >= 2).sort((a, b) => b.k - a.k || a.i - b.i).map((x) => x.s);
}

function liveOffer(offer, now) {
  if (!offer || !Array.isArray(offer.plans) || !offer.plans.length) return null;
  if (!offer.hide_after) return offer;
  const end = Date.parse(`${offer.hide_after}T23:59:59+02:00`);
  return !Number.isFinite(end) || now <= end ? offer : null;
}

/** Facts from the confirmed offer or fixed plan in content/project-showcase.json (Arabic pages). */
function showcaseFacts(slug, name, en, now) {
  const config = SHOWCASE[slug];
  if (!config || en) return [];
  const out = [];
  const offer = liveOffer(config.offer, now);
  const label = name || "المشروع";
  if (offer) {
    if (offer.years) out.push({ text: `فيه عرض جديد في ${label} بتقسيط لحد ${offer.years} سنة.`, topic: "offer" });
    if (offer.first_payment_percent) out.push({ text: `تقدر تحجز في ${label} بأول دفعة ${offer.first_payment_percent}% بس.`, topic: "offer" });
    for (const plan of offer.plans) {
      const items = (plan.items || []).filter((item) => !/للملاك الحاليين بس/.test(item));
      const monthly = items.find((item) => /قسط شهري/.test(item));
      if (monthly && !out.some((f) => f.text.includes(monthly))) out.push({ text: `في العرض ده ${monthly}.`, topic: "payment" });
      if (/خصم/.test(plan.big_label || "") && plan.big) {
        const rest = items.filter((item) => !/قسط شهري/.test(item)).slice(0, 2).join("، ");
        const owners = /ملاك|عندك وحدة/.test(`${plan.tag} ${plan.title}`);
        out.push({
          text: owners
            ? `لو عندك وحدة قبل كده في ${developerLabel(slug) || "نفس المطور"}، العرض بيديك ${plan.big_label} ${plan.big}${rest ? ` و${rest}` : ""}.`
            : `فيه نظام تاني بـ${plan.big_label} ${plan.big} على السعر${rest ? `: ${rest}` : ""}.`,
          topic: "offer",
        });
      }
    }
  } else if (config.plan?.down_payment && config.plan?.years) {
    out.push({ text: `نظام السداد في ${label}: مقدم ${config.plan.down_payment} وتقسيط على ${config.plan.years} سنين.`, topic: "payment" });
  }
  return out;
}

function developerLabel(slug) {
  const article = developerArticle(String(slug || "").split("--")[1], false);
  return article?.h1 ? textOf(article.h1).split(/[:：—–]/)[0].trim() : "";
}

const squash = (value) => String(value || "").toLowerCase().replace(/-?(developments?|developers?|group|egypt|misr)$/g, "").replace(/[^a-z0-9]/g, "");

function developerArticle(entity, en) {
  const want = squash(entity);
  if (!want) return null;
  const locale = en ? "en" : "ar";
  return DEVELOPER_ARTICLES.find((a) => a.locale === locale && squash(a.entity) === want)
    || DEVELOPER_ARTICLES.find((a) => a.locale === locale && (squash(a.entity).startsWith(want) || want.startsWith(squash(a.entity))))
    || null;
}

// The sentences from a developer article that pull a buyer in: what it is known for, its firsts, its history.
const SIGNATURE = /أشهر|يميز|بيميز|أول|signature|known for|first|pioneer|famous|تأسست|founded|سنة|عام|مشروع|project|lagoon|لاجون|i ?villa|آي فيلا/i;
function developerFacts(entity, en, limit = 6) {
  const article = developerArticle(entity, en);
  if (!article?.body_html) return [];
  const strong = /أشهر|يميز|بيميز|اشتهر|(?:^|\s)(?:أول|اول)\s(?!من)|signature|known for|first|pioneer|famous/i;
  return proseFacts(readableHtml(article.body_html).replace(/<a\b[^>]*>|<\/a>/gi, ""), true)
    .filter((s) => SIGNATURE.test(s))
    .map((s, i) => ({ s, k: strong.test(s) ? 0 : 1, i }))
    .sort((a, b) => a.k - b.k || a.i - b.i)
    .map((x) => x.s)
    .slice(0, limit)
    .map((text) => ({ text, topic: "developer" }));
}

/** Which kind of page a path is, and its slug. Only public pages; anything else is null. */
function parsePath(rawPath) {
  const path = String(rawPath || "").split(/[?#]/)[0];
  if (!/^\/[a-z0-9\-/%._]*$/i.test(path) || path.length > 200 || path.includes("..")) return null;
  if (/^\/(?:en\/?)?$/.test(path)) return null; // the homepage has its own guide
  if (/^\/(?:admin|sales|war-room|sales-war-room|media-admin|\.netlify|api)(?:[/.]|$)/i.test(path)) return null;
  const en = /^\/en(?:\/|$)/.test(path);
  const m = path.match(/^\/(?:(?:ar|en)\/)?(projects|developers|areas|units|guides|regions|reports)\/([^/]+)\/?$/i);
  return { path, en, type: m ? m[1].toLowerCase() : "page", slug: m ? decodeURIComponent(m[2]) : "" };
}

/**
 * The facts of one page. `html` is the page as the site serves it; `page` comes from parsePath().
 * Returns { name, facts: [{ id, topic, text, source }] }.
 */
function extractFacts(html, page, { now = Date.now() } = {}) {
  const en = Boolean(page?.en);
  const body = readableHtml(html);
  const name = pageName(body);
  const facts = [];
  const seen = new Set();

  if (page?.type === "projects") for (const f of showcaseFacts(page.slug, name, en, now)) addFact(facts, seen, f.text, f.topic, "offer");
  for (const pair of statPairs(body)) { const f = statFact(pair, name, en); addFact(facts, seen, f.text, f.topic, "page"); }
  for (const f of tableFacts(body, en)) addFact(facts, seen, f.text, f.topic, "page");
  for (const s of proseFacts(body)) { if (facts.length >= MAX_FACTS - 4) break; addFact(facts, seen, s, undefined, "page"); }

  const developer = page?.type === "developers" ? page.slug : page?.type === "projects" ? String(page.slug).split("--")[1] : "";
  if (developer) for (const f of developerFacts(developer, en, page.type === "developers" ? 6 : 3)) addFact(facts, seen, f.text, f.topic, "developer");

  return { name, facts: facts.slice(0, MAX_FACTS) };
}

const LEADS = {
  ar: ["تعرف إن", "خد بالك:", "معلومة:", "على فكرة،"],
  en: ["Did you know?", "Worth knowing:", "Quick fact:", "By the way,"],
};

/** Free lines straight from the facts, used when there is no AI line (or no AI budget). */
function fallbackLines(facts, en) {
  const leads = LEADS[en ? "en" : "ar"];
  return facts.map((fact, index) => {
    let text = fact.text;
    if (index > 0 && fact.source !== "offer") {
      const lead = leads[index % leads.length];
      text = en ? `${lead} ${text}` : lead === "تعرف إن" ? `${lead} ${text.replace(/[.。]$/, "")}؟` : `${lead} ${text}`;
    }
    return { topic: fact.topic, text, facts: [fact.id], ai: false };
  });
}

// Units a number can carry; "15%" and "15 سنة" are different facts.
const UNITS = [
  ["pct", /^\s*(%|٪|في المية|percent)/i],
  ["year", /^\s*(سنة|سنين|سنوات|عام|years?|yrs?)/i],
  ["month", /^\s*(شهر|شهور|أشهر|months?)/i],
  ["million", /^\s*(مليون|million|m\b)/i],
  ["billion", /^\s*(مليار|billion|bn\b)/i],
  ["thousand", /^\s*(ألف|الف|آلاف|thousand|k\b)/i],
  ["money", /^\s*(جنيه|ج\.م|egp|le\b)/i],
  ["area", /^\s*(م²|م2|متر|sqm|m²|m2)/i],
  ["minute", /^\s*(دقيقة|دقايق|دقائق|minutes?|mins?)/i],
  ["room", /^\s*(غرف|غرفة|أوض|bedrooms?|beds?)/i],
];
function numberTokens(text) {
  const clean = latinDigits(text).replace(/(\d)[,٬](?=\d{3}\b)/g, "$1");
  const out = [];
  for (const m of clean.matchAll(/\d+(?:[.٫]\d+)?/g)) {
    const value = String(Number(m[0].replace("٫", ".")));
    const after = clean.slice(m.index + m[0].length, m.index + m[0].length + 14);
    const unit = (UNITS.find(([, rule]) => rule.test(after)) || [""])[0];
    out.push({ value, unit });
  }
  return out;
}

/** True when an AI line is safe to show: short, and every number in it (with its unit) is in its facts. */
function checkLine(text, factTexts) {
  const line = String(text || "").trim();
  if (line.length < 8 || line.length > 200) return false;
  if (/https?:|www\.|<|>|\{|\}/i.test(line)) return false;
  const facts = factTexts.flatMap(numberTokens);
  const withUnit = new Set(facts.map((t) => `${t.value}|${t.unit}`));
  const plain = new Set(facts.map((t) => t.value));
  return numberTokens(line).every((t) => (t.unit ? withUnit.has(`${t.value}|${t.unit}`) : plain.has(t.value)));
}

module.exports = { TOPICS, topicOf, numbersIn, parsePath, extractFacts, fallbackLines, checkLine, developerFacts, statPairs };
