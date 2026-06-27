const SUPABASE_URL = window.TYCOONS_SUPABASE_URL;
const SUPABASE_KEY = window.TYCOONS_SUPABASE_KEY;
const API_BASE = SUPABASE_URL + "/rest/v1";
const TYCOONS_WHATSAPP_NUMBER = "201200704344";
const WHATSAPP_TRACKING_TABLE = "whatsapp_clicks";
const WHATSAPP_UTM_SOURCE = "website";
const WHATSAPP_UTM_MEDIUM = "whatsapp";
const WHATSAPP_UTM_CAMPAIGN = "tycoons_lead";

let units = [];
let projects = [];
let isSearching = false;
let realtimePc = null;
let realtimeDc = null;
let realtimeStream = null;
let remoteAudio = null;
let micTrack = null;
let pendingVoiceLead = null;
const handledFunctionCalls = new Set();

const results = document.getElementById("results");
const projectGrid = document.getElementById("projectGrid");
const searchInput = document.getElementById("searchInput");
const statusBox = document.getElementById("status");
const leadForm = document.getElementById("leadForm");
const leadStatus = document.getElementById("leadStatus");
const voiceBtn = document.getElementById("voiceBtn");
const searchBtn = document.getElementById("searchBtn");
const startVoiceAgentBtn = document.getElementById("startVoiceAgentBtn");
const holdToTalkBtn = document.getElementById("holdToTalkBtn");
const stopVoiceAgentBtn = document.getElementById("stopVoiceAgentBtn");
const voiceStatus = document.getElementById("voiceStatus");
const phoneConfirmBox = document.getElementById("phoneConfirmBox");
const detectedPhoneInput = document.getElementById("detectedPhoneInput");
const confirmPhoneBtn = document.getElementById("confirmPhoneBtn");
const cancelPhoneBtn = document.getElementById("cancelPhoneBtn");

if (document.getElementById("year")) document.getElementById("year").textContent = new Date().getFullYear();

function headers(extra = {}) {
  return { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY, "Content-Type": "application/json", ...extra };
}

async function getRows(table, query = "") {
  const res = await fetch(API_BASE + "/" + table + query, { headers: headers() });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function insertRow(table, row) {
  const res = await fetch(API_BASE + "/" + table, {
    method: "POST",
    headers: headers({ Prefer: "return=minimal" }),
    body: JSON.stringify(row)
  });
  if (!res.ok) throw new Error(await res.text());
}

function safe(value, fallback = "Not specified") {
  return value === null || value === undefined || value === "" ? fallback : value;
}

function escapeAttr(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* ============================================================
   PROJECT PAGE LINK BUILDER
   ------------------------------------------------------------
   Mirrors the exact same slugify logic used in
   scripts/generate-pages.js so the link always points to the
   real, already-built static page (/projects/<slug>.html).
   ============================================================ */
function slugify(str) {
  if (!str) return "unit";
  return String(str)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "item";
}

function projectPageUrl(projectName, location) {
  const slug = slugify(`${projectName || ""}-${location || ""}`);
  return `/projects/${slug}.html`;
}


function whatsappUrl(message, source = "website", extra = {}) {
  const trackingId = extra.tracking_id || ("wa_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8));
  const contextLines = [
    "",
    "Source: " + source,
    "Page: " + (extra.page_path || currentCleanPageUrl()),
    "Tracking ID: " + trackingId
  ];

  const trackedMessage = String(message || "Hello Tycoons Investments, I want suitable property options.")
    + contextLines.join("\n");

  return "https://wa.me/" + TYCOONS_WHATSAPP_NUMBER + "?text=" + encodeURIComponent(trackedMessage);
}


function currentCleanPageUrl() {
  return String(window.location.href || "https://tycoons-inv.de/").split("#")[0];
}

function whatsappLine(label, value) {
  const clean = safe(value, "");
  return clean ? `${label}: ${clean}` : "";
}

function whatsappMoney(value) {
  const num = Number(value || 0);
  if (!num) return "";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(num)) + " EGP";
}

function itemDisplayUrl(item) {
  return item.image_url || item.brochure_url || currentCleanPageUrl();
}

function unitWhatsappMessage(item) {
  return [
    "Hello Tycoons Investments,",
    "I am interested in this available unit:",
    "",
    whatsappLine("Project", item.project_name),
    whatsappLine("Developer", item.developer),
    whatsappLine("Location", item.location),
    whatsappLine("Unit type", item.unit_type),
    whatsappLine("Bedrooms", item.bedrooms_text),
    whatsappLine("Area", areaText(item.area_sqm)),
    whatsappLine("Starting price", whatsappMoney(item.starting_price)),
    whatsappLine("Delivery", item.delivery_text),
    whatsappLine("Finishing", item.finishing),
    "",
    whatsappLine("URL", itemDisplayUrl(item)),
    item.brochure_url && item.brochure_url !== itemDisplayUrl(item) ? whatsappLine("Brochure", item.brochure_url) : "",
    "",
    "Please send me the latest availability and payment plan."
  ].filter(Boolean).join("\n");
}

function projectWhatsappMessage(item) {
  return [
    "Hello Tycoons Investments,",
    "I am interested in this project:",
    "",
    whatsappLine("Project", item.name),
    whatsappLine("Developer", item.developer),
    whatsappLine("Location", item.location),
    whatsappLine("Starting price", whatsappMoney(item.min_price)),
    whatsappLine("Status", item.status),
    "",
    whatsappLine("URL", itemDisplayUrl(item)),
    item.brochure_url && item.brochure_url !== itemDisplayUrl(item) ? whatsappLine("Brochure", item.brochure_url) : "",
    "",
    "Please send me available options and details."
  ].filter(Boolean).join("\n");
}


function whatsappButton(label, message, source = "card_whatsapp", extra = {}) {
  const attrs = [
    `data-wa-source="${escapeAttr(source)}"`,
    `data-wa-message="${escapeAttr(message)}"`
  ];

  Object.entries(extra || {}).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      attrs.push(`data-wa-${escapeAttr(key)}="${escapeAttr(value)}"`);
    }
  });

  return `<a class="card-whatsapp" href="${whatsappUrl(message, source, extra)}" target="_blank" rel="noopener" ${attrs.join(" ")}>${label}</a>`;
}

function parseGalleryUrls(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map(url => String(url || "").trim()).filter(Boolean);
  }

  return String(value || "")
    .split(/[\n,]+/)
    .map(url => url.trim())
    .filter(Boolean);
}

