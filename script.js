const SUPABASE_URL = window.TYCOONS_SUPABASE_URL;
const SUPABASE_KEY = window.TYCOONS_SUPABASE_KEY;
const API_BASE = SUPABASE_URL + "/rest/v1";

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

document.getElementById("year").textContent = new Date().getFullYear();

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

function mediaImage(item) {
  const location = safe(item.location);

  if (item.image_url) {
    return `
      <div class="image photo has-img">
        <img src="${escapeAttr(item.image_url)}" alt="${escapeAttr(location)}" loading="lazy" referrerpolicy="no-referrer">
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

    return `
      <article class="card project-card">
        ${mediaImage(item)}
        <div class="content">
          <div class="card-kicker">Project</div>
          <h3>${safe(item.name)}</h3>
          <div class="tags">${tags}</div>
          <div class="price-row"><span>Starting price</span><strong>${price(item.min_price)}</strong></div>
          ${mediaLinks(item)}
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

  return `
    <article class="card unit-card">
      ${mediaImage(item)}
      <div class="content">
        <div class="card-kicker">Available unit</div>
        <h3>${safe(item.project_name)}</h3>
        <div class="tags">${tags}</div>
        <div class="price-row"><span>Starting price</span><strong>${price(item.starting_price)}</strong></div>
        <div class="card-metrics">${metrics}</div>
        ${mediaLinks(item)}
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

function speak() {
  return;
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
  } catch (err) {
    console.error(err);
    statusBox.className = "status error";
    statusBox.textContent = "Could not load Supabase data. Check the API key, URL, and RLS policies.";
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
    statusBox.textContent = "Listening for dictation only. For real voice reply, use Start Voice Agent.";

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
    await runAISearch(transcript);
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

function isArabicText(text) {
  return /[\u0600-\u06FF]/.test(String(text || ""));
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
  const found = (searchData?.results || []).slice(0, 2);

  if (!found.length) {
    return arabic
      ? "مش لاقي نتيجة مطابقة بالظبط. تحب أدوّرلك حسب ميزانية معينة؟"
      : "I do not see an exact match yet. What budget range should I filter by?";
  }

  if (found.length === 1) {
    const unit = found[0];
    return arabic
      ? `المتاح قدامي: ${unit.unit_type || "وحدة"} في ${unit.project_name || "المشروع"}، ${formatShortPrice(unit.starting_price, true)}${unit.installments_text ? "، والتقسيط " + unit.installments_text : ""}. تحب أطلعلك طريقة الدفع؟`
      : `The best match is ${unit.unit_type || "a unit"} in ${unit.project_name || "the project"}, from ${formatShortPrice(unit.starting_price, false)}${unit.installments_text ? ", with installments " + unit.installments_text : ""}. Want the payment breakdown?`;
  }

  return arabic
    ? `في اختيارين مناسبين: ${optionLine(found[0], 0, true)}. و${optionLine(found[1], 1, true)}. أنهي واحد تحب تفاصيله؟`
    : `I found two good options: ${optionLine(found[0], 0, false)}. And ${optionLine(found[1], 1, false)}. Which one do you want details for?`;
}

function showPhoneConfirmation(leadRow) {
  pendingVoiceLead = { ...leadRow };
  const detected = normalizePhoneDisplay(leadRow.phone);

  if (phoneConfirmBox) phoneConfirmBox.classList.remove("hidden");
  if (detectedPhoneInput) detectedPhoneInput.value = detected;
  if (leadStatus) {
    leadStatus.classList.remove("hidden");
    leadStatus.className = "status";
    leadStatus.textContent = "Phone detected from voice. Please confirm before saving.";
  }

  setVoiceStatus("Phone detected. Please check the number on screen and press Confirm & Save Lead.", "status");
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
    leadStatus.textContent = "Confirmed voice lead saved in Supabase.";
  }

  setVoiceStatus("Lead saved with confirmed WhatsApp number.", "status success");
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
      results_count: (searchData?.results || []).length,
      results: (searchData?.results || []).slice(0, 6).map(unit => ({
        project_name: unit.project_name,
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

Critical:
- First, read the field must_read_first to the user.
- Do not call save_voice_lead in this response.
- Do not ask for phone in this response.
- Do not say the search is still continuing.
- Do not say you will check or search.
- The result cards are already on screen, but you still must read the best option or options aloud.

If Arabic:
- Reply in Egyptian Arabic as naturally as possible.
- Read must_read_first in Arabic if it is Arabic.

If English:
- Reply in warm simple English.
- Read must_read_first in English if it is English.

After this response, wait for the user's next push-to-talk message. Only in a later user turn may you collect budget or phone.
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
        leadStatus.textContent = savedLead.pending_confirmation ? "Phone detected. Waiting for confirmation before saving." : "Voice lead saved in Supabase.";
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
- Tell the user the number is shown on screen and ask them to press Confirm & Save Lead after checking it.
- Do not say it is saved yet.

If saved is true:
- Say the details are saved.

If phone_status is phone_not_provided:
- Ask for the WhatsApp number in one short question.

Use the user's language. Arabic should be Egyptian Arabic.
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

loadData();
