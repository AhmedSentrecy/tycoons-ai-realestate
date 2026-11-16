"use strict";

// The "showcase" block of a project page: a scroll walk-through of the project's photos, the
// developer's current offer, and a down-payment calculator. One builder for the pre-rendered
// page (scripts/lib/data-pages.cjs) and the browser page (src/pages/ProjectPage.tsx), so both
// show the same thing. Which projects get it, and the offer terms, live in
// content/project-showcase.json. The walk-through takes its full scroll length from CSS alone, so
// the page below never moves when /showcase.js arrives; the script only moves the photos. With
// "reduce motion" the photos are a plain strip.
const { sizedImage } = require("./_images.cjs");

let CONFIG = {};
try { CONFIG = require("../../content/project-showcase.json").projects || {}; } catch { CONFIG = {}; }

const WHATSAPP_NUMBER = "201110100025";

function esc(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function number(value) {
  const parsed = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}
function money(value) { return Math.round(value).toLocaleString("en-US"); }
// Latin digits and % stay left-to-right inside Arabic text.
function ltr(value) { return esc(value).replace(/(\d[\d.,]*%?)/g, '<span class="tsc-n">$1</span>'); }

function showcaseConfig(slug) {
  const config = CONFIG[String(slug || "").trim()];
  return config && typeof config === "object" ? config : null;
}

// The offer is shown until the end of its last day (Cairo time). The date is never printed.
function offerIsLive(offer, now = Date.now()) {
  if (!offer || !Array.isArray(offer.plans) || !offer.plans.length) return false;
  if (!offer.hide_after) return true;
  const end = Date.parse(`${offer.hide_after}T23:59:59+02:00`);
  return !Number.isFinite(end) || now <= end;
}

function bedrooms(raw, en) {
  const count = parseInt(String(raw || ""), 10);
  if (!(count > 0)) return "";
  if (en) return count === 1 ? "1 bedroom" : `${count} bedrooms`;
  return count === 2 ? "غرفتين" : `${count} غرف`;
}
// "iCity October - Sky Loft" -> "Sky Loft": drop a project-name prefix from the unit type.
function unitName(raw) { return String(raw || "").replace(/^[^-]{3,40}\s-\s/, "").trim(); }
function unitLabel(unit, en) {
  return [unitName(unit.unit_type), bedrooms(unit.bedrooms_text, en), number(unit.area_sqm) ? `${number(unit.area_sqm)} ${en ? "m²" : "م²"}` : ""].filter(Boolean).join(en ? ", " : "، ");
}

// A unit's own payment plan, read from the inventory text. Returns null unless the text is a plain
// list of percentages ("5%", "2% + 2% + 2%", "5% down payment + 5% after 3 months") and the term is
// a plain number of years, so a vague line ("المقدمات تبدأ من 3% في بعض المشاريع") shows nothing
// instead of a wrong number.
const VAGUE = /حسب|قد تصل|تبدأ من|يبدأ من|starts? from|up to|varies|options?|depending|where applicable|egp|جنيه|:/i;
function unitPlan(unit) {
  const down = String(unit?.down_payment_text ?? "").trim();
  const term = String(unit?.installments_text ?? "").trim();
  if (!down || !term || VAGUE.test(down) || /حسب|قد تصل|depending|varies/i.test(term)) return null;
  const parts = [];
  for (const segment of down.split("+")) {
    const match = segment.trim().match(/^(\d+(?:\.\d+)?)\s*%\s*(.*)$/);
    if (!match) return null;
    const rest = match[2].replace(/down\s*payment|\bdp\b|مقدم/gi, "").trim();
    const after = rest.match(/^after\s+(\d+)\s+months?$/i);
    if (rest && !after) return null;
    parts.push({ percent: Number(match[1]), months: after ? Number(after[1]) : 0 });
  }
  const total = parts.reduce((sum, part) => sum + part.percent, 0);
  const years = Number((term.match(/(\d{1,2})\s*(?:years?|سنوات|سنين|سنة)/i) || [])[1]);
  if (!parts.length || parts.length > 3 || !(parts[0].percent > 0) || !(total < 50) || !(years >= 1 && years <= 20)) return null;
  return { parts, years };
}

// Fixed wording of the block, per language. {name} is the project; the other values come from the plans.
const TEXT = {
  ar: {
    dir: "rtl", walkTitle: "جولة جوه {name}", walkCount: "{count} صور من المشروع.", of: "من", photo: "صورة {index}",
    factFirst: "أول دفعة للحجز", factYearsLabel: "أطول مدة تقسيط", factPrice: "{price} مليون", factPriceLabel: "أقل سعر وحدة",
    offerEyebrow: "عرض المطور الحالي", plansEyebrow: "أنظمة السداد المتاحة", plansTitle: "أنظمة السداد في {name}",
    plansIntro: "دي أنظمة السداد المسجلة على الوحدات المتاحة عندنا في {name} دلوقتي.",
    plansNote: "الأنظمة دي من بيانات الوحدات المتاحة عندنا وممكن تتغير. الأرقام النهائية بتتأكد وقت الحجز.",
    planTitle: "مقدم {total} وتقسيط {years}", planFirst: "أول دفعة", planSingle: "مقدم", planParts: "المقدم على {count} دفعات: {list}",
    planYears: "تقسيط لحد {years}", planFrom: "أسعار من {price} جنيه",
    calcEyebrow: "احسبها على وحدتك", calcTitle: "مقدم {name} كام؟",
    calcSub: "اختار وحدة وشوف دفعات المقدم بنظام الـ {percent}. الباقي بيتقسط لحد {years}.",
    calcSubPlans: "اختار وحدة وشوف دفعات المقدم حسب نظام السداد المسجل عليها.", pick: "الوحدة",
    calcNote: "حساب تقريبي من السعر المعلن. جدول السداد الرسمي للوحدة بيوصلك على واتساب.", cta: "ابعتلي جدول الوحدة دي",
    price: "سعر الوحدة", total: "إجمالي المقدم", term: "مدة التقسيط", money: "{amount} جنيه",
    first: "أول دفعة", single: "المقدم", nth: ["", "الدفعة التانية", "الدفعة التالتة"], after: "بعد {months} شهور",
    message: "أهلاً Tycoons، عايز جدول السداد لوحدة {unit} في {name} (سعر {price} جنيه)",
  },
  en: {
    dir: "ltr", walkTitle: "A walk through {name}", walkCount: "{count} photos of the project.", of: "of", photo: "Photo {index}",
    factFirst: "First payment to book", factYearsLabel: "Longest instalment term", factPrice: "EGP {price}M", factPriceLabel: "Lowest home price",
    offerEyebrow: "Current developer offer", plansEyebrow: "Payment plans available", plansTitle: "{name} payment plans",
    plansIntro: "These are the payment plans recorded on the homes we currently have available at {name}.",
    plansNote: "These plans come from our available-homes data and can change. Final figures are confirmed when you book.",
    planTitle: "{total} down payment, {years} of instalments", planFirst: "first payment", planSingle: "down payment", planParts: "Down payment in {count} parts: {list}",
    planYears: "Instalments over up to {years}", planFrom: "Prices from EGP {price}",
    calcEyebrow: "Work it out for your home", calcTitle: "How much is the down payment at {name}?",
    calcSub: "Pick a home to see the down-payment instalments on the {percent} plan. The balance is paid over up to {years}.",
    calcSubPlans: "Pick a home to see its down-payment instalments under the payment plan recorded for it.", pick: "Home",
    calcNote: "An estimate from the listed price. The official payment schedule for the home reaches you on WhatsApp.", cta: "Send me this home's schedule",
    price: "Home price", total: "Total down payment", term: "Instalment term", money: "EGP {amount}",
    first: "First payment", single: "Down payment", nth: ["", "Second payment", "Third payment"], after: "After {months} months",
    message: "Hello Tycoons, I'd like the payment schedule for {unit} at {name} (price EGP {price})",
  },
};
function fill(template, values) { return String(template).replace(/\{(\w+)\}/g, (_, key) => (key in values ? String(values[key]) : `{${key}}`)); }
function yearsText(years, en) {
  if (en) return years === 1 ? "1 year" : `${years} years`;
  return years >= 3 && years <= 10 ? `${years} سنين` : `${years} سنة`;
}
function percentText(value) { return `${Number(value.toFixed(2))}%`; }

const STYLE = `<style>
.tsc{--tsc-night:#0b1a14;--tsc-deep:#10261d;--tsc-line:rgba(255,255,255,.12);--tsc-soft:#b9c7bf;--tsc-gold:#d9b87c;background:var(--tsc-night);color:#eef3ef;line-height:1.75}
.tsc *{box-sizing:border-box}
.tsc h2,.tsc h3,.tsc p{margin:0}
.tsc h2,.tsc h3{color:#fff}
.tsc-n{direction:ltr;unicode-bidi:isolate;font-variant-numeric:tabular-nums}
.tsc-wrap{width:min(1120px,100%);margin:0 auto;padding-inline:clamp(18px,5vw,56px)}
.tsc-eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:var(--tsc-gold)}
.tsc-eyebrow::before{content:"";width:22px;height:1px;background:var(--tsc-gold)}
.tsc .tsc-h{font-size:clamp(24px,4.6vw,38px);font-weight:800;line-height:1.3;margin-block:10px 8px}
.tsc-sub{color:var(--tsc-soft);max-width:62ch}
.tsc-sec{padding-block:clamp(44px,7vw,80px)}
.tsc-facts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;padding-block:26px 0}
.tsc-fact{padding:14px 14px 12px;border:1px solid var(--tsc-line);border-radius:16px;background:var(--tsc-deep)}
.tsc-fact b{display:block;font-size:clamp(20px,4.4vw,30px);font-weight:800;line-height:1.2;color:#fff}
.tsc-fact>span{display:block;font-size:12.5px;color:var(--tsc-soft)}
.tsc-walk{position:relative}
.tsc-world{display:flex;gap:14px;overflow-x:auto;padding:22px clamp(18px,5vw,56px) 8px;scroll-snap-type:x mandatory}
.tsc-shot{position:relative;flex:0 0 min(78vw,520px);aspect-ratio:16/10.5;margin:0;border-radius:22px;overflow:hidden;background:var(--tsc-deep);scroll-snap-align:center}
.tsc-shot img{display:block;width:100%;height:100%;object-fit:cover}
.tsc-shot figcaption{position:absolute;inset:auto 0 0 0;padding:34px 18px 14px;background:linear-gradient(to top,rgba(11,26,20,.92),transparent);font-weight:700;font-size:15px}
.tsc-shot figcaption small{display:block;font-weight:400;color:var(--tsc-soft);font-size:12.5px}
.tsc-walk-title{padding:26px clamp(18px,5vw,56px) 0}
.tsc-bar{display:none}
@media (prefers-reduced-motion:no-preference){
.tsc-walk{height:calc(100svh * var(--tsc-screens,4))}
.tsc-walk .tsc-stage{position:sticky;top:0;height:100svh;overflow:hidden;perspective:1100px;perspective-origin:50% 48%;background:radial-gradient(120% 90% at 50% 40%,#17382d 0%,var(--tsc-night) 70%)}
.tsc-walk .tsc-world{position:absolute;inset:0;display:block;overflow:visible;padding:0;transform-style:preserve-3d}
.tsc-walk .tsc-shot{--tsc-sw:min(82vw,820px,calc(100svh * .86));position:absolute;top:48%;left:50%;width:var(--tsc-sw);margin:calc(var(--tsc-sw) * -.33) 0 0 calc(var(--tsc-sw) * -.5);box-shadow:0 40px 90px -30px rgba(0,0,0,.85);will-change:transform,opacity;backface-visibility:hidden;opacity:0}
.tsc-walk .tsc-shot:first-child{opacity:1}
.tsc-walk .tsc-walk-title{position:absolute;inset:auto 0 0 0;z-index:5;padding:40px clamp(18px,5vw,56px) 96px;pointer-events:none;background:linear-gradient(to top,var(--tsc-night) 30%,transparent)}
.tsc-walk .tsc-bar{display:block;height:3px;margin-top:12px;border-radius:3px;background:rgba(255,255,255,.12);overflow:hidden}
}
.tsc-bar i{display:block;height:100%;background:var(--tsc-gold);transform-origin:right;transform:scaleX(0)}
.tsc[dir=ltr] .tsc-bar i{transform-origin:left}
.tsc-plans{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-top:28px}
.tsc-plan{padding:24px 22px;border-radius:22px;border:1px solid var(--tsc-line);background:linear-gradient(160deg,#1a3b30,#10261d)}
.tsc-plan.is-best{border-color:rgba(217,184,124,.7);background:linear-gradient(160deg,#24473a,#132c22)}
.tsc-tag{display:inline-block;font-size:12px;font-weight:700;padding:3px 12px;border-radius:999px;background:rgba(217,184,124,.16);color:var(--tsc-gold)}
.tsc-plan h3{font-size:19px;line-height:1.4;margin-block:12px 4px}
.tsc-big{font-size:clamp(38px,6vw,54px);font-weight:800;line-height:1.1;color:#fff}
.tsc-big small{font-size:15px;font-weight:600;color:var(--tsc-soft)}
.tsc-plan ul{list-style:none;margin:16px 0 0;padding:0;display:flex;flex-direction:column;gap:8px;font-size:14.5px;color:var(--tsc-soft)}
.tsc-plan li{position:relative;padding-inline-start:18px}
.tsc-plan li::before{content:"";position:absolute;inset-inline-start:0;top:10px;width:7px;height:7px;border-radius:50%;background:var(--tsc-gold)}
.tsc-note{margin-top:16px;font-size:13px;color:var(--tsc-soft)}
.tsc-calc{display:grid;grid-template-columns:1.1fr .9fr;gap:22px;margin-top:26px;align-items:start}
.tsc-pick{display:flex;flex-direction:column;gap:8px}
.tsc-pick label{font-size:14px;font-weight:700}
.tsc-pick select{font:inherit;font-size:15px;padding:13px 14px;border-radius:14px;border:1px solid var(--tsc-line);background:var(--tsc-deep);color:#eef3ef;width:100%}
.tsc-steps{border:1px solid var(--tsc-line);border-radius:20px;overflow:hidden;background:var(--tsc-deep)}
.tsc-step{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:baseline;padding:15px 18px;border-bottom:1px solid var(--tsc-line)}
.tsc-step:last-child{border-bottom:0}
.tsc-step[hidden]{display:none}
.tsc-step span{font-size:14.5px;color:var(--tsc-soft)}
.tsc-step b{font-size:clamp(18px,3.4vw,24px);font-weight:800;color:#fff}
.tsc-step.is-total{background:rgba(217,184,124,.1)}
.tsc-step.is-total b{color:var(--tsc-gold)}
.tsc-btn{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 22px;margin-top:8px;align-self:flex-start;border-radius:14px;background:#1faa59;color:#fff;font-weight:800;font-size:15px;text-decoration:none}
@media (max-width:860px){.tsc-plans,.tsc-calc{grid-template-columns:1fr}.tsc-fact{padding:12px 10px 10px}}
</style>`;

// units: the project's live units ({ unit_type, bedrooms_text, area_sqm, starting_price,
// down_payment_text, installments_text }). images: the project's photos in page order (main photo
// first). Returns "" for projects that are not in content/project-showcase.json, and for English
// when the project has no English name there.
function showcaseHtml({ slug, images = [], units = [], lang = "ar", now = Date.now() } = {}) {
  const config = showcaseConfig(slug);
  const en = lang === "en";
  if (!config || (lang !== "ar" && !en)) return "";
  const name = en ? config.name_en || config.en?.name || "" : config.name_ar || "";
  if (!name) return "";
  const t = TEXT[en ? "en" : "ar"];
  const baseOffer = offerIsLive(config.offer, now) ? config.offer : null;
  // English wording replaces the Arabic text of the offer; the figures stay in one place.
  const offer = baseOffer && en
    ? (config.en?.offer ? { ...baseOffer, ...config.en.offer, down_payment_parts: (baseOffer.down_payment_parts || []).map((part, index) => [config.en.offer.down_payment_labels?.[index] || part[0], part[1]]) } : null)
    : baseOffer;
  const amount = (value) => fill(esc(t.money), { amount: `<span class="tsc-n">${money(value)}</span>` });
  const partLabel = (part, index, count) => (count === 1 ? t.single : index === 0 ? t.first : part.months ? fill(t.after, { months: part.months }) : t.nth[index] || t.first);

  // Every priced unit with its plan: the offer's plan when there is one, otherwise the unit's own.
  const offerPlan = offer && Array.isArray(offer.down_payment_parts) && offer.down_payment_parts.length
    ? { years: number(offer.years), parts: offer.down_payment_parts.map((part) => ({ label: part[0], percent: number(part[1]) })) }
    : null;
  const priced = units
    .map((unit) => {
      const own = offerPlan ? null : unitPlan(unit);
      const plan = offerPlan || (own ? { years: own.years, parts: own.parts.map((part, index) => ({ label: partLabel(part, index, own.parts.length), percent: part.percent, months: part.months })) } : null);
      return { label: unitLabel(unit, en), price: number(unit.starting_price), plan };
    })
    .filter((unit) => unit.label && unit.price > 0)
    .sort((a, b) => a.price - b.price);
  const minPrice = priced.length ? priced[0].price : 0;
  const withPlan = priced.filter((unit) => unit.plan);

  const stops = (en ? config.en?.stops : config.walk?.stops) || [];
  const photos = Array.isArray(config.walk?.photos) ? config.walk.photos : [];
  // Without written captions a photo is labelled with the project name only, so no caption can mismatch its photo.
  const shots = photos.map((position, index) => ({ stop: stops[index] || [name, ""], alt: stops[index] ? `${name}: ${stops[index][0]}` : `${name} — ${fill(t.photo, { index: index + 1 })}`, url: images[position] })).filter((shot) => shot.url);
  const walk = shots.length >= 3 ? `<div class="tsc-walk" data-tsc-walk data-of="${esc(t.of)}" style="--tsc-screens:${(shots.length * 0.55 + 1).toFixed(2)}"><div class="tsc-stage">
<div class="tsc-world">${shots.map((shot) => `<figure class="tsc-shot"><img src="${esc(sizedImage(shot.url, 1200))}" srcset="${esc(sizedImage(shot.url, 700))} 700w, ${esc(sizedImage(shot.url, 1200))} 1200w" sizes="(max-width: 700px) 82vw, 820px" alt="${esc(shot.alt)}" width="960" height="630" loading="lazy" decoding="async"><figcaption>${esc(shot.stop[0])}<small>${esc(shot.stop[1] || "")}</small></figcaption></figure>`).join("")}</div>
<div class="tsc-walk-title"><h2 class="tsc-h">${esc(fill(t.walkTitle, { name }))}</h2><p class="tsc-sub" data-tsc-caption>${esc(fill(t.walkCount, { count: shots.length }))}</p><div class="tsc-bar" aria-hidden="true"><i data-tsc-bar></i></div></div>
</div></div>` : "";

  const lowestFirst = withPlan.length ? Math.min(...withPlan.map((unit) => unit.plan.parts[0].percent)) : 0;
  const longestYears = withPlan.length ? Math.max(...withPlan.map((unit) => unit.plan.years)) : 0;
  const facts = withPlan.length && minPrice ? `<div class="tsc-wrap"><div class="tsc-facts">
<div class="tsc-fact"><b>${ltr(percentText(lowestFirst))}</b><span>${esc(t.factFirst)}</span></div>
<div class="tsc-fact"><b>${ltr(yearsText(longestYears, en))}</b><span>${esc(t.factYearsLabel)}</span></div>
<div class="tsc-fact"><b>${ltr(fill(t.factPrice, { price: (Math.floor(minPrice / 100000) / 10).toFixed(1) }))}</b><span>${esc(t.factPriceLabel)}</span></div>
</div></div>` : "";

  // Without an offer: one card per distinct plan found on the live units (at most three, lowest first payment first).
  const ownPlans = offer ? [] : [...withPlan.reduce((map, unit) => {
    const key = `${unit.plan.parts.map((part) => `${part.percent}@${part.months || 0}`).join("+")}/${unit.plan.years}`;
    const entry = map.get(key) || { plan: unit.plan, min: unit.price };
    entry.min = Math.min(entry.min, unit.price);
    return map.set(key, entry);
  }, new Map()).values()].sort((a, b) => a.plan.parts[0].percent - b.plan.parts[0].percent || b.plan.years - a.plan.years).slice(0, 3);
  const planCards = offer
    ? offer.plans.map((plan) => ({ best: plan.best, tag: plan.tag, title: plan.title, big: plan.big, bigLabel: plan.big_label, items: plan.items || [] }))
    : ownPlans.map(({ plan, min }, index) => {
      const total = plan.parts.reduce((sum, part) => sum + part.percent, 0);
      const list = plan.parts.map((part, at) => `${percentText(part.percent)}${part.months && at ? ` ${fill(t.after, { months: part.months }).toLowerCase()}` : ""}`).join(" + ");
      return {
        best: index === 0, tag: "", title: fill(t.planTitle, { total: percentText(total), years: yearsText(plan.years, en) }),
        big: percentText(plan.parts[0].percent), bigLabel: plan.parts.length > 1 ? t.planFirst : t.planSingle,
        items: [...(plan.parts.length > 1 ? [!en && plan.parts.length === 2 ? `المقدم على دفعتين: ${list}` : fill(t.planParts, { count: plan.parts.length, list })] : []), fill(t.planYears, { years: yearsText(plan.years, en) }), fill(t.planFrom, { price: money(min) })],
      };
    });
  // A plan the developer announced that is not on any live unit yet (a new launch), written in the settings file.
  if (!offer && planCards.length) {
    const extra = (en ? config.en?.plans_extra : config.plans_extra) || [];
    planCards.splice(Math.max(0, 3 - extra.length), planCards.length, ...extra.map((plan) => ({ best: false, tag: plan.tag, title: plan.title, big: plan.big, bigLabel: plan.big_label, items: plan.items || [] })));
  }
  const plans = planCards.length ? `<section class="tsc-sec" id="${offer ? "offer" : "payment-plans"}"><div class="tsc-wrap"><span class="tsc-eyebrow">${esc(offer ? t.offerEyebrow : t.plansEyebrow)}</span>
<h2 class="tsc-h">${esc(offer ? offer.title : fill(t.plansTitle, { name }))}</h2><p class="tsc-sub">${esc(offer ? offer.intro : fill(t.plansIntro, { name }))}</p>
<div class="tsc-plans">${planCards.map((plan) => `<article class="tsc-plan${plan.best ? " is-best" : ""}">${plan.tag ? `<span class="tsc-tag">${esc(plan.tag)}</span>` : ""}<h3>${ltr(plan.title)}</h3><p class="tsc-big">${ltr(plan.big)} <small>${esc(plan.bigLabel)}</small></p><ul>${plan.items.map((item) => `<li>${ltr(item)}</li>`).join("")}</ul></article>`).join("")}</div>
<p class="tsc-note">${esc(offer ? offer.note || "" : t.plansNote)}</p></div></section>` : "";

  const first = withPlan[0];
  const messageTemplate = fill(t.message, { name });
  const rows = Math.max(0, ...withPlan.map((unit) => unit.plan.parts.length));
  const partsData = (unit) => JSON.stringify(unit.plan.parts.map((part) => [part.label, part.percent]));
  const totalOf = (unit) => unit.plan.parts.reduce((sum, part) => sum + part.percent, 0);
  const calculator = first ? `<section class="tsc-sec" style="padding-top:0" id="down-payment"><div class="tsc-wrap"><span class="tsc-eyebrow">${esc(t.calcEyebrow)}</span>
<h2 class="tsc-h">${esc(fill(t.calcTitle, { name }))}</h2><p class="tsc-sub">${ltr(offerPlan ? fill(t.calcSub, { percent: percentText(offerPlan.parts[0].percent), years: yearsText(offerPlan.years, en) }) : t.calcSubPlans)}</p>
<div class="tsc-calc" data-tsc-calc data-whatsapp="${WHATSAPP_NUMBER}" data-message="${esc(messageTemplate)}">
<div class="tsc-pick"><label for="tsc-home">${esc(t.pick)}</label><select id="tsc-home" data-tsc-select>${withPlan.map((unit) => `<option value="${unit.price}" data-label="${esc(unit.label)}" data-parts="${esc(partsData(unit))}" data-term="${esc(yearsText(unit.plan.years, en))}">${esc(unit.label)} · ${esc(fill(t.money, { amount: money(unit.price) }))}</option>`).join("")}</select>
<p class="tsc-note">${esc(t.calcNote)}</p>
<a class="tsc-btn" data-tsc-cta data-wa-source="project-showcase-calculator" rel="noopener" href="https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(fill(messageTemplate, { unit: first.label, price: money(first.price) }))}">${esc(t.cta)}</a></div>
<div class="tsc-steps" aria-live="polite"><div class="tsc-step"><span>${esc(t.price)}</span><b>${amount(first.price).replace('class="tsc-n"', 'class="tsc-n" data-tsc-price')}</b></div>
${Array.from({ length: rows }, (_, index) => { const part = first.plan.parts[index]; return `<div class="tsc-step" data-tsc-row="${index}"${part ? "" : " hidden"}><span data-tsc-label="${index}">${part ? `${esc(part.label)} (${ltr(percentText(part.percent))})` : ""}</span><b>${amount(part ? first.price * part.percent / 100 : 0).replace('class="tsc-n"', `class="tsc-n" data-tsc-part="${index}"`)}</b></div>`; }).join("")}
<div class="tsc-step is-total"><span>${esc(t.total)} (<span class="tsc-n" data-tsc-totalpct>${percentText(totalOf(first))}</span>)</span><b>${amount(first.price * totalOf(first) / 100).replace('class="tsc-n"', 'class="tsc-n" data-tsc-total')}</b></div>
<div class="tsc-step"><span>${esc(t.term)}</span><b data-tsc-term>${ltr(yearsText(first.plan.years, en))}</b></div></div>
</div></div></section>` : "";

  if (!walk && !plans) return "";
  return `${STYLE}<div class="tsc" dir="${t.dir}" lang="${en ? "en" : "ar"}" data-showcase>${facts}${walk}${plans}${calculator}</div>`;
}

module.exports = { showcaseHtml, showcaseConfig, offerIsLive, unitPlan };