function mediaUrls(item) {
  const urls = [item.image_url, ...parseGalleryUrls(item.gallery_urls)]
    .map(url => String(url || "").trim())
    .filter(Boolean);

  return Array.from(new Set(urls));
}

function mediaImage(item) {
  const location = safe(item.location);
  const urls = mediaUrls(item);

  if (urls.length > 1) {
    const slides = urls.map((url, index) => {
      return `<img class="carousel-img${index === 0 ? " active" : ""}" src="${escapeAttr(url)}" alt="${escapeAttr(location)} image ${index + 1}" loading="lazy" referrerpolicy="no-referrer">`;
    }).join("");

    const dots = urls.map((_, index) => {
      return `<button class="carousel-dot${index === 0 ? " active" : ""}" type="button" data-carousel-dot="${index}" aria-label="Show image ${index + 1}"></button>`;
    }).join("");

    return `
      <div class="image photo has-img image-carousel" data-carousel-index="0">
        <div class="carousel-track">${slides}</div>
        <button class="carousel-nav carousel-prev" type="button" data-carousel-dir="-1" aria-label="Previous image">‹</button>
        <button class="carousel-nav carousel-next" type="button" data-carousel-dir="1" aria-label="Next image">›</button>
        <div class="carousel-counter">1 / ${urls.length}</div>
        <div class="carousel-dots">${dots}</div>
        <span>${location}</span>
      </div>
    `;
  }

  if (urls.length === 1) {
    return `
      <div class="image photo has-img">
        <img src="${escapeAttr(urls[0])}" alt="${escapeAttr(location)}" loading="lazy" referrerpolicy="no-referrer">
        <span>${location}</span>
      </div>
    `;
  }

  return `<div class="image">${location}</div>`;
}

function mediaLinks(item) {
  const links = [];
  if (item.brochure_url) links.push(`<a href="${escapeAttr(item.brochure_url)}" target="_blank" rel="noopener">Brochure</a>`);
  if (item.video_url) links.push(`<a href="${escapeAttr(item.video_url)}" target="_blank" rel="noopener">Video</a>`);
  return links.length ? `<div class="card-links">${links.join("")}</div>` : "";
}

function cleanDisplayText(value) {
  return String(value || "")
    .replace(/BeachFrontApt/gi, "Beachfront Apartment")
    .replace(/I-Villa/gi, "iVilla")
    .replace(/IVilla/gi, "iVilla")
    .replace(/\s+/g, " ")
    .trim();
}

function areaText(value) {
  const num = Number(value || 0);
  if (!num) return "";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(num) + " sqm";
}

function shortText(value, fallback = "") {
  const text = cleanDisplayText(value);
  return text || fallback;
}

function cardMetric(label, value) {
  const clean = shortText(value, "");
  if (!clean) return "";
  return `<div class="metric"><span>${label}</span><strong>${clean}</strong></div>`;
}

function dedupeUnitsForDisplay(list) {
  const map = new Map();
  (list || []).forEach((item) => {
    const key = [item.project_name || "", item.unit_type || "", item.bedrooms_text || "", item.area_sqm || ""].join("||").toLowerCase();
    const current = map.get(key);
    if (!current || Number(item.starting_price || Infinity) < Number(current.starting_price || Infinity)) {
      map.set(key, item);
    }
  });
  return Array.from(map.values());
}

function enrichProjectsWithUnitMedia(projectList) {
  return (projectList || []).map((project) => {
    if (project.image_url && project.brochure_url && project.video_url) return project;
    const matchedUnit = (units || []).find((unit) => {
      return normalize(unit.project_name) === normalize(project.name) && (unit.image_url || unit.brochure_url || unit.video_url);
    });
    if (!matchedUnit) return project;
    return {
      ...project,
      image_url: project.image_url || matchedUnit.image_url || null,
      brochure_url: project.brochure_url || matchedUnit.brochure_url || null,
      video_url: project.video_url || matchedUnit.video_url || null
    };
  });
}

function price(value) {
  const num = Number(value || 0);
  if (!num) return "Price on request";
  return "From " + new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(num)) + " EGP";
}

function card(item, type = "unit") {
  if (type === "project") {
    const tags = [shortText(item.developer, ""), shortText(item.location, ""), shortText(item.status, "")]
      .filter(Boolean).map(value => `<span class="tag">${value}</span>`).join("");

    const projectUrl = projectPageUrl(item.name, item.location);

    return `
      <article class="card project-card">
        ${mediaImage(item)}
        <div class="content">
          <div class="card-kicker">Project</div>
          <a class="card-title-link" href="${escapeAttr(projectUrl)}">
            <h3>${safe(item.name)}</h3>
          </a>
          <div class="tags">${tags}</div>
          <div class="price-row"><span>Starting price</span><strong>${price(item.min_price)}</strong></div>
          <div class="card-links">
            <a href="${escapeAttr(projectUrl)}">View Project Page</a>
          </div>
          ${mediaLinks(item)}
          ${whatsappButton("Ask on WhatsApp", projectWhatsappMessage(item), "project_card", {
            project_name: safe(item.name, ""),
            starting_price: item.min_price || "",
            url: itemDisplayUrl(item)
          })}
        </div>
      </article>
    `;
  }

  const tags = [shortText(item.unit_type, ""), shortText(item.bedrooms_text, "")]
    .filter(Boolean).map(value => `<span class="tag">${value}</span>`).join("");

  const metrics = [
    cardMetric("Area", areaText(item.area_sqm)),
    cardMetric("Delivery", item.delivery_text),
    cardMetric("Finishing", item.finishing)
  ].filter(Boolean).join("");

  const unitProjectUrl = projectPageUrl(item.project_name, item.location);

  return `
    <article class="card unit-card">
      ${mediaImage(item)}
      <div class="content">
        <div class="card-kicker">Available unit</div>
        <a class="card-title-link" href="${escapeAttr(unitProjectUrl)}">
          <h3>${safe(item.project_name)}</h3>
        </a>
        <div class="tags">${tags}</div>
        <div class="price-row"><span>Starting price</span><strong>${price(item.starting_price)}</strong></div>
        <div class="card-metrics">${metrics}</div>
        <div class="card-links">
          <a href="${escapeAttr(unitProjectUrl)}">View Project Page</a>
        </div>
        ${mediaLinks(item)}
        ${whatsappButton("Send WhatsApp Request", unitWhatsappMessage(item), "unit_card", {
          project_name: safe(item.project_name, ""),
          unit_type: safe(item.unit_type, ""),
          bedrooms_text: safe(item.bedrooms_text, ""),
          starting_price: item.starting_price || "",
          url: itemDisplayUrl(item)
        })}
      </div>
    </article>
  `;
}

