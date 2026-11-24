// Live offers / new launches / price changes of a project (table project_offers, published from the
// admin tab «تحديثات المشاريع»). Shared by the pre-rendered Arabic project page and the app, so the
// same words (and keywords: "عروض <project>", "طرح جديد", "خصم") appear wherever the project is shown.

const OFFER_LABELS_AR = {
  offer: "عرض",
  launch: "طرح جديد",
  price_change: "تحديث الأسعار",
  other: "تحديث",
};
const OFFER_ORDER = ["offer", "launch", "price_change", "other"];

const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

/** Offers still live today (no end date, or the end date has not passed), offers first. */
function liveOffers(rows, today = new Date().toISOString().slice(0, 10)) {
  return (Array.isArray(rows) ? rows : [])
    .filter((row) => row && clean(row.title_ar) && row.active !== false && (!row.valid_until || String(row.valid_until).slice(0, 10) >= today))
    .sort((a, b) => OFFER_ORDER.indexOf(a.kind) - OFFER_ORDER.indexOf(b.kind) || String(b.created_at || "").localeCompare(String(a.created_at || "")));
}

function untilAr(value) {
  const day = String(value || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return "";
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** The "أحدث العروض والتحديثات في <project>" article section (empty string when there is no live offer). */
function offersSectionHtml(rows, { projectName, escapeHtml }) {
  const offers = liveOffers(rows);
  if (!offers.length) return "";
  const items = offers.map((offer) => {
    const label = OFFER_LABELS_AR[offer.kind] || OFFER_LABELS_AR.other;
    const until = untilAr(offer.valid_until);
    return `<li class="mt-4 rounded-2xl border border-[#f0d9a8] bg-[#fffaf1] p-5"><p class="font-extrabold"><span class="me-2 rounded-full bg-[#b47c17] px-3 py-1 text-xs text-white">${escapeHtml(label)}</span>${escapeHtml(clean(offer.title_ar))}</p>${clean(offer.body_ar) ? `<p class="mt-3 leading-loose text-[#556070]">${escapeHtml(clean(offer.body_ar))}</p>` : ""}${until ? `<p class="mt-2 text-sm text-[#8a6a2f]">العرض ساري لحد ${escapeHtml(until)}</p>` : ""}</li>`;
  }).join("");
  return `<section class="mb-12" id="offers"><h2 class="text-3xl font-extrabold">أحدث العروض والتحديثات في ${escapeHtml(projectName)}</h2><p class="mt-3 text-sm text-[#556070]">من المطور مباشرة — اسألنا عن الوحدات اللي عليها العرض قبل ما يخلص.</p><ul class="mt-2">${items}</ul></section>`;
}

/** Extra keywords for the page head when the project has live offers. */
function offerKeywords(rows, projectName) {
  const kinds = new Set(liveOffers(rows).map((row) => row.kind));
  const name = clean(projectName);
  if (!kinds.size || !name) return [];
  return [
    ...(kinds.has("offer") ? [`عروض ${name}`, `خصم ${name}`] : []),
    ...(kinds.has("launch") ? [`طرح جديد ${name}`] : []),
    ...(kinds.has("price_change") ? [`أسعار ${name} الجديدة`] : []),
  ];
}

module.exports = { OFFER_LABELS_AR, liveOffers, offersSectionHtml, offerKeywords, untilAr };