function render(list, target, type = "unit") {
  const displayList = type === "unit" ? dedupeUnitsForDisplay(list) : list;
  target.innerHTML = displayList.length ? displayList.map(item => card(item, type)).join("") : '<div class="status">No matching items found.</div>';
}

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/القاهرة الجديدة/g, "new cairo")
    .replace(/التجمع/g, "new cairo")
    .replace(/تجمع/g, "new cairo")
    .replace(/سخنة/g, "ain sokhna")
    .replace(/السخنة/g, "ain sokhna")
    .replace(/جلالة/g, "galala")
    .replace(/شقة/g, "apartment")
    .replace(/شقق/g, "apartment")
    .replace(/فيلا/g, "villa")
    .replace(/اى فيلا/g, "ivilla")
    .replace(/اي فيلا/g, "ivilla")
    .replace(/مقدم/g, "down payment")
    .replace(/تقسيط/g, "installments")
    .replace(/سنين/g, "years")
    .replace(/,/g, "");
}

function localSearch(query) {
  const q = normalize(query);
  const terms = q.split(/\s+/).filter(Boolean);

  const scored = units.map(unit => {
    const haystack = normalize([
      unit.project_name, unit.developer, unit.location, unit.unit_type,
      unit.bedrooms_text, unit.down_payment_text, unit.installments_text,
      unit.delivery_text, unit.description, unit.search_text
    ].filter(Boolean).join(" "));

    let score = 0;
    terms.forEach(term => { if (term.length > 2 && haystack.includes(term)) score += 1; });
    if (q.includes("new cairo") && haystack.includes("new cairo")) score += 5;
    if (q.includes("ain sokhna") && haystack.includes("ain sokhna")) score += 5;
    if (q.includes("apartment") && haystack.includes("apartment")) score += 4;
    if (q.includes("villa") && haystack.includes("villa")) score += 4;
    if (q.includes("ivilla") && haystack.includes("ivilla")) score += 4;
    if (q.includes("garden") && haystack.includes("garden")) score += 3;
    return { ...unit, _score: score };
  }).filter(unit => unit._score > 0);

  scored.sort((a, b) => b._score - a._score || Number(a.starting_price || 0) - Number(b.starting_price || 0));
  return scored.length ? scored.slice(0, 6) : units.slice(0, 6);
}

function isArabicText(text) {
  return /[\u0600-\u06FF]/.test(String(text || ""));
}

let preferredVoiceAr = null;
let preferredVoiceEn = null;

function pickVoices() {
  if (!("speechSynthesis" in window)) return;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || !voices.length) return;
  preferredVoiceAr = voices.find(v => v.lang && v.lang.toLowerCase().startsWith("ar")) || null;
  preferredVoiceEn = voices.find(v => v.lang && v.lang.toLowerCase().startsWith("en")) || null;
}

if ("speechSynthesis" in window) {
  pickVoices();
  window.speechSynthesis.addEventListener("voiceschanged", pickVoices);
}

function trimSpokenAnswer(text) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (clean.length <= 220) return clean;
  return clean.slice(0, 220).replace(/\s+\S*$/, "") + ".";
}

function speak(text, sourceTextForLanguage) {
  if (!("speechSynthesis" in window) || !text) return;

  try { window.speechSynthesis.cancel(); } catch (_) {}

  const arabic = isArabicText(sourceTextForLanguage || text);
  const utterance = new SpeechSynthesisUtterance(trimSpokenAnswer(text));
  utterance.lang = arabic ? "ar-EG" : "en-US";
  utterance.rate = 1;

  const chosenVoice = arabic ? preferredVoiceAr : preferredVoiceEn;
  if (chosenVoice) utterance.voice = chosenVoice;

  window.speechSynthesis.speak(utterance);
}

function setSearchLoading(isLoading) {
  isSearching = isLoading;
  searchBtn.disabled = isLoading;
  searchBtn.textContent = isLoading ? "Searching..." : "AI Search";
}

async function runAISearch(queryOverride = null) {
  const query = (queryOverride || searchInput.value).trim();

  if (!query) {
    statusBox.className = "status";
    statusBox.textContent = "Please type what you are looking for, or use Start Voice Agent for real voice.";
    return null;
  }

  if (isSearching) return null;

  setSearchLoading(true);
  statusBox.className = "status";
  statusBox.textContent = "AI is searching your live inventory...";

  try {
    const res = await fetch("/api/ai-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query })
    });

    if (!res.ok) throw new Error(await res.text());

    const data = await res.json();
    render(data.results || [], results);

    statusBox.className = "status success";
    statusBox.textContent = data.answer || "AI search completed.";
    return data;
  } catch (err) {
    console.warn("AI search failed, using local fallback:", err);
    const matches = localSearch(query);
    render(matches, results);
    const best = matches[0];
    const answer = best
      ? "AI function is not ready yet, so I used basic search. Closest match: " + best.project_name + ", " + price(best.starting_price) + "."
      : "AI function is not ready yet, and I could not find a matching unit.";

    statusBox.className = "status error";
    statusBox.textContent = answer;
    return { answer, results: matches, mode: "local-fallback" };
  } finally {
    setSearchLoading(false);
  }
}

searchBtn.addEventListener("click", async () => {
  await runAISearch();
});

if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.lang = "ar-EG";
  recognition.interimResults = false;
  recognition.continuous = false;

  voiceBtn.textContent = "Dictate Search";

  voiceBtn.addEventListener("click", () => {
    if (isSearching) return;
    window.speechSynthesis?.cancel?.();
    voiceBtn.disabled = true;
    voiceBtn.textContent = "Listening...";
    statusBox.className = "status";
    statusBox.textContent = "Listening — free voice search. Speak now.";

    try {
      recognition.start();
    } catch (err) {
      voiceBtn.disabled = false;
      voiceBtn.textContent = "Dictate Search";
      statusBox.className = "status error";
      statusBox.textContent = "Microphone could not start. Try again or allow microphone permission.";
    }
  });

  recognition.addEventListener("result", async (event) => {
    const transcript = event.results[0][0].transcript;
    searchInput.value = transcript;
    statusBox.className = "status";
    statusBox.textContent = "Heard: " + transcript + " — searching now...";

    const data = await runAISearch(transcript);

    if (data && data.answer) {
      speak(data.answer, transcript);
    }
  });

  recognition.addEventListener("end", () => {
    voiceBtn.disabled = false;
    voiceBtn.textContent = "Dictate Search";
  });

  recognition.addEventListener("error", (event) => {
    voiceBtn.disabled = false;
    voiceBtn.textContent = "Dictate Search";
    statusBox.className = "status error";
    statusBox.textContent = "Voice input error: " + event.error + ". You can type your search instead.";
  });
} else {
  voiceBtn.addEventListener("click", () => {
    statusBox.className = "status error";
    statusBox.textContent = "Voice input is not supported in this browser. Try Chrome on desktop.";
  });
}

leadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  leadStatus.className = "status";
  leadStatus.classList.remove("hidden");

  const data = Object.fromEntries(new FormData(leadForm).entries());
  const row = {
    name: data.name || null,
    phone: data.phone,
    message: data.interest || null,
    project_interest: data.interest || null,
    budget: data.budget ? Number(String(data.budget).replace(/,/g, "")) : null,
    source: "website"
  };

  try {
    await insertRow("leads", row);
    leadStatus.className = "status success";
    leadStatus.textContent = "Lead saved successfully in Supabase.";
    leadForm.reset();
  } catch (err) {
    console.error(err);
    leadStatus.className = "status error";
    leadStatus.textContent = "Lead was not saved. Check the leads insert policy.";
  }
});

function setVoiceStatus(text, className = "status") {
  voiceStatus.className = className;
  voiceStatus.textContent = text;
}

function setMicEnabled(enabled) {
  if (!micTrack) return;

  micTrack.enabled = enabled;

  if (enabled) {
    holdToTalkBtn.classList.add("talking");
    holdToTalkBtn.textContent = "Listening...";
    setVoiceStatus("Listening. Release Push to Talk when you finish speaking.", "status success");
  } else {
    holdToTalkBtn.classList.remove("talking");
    holdToTalkBtn.textContent = "Hold to Talk";
    if (realtimeDc && realtimeDc.readyState === "open") {
      setVoiceStatus("Mic muted. Waiting for AI response or hold to talk again.");
    }
  }
}

function stopRealtimeAgent(message = "Voice agent is off.") {
  handledFunctionCalls.clear();

  if (micTrack) {
    micTrack.enabled = false;
    micTrack = null;
  }

  if (realtimeDc) {
    try { realtimeDc.close(); } catch (_) {}
    realtimeDc = null;
  }

  if (realtimePc) {
    try { realtimePc.close(); } catch (_) {}
    realtimePc = null;
  }

  if (realtimeStream) {
    realtimeStream.getTracks().forEach(track => track.stop());
    realtimeStream = null;
  }

  if (remoteAudio) {
    remoteAudio.pause();
    remoteAudio.srcObject = null;
    remoteAudio = null;
  }

  startVoiceAgentBtn.disabled = false;
  holdToTalkBtn.disabled = true;
  holdToTalkBtn.classList.remove("talking");
  holdToTalkBtn.textContent = "Hold to Talk";
  stopVoiceAgentBtn.disabled = true;
  setVoiceStatus(message);
}

function parseBudgetNumber(value) {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number") return value;

  const text = String(value)
    .toLowerCase()
    .replace(/,/g, "")
    .replace(/egp/g, "")
    .replace(/جنيه/g, "")
    .replace(/جم/g, "")
    .trim();

  const firstNumber = text.match(/[\d.]+/);
  if (!firstNumber) return null;

  let num = Number(firstNumber[0]);
  if (!Number.isFinite(num)) return null;

  if (text.includes("million") || text.includes("m") || text.includes("مليون")) {
    num = num * 1000000;
  }

  return Math.round(num);
}

function normalizePhoneDisplay(value) {
  return String(value || "")
    .replace(/[^\d+]/g, "")
    .replace(/^0020/, "0")
    .replace(/^\+20/, "0");
}

function formatShortPrice(value, arabic = false) {
  const num = Number(value || 0);
  if (!num) return arabic ? "السعر غير محدد" : "price on request";

  const million = num / 1000000;
  const clean = Number.isInteger(million) ? String(million) : String(Math.round(million * 10) / 10);

  return arabic ? clean + " مليون جنيه" : clean + " million EGP";
}

function optionLine(unit, index, arabic = false) {
  const unitType = unit.unit_type || "unit";
  const project = unit.project_name || "project";
  const location = unit.location || "";
  const priceText = formatShortPrice(unit.starting_price, arabic);
  const installments = unit.installments_text || "";
  const bedrooms = unit.bedrooms_text || "";

  if (arabic) {
    const label = index === 0 ? "الأول" : "التاني";
    return `${label}: ${unitType} في ${project}${location ? " - " + location : ""}، ${priceText}${bedrooms ? "، " + bedrooms : ""}${installments ? "، تقسيط " + installments : ""}`;
  }

  const label = index === 0 ? "first" : "second";
  return `${label}: ${unitType} in ${project}${location ? " - " + location : ""}, ${priceText}${bedrooms ? ", " + bedrooms : ""}${installments ? ", installments " + installments : ""}`;
}

function buildSpokenSearchSummary(query, searchData) {
  const arabic = isArabicText(query);
  const found = searchData?.results || [];
  const totalMatches = Number(searchData?.total_matches || found.length || 0);
  const developers = Array.isArray(searchData?.developers) ? searchData.developers.filter(Boolean) : [];
  const projects = Array.isArray(searchData?.projects) ? searchData.projects.filter(Boolean) : [];
  const priceRange = searchData?.price_range || {};
  const minPrice = Number(priceRange.min || 0);
  const maxPrice = Number(priceRange.max || 0);

  if (!found.length) {
    return arabic
      ? "مش لاقي نتيجة مطابقة دلوقتي. قولي المنطقة أو نوع الوحدة اللي بتدور عليها وأنا أرشحلك الأفضل."
      : "I couldn't find an exact match yet. Tell me the location or unit type and I'll recommend the best options.";
  }

  if (arabic) {
    let message = totalMatches > 6
      ? `عندي حالياً ${totalMatches} وحدة مناسبة لبحثك`
      : "عندي اختيارات مناسبة لبحثك";

    if (developers.length) {
      message += ` من ${developers.slice(0, 3).join(" و ")}`;
    } else if (projects.length) {
      message += ` في ${projects.slice(0, 3).join(" و ")}`;
    }

    if (minPrice && maxPrice && minPrice !== maxPrice) {
      message += `. الأسعار بتبدأ من ${formatShortPrice(minPrice, true)} وتوصل لحوالي ${formatShortPrice(maxPrice, true)}`;
    }

    message += ". في مشروع معين في بالك ولا تحب أرشحلك الأنسب؟";
    return message;
  }

  let message = totalMatches > 6
    ? `I currently have ${totalMatches} matching options`
    : "I found suitable options";

  if (developers.length) {
    message += ` from ${developers.slice(0, 3).join(", ")}`;
  } else if (projects.length) {
    message += ` in ${projects.slice(0, 3).join(", ")}`;
  }

  if (minPrice && maxPrice && minPrice !== maxPrice) {
    message += `. Prices start from ${formatShortPrice(minPrice, false)} and go up to around ${formatShortPrice(maxPrice, false)}`;
  }

  message += ". Do you already have a project in mind, or would you like me to recommend the best fit?";
  return message;
}

function showPhoneConfirmation(leadRow) {
  pendingVoiceLead = { ...leadRow };
  const detected = normalizePhoneDisplay(leadRow.phone);

  if (phoneConfirmBox) phoneConfirmBox.classList.remove("hidden");
  if (detectedPhoneInput) detectedPhoneInput.value = detected;
  if (leadStatus) {
    leadStatus.classList.remove("hidden");
    leadStatus.className = "status";
    leadStatus.textContent = "الرقم ظاهر قدامك. راجعه واضغط حفظ لو صحيح.";
  }

  setVoiceStatus("الرقم ظاهر قدامك على الشاشة. راجعه واضغط حفظ لو صحيح.", "status");
}

async function confirmPendingVoiceLead() {
  if (!pendingVoiceLead) {
    setVoiceStatus("No pending voice lead to confirm.", "status error");
    return;
  }

  const confirmedPhone = normalizePhoneDisplay(detectedPhoneInput?.value || pendingVoiceLead.phone);

  if (!confirmedPhone || confirmedPhone.length < 8) {
    setVoiceStatus("Please enter a valid phone number before saving.", "status error");
    return;
  }

  const row = {
    ...pendingVoiceLead,
    phone: confirmedPhone,
    source: "website_voice_confirmed_phone"
  };

  await insertRow("leads", row);

  pendingVoiceLead = null;
  if (phoneConfirmBox) phoneConfirmBox.classList.add("hidden");

  if (leadStatus) {
    leadStatus.classList.remove("hidden");
    leadStatus.className = "status success";
    leadStatus.textContent = "تم حفظ بيانات العميل بعد تأكيد الرقم.";
  }

  setVoiceStatus("تم حفظ بيانات العميل برقم واتساب مؤكد.", "status success");
}

function cancelPendingVoiceLead() {
  pendingVoiceLead = null;
  if (phoneConfirmBox) phoneConfirmBox.classList.add("hidden");
  setVoiceStatus("Phone confirmation cancelled. Hold to Talk again to continue.");
}

async function saveVoiceLeadFromArgs(args) {
  const phoneRaw = normalizePhoneDisplay(args.phone || args.whatsapp || "");

  const row = {
    name: args.name || null,
    phone: phoneRaw || "voice-not-provided",
    message: args.message || args.notes || "Voice lead captured from website voice agent",
    preferred_location: args.preferred_location || args.location || null,
    budget: parseBudgetNumber(args.budget),
    unit_type: args.unit_type || null,
    project_interest: args.project_interest || args.project || null,
    source: phoneRaw ? "website_voice_pending_confirmation" : "website_voice_pending_phone"
  };

  if (phoneRaw) {
    showPhoneConfirmation(row);
    return {
      ...row,
      pending_confirmation: true,
      saved: false
    };
  }

  await insertRow("leads", row);
  return {
    ...row,
    pending_confirmation: false,
    saved: true
  };
}

function sendToolOutput(callId, output) {
  realtimeDc.send(JSON.stringify({
    type: "conversation.item.create",
    item: {
      type: "function_call_output",
      call_id: callId,
      output: JSON.stringify(output)
    }
  }));
}

async function handleRealtimeEvent(event) {
  let payload;
  try {
    payload = JSON.parse(event.data);
  } catch {
    return;
  }

  console.log("Realtime event:", payload);

  if (payload.type === "error") {
    setVoiceStatus("Realtime error: " + (payload.error?.message || "Unknown error"), "status error");
    return;
  }

  if (payload.type === "session.created") {
    setVoiceStatus("Voice agent connected. Hold Push to Talk and ask for a property.", "status success");
  }

  if (payload.type === "input_audio_buffer.speech_started") {
    setVoiceStatus("Listening...");
  }

  if (payload.type === "input_audio_buffer.speech_stopped") {
    setVoiceStatus("Processing your request...");
  }

  if (payload.type === "response.created") {
    setMicEnabled(false);
    setVoiceStatus("AI is answering. Keep mic released.");
  }

  if (payload.type === "response.audio.done" || payload.type === "response.done") {
    setMicEnabled(false);
    setVoiceStatus("AI finished. Hold Push to Talk again to continue.", "status success");
  }

  if (payload.type === "conversation.item.input_audio_transcription.completed" && payload.transcript) {
    searchInput.value = payload.transcript;
  }

  if (payload.type !== "response.function_call_arguments.done") {
    return;
  }

  const callId = payload.call_id;

  if (!callId || handledFunctionCalls.has(callId)) {
    return;
  }

  handledFunctionCalls.add(callId);

  let args = {};
  try { args = JSON.parse(payload.arguments || "{}"); } catch (_) {}

  if (payload.name === "search_properties") {
    const query = args.query || args.search_query || searchInput.value || "property search";

    searchInput.value = query;
    setVoiceStatus("Searching live inventory for: " + query);

    const searchData = await runAISearch(query);
    const spokenSummary = buildSpokenSearchSummary(query, searchData);

    const toolOutput = {
      must_read_first: spokenSummary,
      answer_language_hint: isArabicText(query) ? "egyptian_arabic" : "english",
      answer: searchData?.answer || "Search completed.",
      inventory_count: searchData?.total_matches || (searchData?.results || []).length,
      developers: searchData?.developers || [],
      projects: searchData?.projects || [],
      price_range: searchData?.price_range || null,
      results_count: (searchData?.results || []).length,
      results: (searchData?.results || []).slice(0, 6).map(unit => ({
        project_name: unit.project_name,
        developer: unit.developer,
        location: unit.location,
        unit_type: unit.unit_type,
        bedrooms_text: unit.bedrooms_text,
        starting_price: unit.starting_price,
        down_payment_text: unit.down_payment_text,
        installments_text: unit.installments_text,
        delivery_text: unit.delivery_text,
        image_url: unit.image_url,
        brochure_url: unit.brochure_url,
        video_url: unit.video_url
      }))
    };

    sendToolOutput(callId, toolOutput);

    realtimeDc.send(JSON.stringify({
      type: "response.create",
      response: {
        output_modalities: ["audio"],
        instructions: `
You just received search_properties tool output.

You are Tycoons Investments Senior Property Consultant.

Critical:
- First, read the field must_read_first to the user.
- Do not call save_voice_lead in this response.
- Do not ask for phone in this response.
- Do not ask for budget in this response unless the user already asked for prices.
- Do not say the search is still continuing.
- Do not say you will check or search.
- Do not mention AI, database, Supabase, tools, functions, or search engine.
- Speak like a real estate consultant, not a support bot.
- Keep the response under 3 short sentences.
- Ask only ONE question.

Consultant behavior:
- Mention inventory size when must_read_first includes it.
- Mention developers when must_read_first includes them.
- Mention price range only if must_read_first includes it or the user asked for prices.
- If the user gave a broad request, ask whether they have a specific project in mind or want a recommendation.
- If the user asked for a specific unit type, ask purpose: personal use or investment.
- Ask for WhatsApp only in a later turn after the customer asks for offer, brochure, availability details, or says send details.

If Arabic:
- Reply in natural Egyptian Arabic only.
- Do not use formal Arabic.
- Keep project and developer names in English.

If English:
- Reply in simple warm English.

After this response, wait for the user's next push-to-talk message.
`
      }
    }));

    return;
  }

  if (payload.name === "save_voice_lead") {
    setVoiceStatus("Preparing voice lead...");

    try {
      const savedLead = await saveVoiceLeadFromArgs(args);

      if (leadStatus) {
        leadStatus.classList.remove("hidden");
        leadStatus.className = "status success";
        leadStatus.textContent = savedLead.pending_confirmation ? "الرقم ظاهر قدامك. راجعه واضغط حفظ لو صحيح." : "تم حفظ بيانات العميل.";
      }

      sendToolOutput(callId, {
        saved: savedLead.saved === true,
        pending_confirmation: savedLead.pending_confirmation === true,
        saved_to: savedLead.saved === true ? "Supabase leads table" : "waiting_for_user_phone_confirmation",
        phone_status: savedLead.phone === "voice-not-provided" ? "phone_not_provided" : "phone_pending_confirmation",
        lead: savedLead
      });

      realtimeDc.send(JSON.stringify({
        type: "response.create",
        response: {
          output_modalities: ["audio"],
          instructions: `
The save_voice_lead tool returned status.

If pending_confirmation is true:
- Say exactly in Egyptian Arabic: الرقم ظاهر قدامك على الشاشة، راجعه واضغط حفظ لو صحيح.
- Do not say the lead is saved yet.
- Do not say: مش هسجل الليد، مش هحفظ الليد، لن يتم الحفظ, waiting for database, or any negative warning.
- Do not mention database, Supabase, tools, or confirmation logic.

If saved is true:
- Say exactly in Egyptian Arabic: تم حفظ بياناتك، وفريق المبيعات هيراجع الاختيارات المناسبة.

If phone_status is phone_not_provided:
- Ask one short question in Egyptian Arabic: رقم واتساب للتواصل؟

Use the user's language, but if Arabic use Egyptian Arabic only.
`
        }
      }));
    } catch (error) {
      console.error("Voice lead save error:", error);

      sendToolOutput(callId, {
        saved: false,
        error: error.message || "Could not save voice lead"
      });

      realtimeDc.send(JSON.stringify({
        type: "response.create",
        response: {
          output_modalities: ["audio"],
          instructions: "The lead was not saved. Apologize briefly and ask the user to use the contact form."
        }
      }));
    }

    return;
  }
}

async function startRealtimeAgent() {
  try {
    startVoiceAgentBtn.disabled = true;
    stopVoiceAgentBtn.disabled = false;
    holdToTalkBtn.disabled = true;
    handledFunctionCalls.clear();
    setVoiceStatus("Starting Realtime voice connection...");

    window.speechSynthesis?.cancel?.();

    realtimePc = new RTCPeerConnection();

    remoteAudio = document.createElement("audio");
    remoteAudio.autoplay = true;
    remoteAudio.playsInline = true;

    realtimePc.ontrack = (event) => {
      remoteAudio.srcObject = event.streams[0];
    };

    realtimePc.onconnectionstatechange = () => {
      console.log("WebRTC connection state:", realtimePc.connectionState);
      if (["failed", "disconnected", "closed"].includes(realtimePc.connectionState)) {
        setVoiceStatus("Voice connection state: " + realtimePc.connectionState);
      }
    };

    realtimeStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1
      }
    });

    micTrack = realtimeStream.getAudioTracks()[0];
    if (micTrack) micTrack.enabled = false;

    realtimeStream.getTracks().forEach(track => realtimePc.addTrack(track, realtimeStream));

    realtimeDc = realtimePc.createDataChannel("oai-events");
    realtimeDc.addEventListener("message", handleRealtimeEvent);

    realtimeDc.addEventListener("open", () => {
      holdToTalkBtn.disabled = false;
      setVoiceStatus("Realtime voice agent is live. Hold Push to Talk while speaking.", "status success");
    });

    realtimeDc.addEventListener("close", () => {
      setVoiceStatus("Realtime voice data channel closed.", "status error");
      holdToTalkBtn.disabled = true;
    });

    const offer = await realtimePc.createOffer();
    await realtimePc.setLocalDescription(offer);

    const sdpRes = await fetch("/api/realtime-connect", {
      method: "POST",
      body: offer.sdp,
      headers: {
        "Content-Type": "application/sdp"
      }
    });

    if (!sdpRes.ok) {
      const errorText = await sdpRes.text();
      throw new Error(errorText);
    }

    const answerSdp = await sdpRes.text();

    if (!answerSdp.includes("v=0")) {
      throw new Error("Invalid SDP answer returned: " + answerSdp.slice(0, 300));
    }

    await realtimePc.setRemoteDescription({
      type: "answer",
      sdp: answerSdp
    });
  } catch (err) {
    console.error(err);
    stopRealtimeAgent("Could not start voice agent: " + err.message);
    voiceStatus.className = "status error";
  }
}

function beginPushToTalk(event) {
  event.preventDefault();
  if (!realtimeDc || realtimeDc.readyState !== "open" || !micTrack) return;
  window.speechSynthesis?.cancel?.();
  setMicEnabled(true);
}

function endPushToTalk(event) {
  event.preventDefault();
  setMicEnabled(false);
}

holdToTalkBtn.addEventListener("mousedown", beginPushToTalk);
holdToTalkBtn.addEventListener("mouseup", endPushToTalk);
holdToTalkBtn.addEventListener("mouseleave", endPushToTalk);
holdToTalkBtn.addEventListener("touchstart", beginPushToTalk, { passive: false });
holdToTalkBtn.addEventListener("touchend", endPushToTalk, { passive: false });
holdToTalkBtn.addEventListener("touchcancel", endPushToTalk, { passive: false });

window.addEventListener("keydown", (event) => {
  if (event.code === "Space" && !event.repeat && document.activeElement.tagName !== "TEXTAREA" && document.activeElement.tagName !== "INPUT") {
    beginPushToTalk(event);
  }
});

window.addEventListener("keyup", (event) => {
  if (event.code === "Space" && document.activeElement.tagName !== "TEXTAREA" && document.activeElement.tagName !== "INPUT") {
    endPushToTalk(event);
  }
});

if (confirmPhoneBtn) {
  confirmPhoneBtn.addEventListener("click", async () => {
    try {
      confirmPhoneBtn.disabled = true;
      await confirmPendingVoiceLead();
    } catch (error) {
      console.error("Confirm phone save error:", error);
      setVoiceStatus("Could not save confirmed lead: " + (error.message || "Unknown error"), "status error");
    } finally {
      confirmPhoneBtn.disabled = false;
    }
  });
}

if (cancelPhoneBtn) {
  cancelPhoneBtn.addEventListener("click", cancelPendingVoiceLead);
}

startVoiceAgentBtn.addEventListener("click", startRealtimeAgent);
stopVoiceAgentBtn.addEventListener("click", () => stopRealtimeAgent("Voice session stopped."));
window.addEventListener("beforeunload", () => stopRealtimeAgent("Voice agent is off."));


/* ============================================================
   SAFE PROPERTY CARD IMAGE CAROUSEL
   ------------------------------------------------------------
   image_url = first/main image
   gallery_urls = extra images separated by commas or line breaks
   If gallery_urls is empty, old single-image cards stay unchanged.
   ============================================================ */

function updatePropertyCarousel(carousel, nextIndex) {
  if (!carousel) return;

  const slides = Array.from(carousel.querySelectorAll(".carousel-img"));
  if (!slides.length) return;

  const total = slides.length;
  const safeIndex = ((Number(nextIndex || 0) % total) + total) % total;

  carousel.dataset.carouselIndex = String(safeIndex);

  slides.forEach((slide, index) => {
    slide.classList.toggle("active", index === safeIndex);
  });

  carousel.querySelectorAll(".carousel-dot").forEach((dot, index) => {
    dot.classList.toggle("active", index === safeIndex);
  });

  const counter = carousel.querySelector(".carousel-counter");
  if (counter) counter.textContent = `${safeIndex + 1} / ${total}`;
}

document.addEventListener("click", function handlePropertyCarouselClick(event) {
  const clicked = event.target;
  if (!clicked || !clicked.closest) return;

  const navButton = clicked.closest("[data-carousel-dir]");
  const dotButton = clicked.closest("[data-carousel-dot]");

  if (!navButton && !dotButton) return;

  const carousel = clicked.closest(".image-carousel");
  if (!carousel) return;

  event.preventDefault();
  event.stopPropagation();

  const currentIndex = Number(carousel.dataset.carouselIndex || 0);

  if (navButton) {
    const direction = Number(navButton.dataset.carouselDir || 1);
    updatePropertyCarousel(carousel, currentIndex + direction);
    return;
  }

  updatePropertyCarousel(carousel, Number(dotButton.dataset.carouselDot || 0));
});


loadData();

async function loadData() {
  try {
    statusBox.className = "status";
    statusBox.textContent = "Loading live data from Supabase...";

    units = await getRows("units", "?select=*&availability_status=eq.available&order=starting_price.asc");
    projects = await getRows("projects", "?select=*&order=min_price.asc");
    projects = enrichProjectsWithUnitMedia(projects);

    render(units.slice(0, 6), results);
    render(projects, projectGrid, "project");

    statusBox.className = "status success";
    statusBox.textContent = "Connected to Supabase. Loaded " + units.length + " units and " + projects.length + " projects.";

    // If the visitor arrived from a project page with a search query
    // in the URL (e.g. /?q=villa#search), run that search automatically.
    try {
      const params = new URLSearchParams(window.location.search);
      const incomingQuery = (params.get("q") || "").trim();
      if (incomingQuery && searchInput) {
        searchInput.value = incomingQuery;
        const searchSection = document.getElementById("search");
        if (searchSection) searchSection.scrollIntoView({ behavior: "smooth" });
        runAISearch(incomingQuery);
      }
    } catch (_) {}
  } catch (err) {
    console.error(err);
    statusBox.className = "status error";
    statusBox.textContent = "Could not load Supabase data. Check the API key, URL, and RLS policies.";
  }
}
/* ============================================================
   FREE VOICE SEARCH ADD-ON
   --------------------------------------------------------------
   Uses the browser's built-in SpeechRecognition (speech-to-text)
   and SpeechSynthesis (text-to-speech) — both are free, built
   into the browser, no OpenAI Realtime API cost at all.

   Flow:
   1. Tap "Voice Search"
   2. Browser listens, converts speech to text
   3. Text is sent to the EXISTING /api/ai-search endpoint
      (already cheap — gpt-5.4-mini with a free local fallback)
   4. The AI's text answer is read aloud using speechSynthesis

   This does not touch or replace the paid "Start Voice Agent"
   (OpenAI Realtime) feature — it is a separate, free alternative
   button placed next to it.
   ============================================================ */

(function () {
  const freeVoiceBtn = document.getElementById("freeVoiceBtn");
  if (!freeVoiceBtn) return;

  const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognitionImpl) {
    freeVoiceBtn.addEventListener("click", () => {
      voiceStatus.className = "status error";
      voiceStatus.textContent = "Free voice search needs a browser with speech recognition support, like Chrome on desktop or Android.";
    });
    return;
  }

  const freeRecognition = new SpeechRecognitionImpl();
  freeRecognition.lang = "ar-EG";
  freeRecognition.interimResults = false;
  freeRecognition.continuous = false;

  let freeVoiceActive = false;

  function speak(text, lang) {
    if (!window.speechSynthesis || !text) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 1;

    const voices = window.speechSynthesis.getVoices();
    const matchedVoice = voices.find((voice) => voice.lang && voice.lang.startsWith(lang.split("-")[0]));
    if (matchedVoice) utterance.voice = matchedVoice;

    window.speechSynthesis.speak(utterance);
  }

  freeVoiceBtn.addEventListener("click", () => {
    if (freeVoiceActive || isSearching) return;

    window.speechSynthesis?.cancel?.();
    freeVoiceActive = true;
    freeVoiceBtn.disabled = true;
    freeVoiceBtn.textContent = "Listening...";
    voiceStatus.className = "status";
    voiceStatus.textContent = "Listening for your free voice search...";

    try {
      freeRecognition.start();
    } catch (err) {
      freeVoiceActive = false;
      freeVoiceBtn.disabled = false;
      freeVoiceBtn.textContent = "Voice Search";
      voiceStatus.className = "status error";
      voiceStatus.textContent = "Microphone could not start. Check browser permissions and try again.";
    }
  });

  freeRecognition.addEventListener("result", async (event) => {
    const transcript = event.results[0][0].transcript;
    const arabic = /[\u0600-\u06FF]/.test(transcript);

    searchInput.value = transcript;
    voiceStatus.className = "status";
    voiceStatus.textContent = "Heard: " + transcript + " — searching now...";

    const data = await runAISearch(transcript);

    if (data && data.answer) {
      voiceStatus.className = "status success";
      voiceStatus.textContent = data.answer;
      speak(data.answer, arabic ? "ar-EG" : "en-US");
    } else {
      voiceStatus.className = "status error";
      voiceStatus.textContent = "No spoken answer was returned. Check the results below instead.";
    }
  });

  freeRecognition.addEventListener("end", () => {
    freeVoiceActive = false;
    freeVoiceBtn.disabled = false;
    freeVoiceBtn.textContent = "Voice Search";
  });

  freeRecognition.addEventListener("error", (event) => {
    freeVoiceActive = false;
    freeVoiceBtn.disabled = false;
    freeVoiceBtn.textContent = "Voice Search";
    voiceStatus.className = "status error";
    voiceStatus.textContent = "Voice input error: " + event.error + ". You can type your search instead.";
  });
})();


/* ============================================================
   WHATSAPP LEAD TRACKING V1
   ------------------------------------------------------------
   Tracks WhatsApp clicks by source before opening WhatsApp.
   It works for:
   - header WhatsApp button
   - floating WhatsApp button
   - lead section WhatsApp button
   - static page WhatsApp buttons
   - dynamic unit/project card WhatsApp buttons
   If Supabase table whatsapp_clicks does not exist yet, clicks still open WhatsApp normally.
   ============================================================ */

function getWhatsAppSource(link) {
  if (link.dataset.waSource) return link.dataset.waSource;
  if (link.classList.contains("floating-whatsapp")) return "floating_whatsapp";
  if (link.classList.contains("header-whatsapp")) return "header_whatsapp";
  if (link.classList.contains("card-whatsapp")) return "card_whatsapp";
  if (link.closest(".lead-section")) return "lead_section_whatsapp";
  if (link.closest(".aio-answer-card")) return "aio_answer_whatsapp";
  if (link.closest(".static-hero")) return "static_hero_whatsapp";
  if (link.closest(".static-card")) return "static_card_whatsapp";
  return "website_whatsapp";
}

function getWhatsAppBaseMessage(link, source) {
  if (link.dataset.waMessage) return link.dataset.waMessage;

  try {
    const url = new URL(link.href);
    const existing = url.searchParams.get("text");
    if (existing) return existing;
  } catch (_) {}

  return "Hello Tycoons Investments, I want help finding a suitable property.";
}

function buildWhatsAppTrackingContext(link) {
  const source = getWhatsAppSource(link);
  const trackingId = "wa_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);

  return {
    tracking_id: trackingId,
    source,
    page_url: window.location.href,
    page_path: window.location.pathname || "/",
    referrer: document.referrer || null,
    user_agent: navigator.userAgent || null,
    project_name: link.dataset.waProject_name || link.dataset.waProjectName || null,
    unit_type: link.dataset.waUnit_type || link.dataset.waUnitType || null,
    bedrooms_text: link.dataset.waBedrooms_text || link.dataset.waBedroomsText || null,
    starting_price: link.dataset.waStarting_price || link.dataset.waStartingPrice || null,
    utm_source: WHATSAPP_UTM_SOURCE,
    utm_medium: WHATSAPP_UTM_MEDIUM,
    utm_campaign: WHATSAPP_UTM_CAMPAIGN
  };
}

function buildTrackedWhatsAppUrl(link, context) {
  const baseMessage = getWhatsAppBaseMessage(link, context.source);
  const finalMessage = [
    baseMessage,
    "",
    "Source: " + context.source,
    "Page: " + context.page_path,
    context.project_name ? "Project: " + context.project_name : "",
    context.unit_type ? "Unit type: " + context.unit_type : "",
    context.bedrooms_text ? "Bedrooms: " + context.bedrooms_text : "",
    context.starting_price ? "Starting price: " + context.starting_price : "",
    "Tracking ID: " + context.tracking_id
  ].filter(Boolean).join("\n");

  return "https://wa.me/" + TYCOONS_WHATSAPP_NUMBER + "?text=" + encodeURIComponent(finalMessage);
}

function trackWhatsAppClick(context, whatsappUrl) {
  const row = {
    tracking_id: context.tracking_id,
    source: context.source,
    page_url: context.page_url,
    page_path: context.page_path,
    referrer: context.referrer,
    user_agent: context.user_agent,
    project_name: context.project_name,
    unit_type: context.unit_type,
    bedrooms_text: context.bedrooms_text,
    starting_price: context.starting_price ? Number(context.starting_price) : null,
    whatsapp_url: whatsappUrl,
    utm_source: context.utm_source,
    utm_medium: context.utm_medium,
    utm_campaign: context.utm_campaign
  };

  try {
    fetch(API_BASE + "/" + WHATSAPP_TRACKING_TABLE, {
      method: "POST",
      headers: headers({ Prefer: "return=minimal" }),
      body: JSON.stringify(row),
      keepalive: true
    }).catch((error) => {
      console.warn("WhatsApp click tracking was not saved:", error);
    });
  } catch (error) {
    console.warn("WhatsApp click tracking skipped:", error);
  }
}

document.addEventListener("click", (event) => {
  const link = event.target.closest('a[href*="wa.me/"], a[href*="api.whatsapp.com/send"]');
  if (!link) return;

  const context = buildWhatsAppTrackingContext(link);
  const trackedUrl = buildTrackedWhatsAppUrl(link, context);

  trackWhatsAppClick(context, trackedUrl);

  event.preventDefault();
  window.open(trackedUrl, "_blank", "noopener,noreferrer");
});
