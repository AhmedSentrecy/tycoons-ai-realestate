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
let realtimeResponseInProgress = false;
let pendingRealtimeResponseInstructions = null;

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
    return `<div class="image photo" style="background-image:url('${escapeAttr(item.image_url)}')"><span>${location}</span></div>`;
  }
  return `<div class="image">${location}</div>`;
}

function mediaLinks(item) {
  const links = [];
  if (item.brochure_url) links.push(`<a href="${escapeAttr(item.brochure_url)}" target="_blank" rel="noopener">Brochure</a>`);
  if (item.video_url) links.push(`<a href="${escapeAttr(item.video_url)}" target="_blank" rel="noopener">Video</a>`);
  return links.length ? `<div class="card-links">${links.join("")}</div>` : "";
}

function enrichProjectsWithUnitMedia(projectList) {
  return (projectList || []).map((project) => {
    if (project.image_url && project.brochure_url && project.video_url) {
      return project;
    }

    const matchedUnit = (units || []).find((unit) => {
      return normalize(unit.project_name) === normalize(project.name)
        && (unit.image_url || unit.brochure_url || unit.video_url);
    });

    if (!matchedUnit) {
      return project;
    }

    return {
      ...project,
      image_url: project.image_url || matchedUnit.image_url || null,
      brochure_url: project.brochure_url || matchedUnit.brochure_url || null,
      video_url: project.video_url || matchedUnit.video_url || null
    };
  });
}

function price(value) {
  if (!value) return "Price on request";
  return "From " + new Intl.NumberFormat("en-US").format(Number(value)) + " EGP";
}

function card(item, type = "unit") {
  if (type === "project") {
    return `<article class="card">${mediaImage(item)}<div class="content"><h3>${safe(item.name)}</h3><div class="tags"><span class="tag">${safe(item.developer)}</span><span class="tag">${safe(item.status)}</span></div><div class="price">${price(item.min_price)}</div>${mediaLinks(item)}</div></article>`;
  }

  return `<article class="card">${mediaImage(item)}<div class="content"><h3>${safe(item.project_name)}</h3><div class="tags"><span class="tag">${safe(item.unit_type)}</span><span class="tag">${safe(item.bedrooms_text)}</span></div><div class="price">${price(item.starting_price)}</div>${mediaLinks(item)}</div></article>`;
}

function dedupeUnitsForDisplay(list) {
  const map = new Map();

  (list || []).forEach((item) => {
    const key = [
      item.project_name || "",
      item.unit_type || "",
      item.bedrooms_text || ""
    ].join("||").toLowerCase();

    const current = map.get(key);

    if (!current) {
      map.set(key, item);
      return;
    }

    const currentPrice = Number(current.starting_price || Infinity);
    const newPrice = Number(item.starting_price || Infinity);

    if (newPrice < currentPrice) {
      map.set(key, item);
    }
  });

  return Array.from(map.values());
}

function render(list, target, type = "unit") {
  const displayList = type === "unit" ? dedupeUnitsForDisplay(list) : list;
  target.innerHTML = displayList.length
    ? displayList.map(item => card(item, type)).join("")
    : '<div class="status">No matching items found.</div>';
}

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/القاهره الجديده/g, "new cairo")
    .replace(/القاهرة الجديدة/g, "new cairo")
    .replace(/التجمع الخامس/g, "new cairo")
    .replace(/التجمع/g, "new cairo")
    .replace(/تجمع/g, "new cairo")
    .replace(/سخنة/g, "ain sokhna")
    .replace(/السخنة/g, "ain sokhna")
    .replace(/جلالة/g, "galala")
    .replace(/اي فيلا/g, "ivilla")
    .replace(/اى فيلا/g, "ivilla")
    .replace(/ايفيلا/g, "ivilla")
    .replace(/i villa/g, "ivilla")
    .replace(/i-villa/g, "ivilla")
    .replace(/شقة/g, "apartment")
    .replace(/شقق/g, "apartment")
    .replace(/دوبلكس/g, "duplex")
    .replace(/فيلا/g, "villa")
    .replace(/مقدم/g, "down payment")
    .replace(/تقسيط/g, "installments")
    .replace(/سنين/g, "years")
    .replace(/,/g, "")
    .replace(/\s+/g, " ")
    .trim();
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
    voiceBtn.textContent = "بسمعك...";
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
    holdToTalkBtn.textContent = "بسمعك...";
    setVoiceStatus("بسمعك... سيب الزر لما تخلص.", "status success");
  } else {
    holdToTalkBtn.classList.remove("talking");
    holdToTalkBtn.textContent = "اضغط واسأل";
    if (realtimeDc && realtimeDc.readyState === "open") {
      setVoiceStatus("جاري تجهيز الرد أو اضغط واسأل تاني.");
    }
  }
}

function stopRealtimeAgent(message = "المساعد الصوتي متوقف.") {
  handledFunctionCalls.clear();
  realtimeResponseInProgress = false;
  pendingRealtimeResponseInstructions = null;

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
  holdToTalkBtn.textContent = "اضغط واسأل";
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

function queryIncludesAny(query, words) {
  const q = normalize(query);
  return words.some((word) => q.includes(normalize(word)));
}

function uniqueValues(list, getter, max = 3) {
  const values = [];

  (list || []).forEach((item) => {
    const value = getter(item);
    if (value && !values.includes(value)) values.push(value);
  });

  return values.slice(0, max);
}

function joinNames(names, arabic = false) {
  if (!names.length) return arabic ? "المشاريع المتاحة" : "available projects";
  if (names.length === 1) return names[0];

  const separator = arabic ? " و" : " and ";
  return names.slice(0, -1).join(arabic ? "، " : ", ") + separator + names[names.length - 1];
}

function buildSpokenSearchSummary(query, searchData) {
  const arabic = isArabicText(query);
  const found = dedupeUnitsForDisplay(searchData?.results || []).slice(0, 3);

  if (!found.length) {
    return arabic
      ? "مش لاقي نتيجة مطابقة من الداتا الحالية. بتدور في أنهي منطقة؟"
      : "I could not find a close match in the current inventory. Which area are you targeting?";
  }

  const projectNames = uniqueValues(found, (unit) => unit.project_name, 3);
  const projectText = joinNames(projectNames, arabic);
  const best = found[0];

  const asksPrice = queryIncludesAny(query, ["price", "prices", "budget", "cheapest", "starting price", "سعر", "اسعار", "الاسعار", "ميزانية", "ميزانيه", "ارخص", "اقل سعر", "كام"]);
  const asksArea = queryIncludesAny(query, ["area", "sqm", "meter", "meters", "مساحة", "مساحه", "متر"]);
  const asksBedrooms = queryIncludesAny(query, ["bedroom", "bedrooms", "rooms", "غرف", "غرفة", "غرفه", "نوم"]);
  const asksDelivery = queryIncludesAny(query, ["delivery", "handover", "ready", "استلام", "جاهز", "جاهزة", "فوري"]);
  const asksPayment = queryIncludesAny(query, ["payment", "installments", "installment", "down payment", "تقسيط", "اقساط", "أقساط", "مقدم"]);
  const asksIVilla = queryIncludesAny(query, ["i villa", "ivilla", "i-villa", "اي فيلا", "اى فيلا", "آي فيلا", "دوبلكس", "duplex"]);

  if (arabic) {
    if (asksPrice) {
      return `فيه اختيار مناسب في ${best.project_name} بسعر يبدأ من ${formatShortPrice(best.starting_price, true)}. ميزانيتك في حدود كام؟`;
    }

    if (asksArea) {
      return `فيه اختيار مناسب في ${best.project_name} بمساحة تبدأ من ${best.area_sqm} متر. بتدور على مساحة في حدود كام؟`;
    }

    if (asksBedrooms) {
      return `فيه اختيارات مناسبة في ${projectText}. محتاج كام غرفة؟`;
    }

    if (asksDelivery) {
      return `فيه اختيارات مناسبة في ${projectText} باستلامات مختلفة حسب المشروع. محتاج استلام قريب؟`;
    }

    if (asksPayment) {
      return "أنظمة الدفع بتختلف حسب المشروع وموعد الاستلام. بتدور على أقل مقدم ولا أطول فترة تقسيط؟";
    }

    if (asksIVilla) {
      return `فيه اختيارات iVilla / Duplex مناسبة في ${projectText}. تفضل Garden ولا Roof؟`;
    }

    return `فيه اختيارات مناسبة في ${projectText}. تفضل نوع وحدة معين؟`;
  }

  if (asksPrice) {
    return `I found a suitable option in ${best.project_name}, starting from ${formatShortPrice(best.starting_price, false)}. What budget range are you targeting?`;
  }

  if (asksArea) {
    return `I found a suitable option in ${best.project_name}, starting from ${best.area_sqm} sqm. What area range are you targeting?`;
  }

  if (asksBedrooms) {
    return `I found suitable options in ${projectText}. How many bedrooms do you need?`;
  }

  if (asksDelivery) {
    return `I found suitable options in ${projectText} with different delivery timelines. Do you need soon delivery?`;
  }

  if (asksPayment) {
    return "Payment plans vary by project and delivery date. Are you looking for the lowest down payment or longest installment plan?";
  }

  if (asksIVilla) {
    return `I found suitable iVilla / Duplex options in ${projectText}. Do you prefer Garden or Roof?`;
  }

  return `I found suitable options in ${projectText}. Which unit type do you prefer?`;
}

function showPhoneConfirmation(leadRow) {
  pendingVoiceLead = { ...leadRow };
  const detected = normalizePhoneDisplay(leadRow.phone);

  if (phoneConfirmBox) phoneConfirmBox.classList.remove("hidden");
  if (detectedPhoneInput) detectedPhoneInput.value = detected;
  if (leadStatus) {
    leadStatus.classList.remove("hidden");
    leadStatus.className = "status";
    leadStatus.textContent = "الرقم اتسمع من الصوت. راجعه قبل الحفظ.";
  }

  setVoiceStatus("الرقم ظاهر على الشاشة. راجعه واضغط حفظ.", "status");
}

async function confirmPendingVoiceLead() {
  if (!pendingVoiceLead) {
    setVoiceStatus("مفيش رقم محتاج تأكيد دلوقتي.", "status error");
    return;
  }

  const confirmedPhone = normalizePhoneDisplay(detectedPhoneInput?.value || pendingVoiceLead.phone);

  if (!confirmedPhone || confirmedPhone.length < 8) {
    setVoiceStatus("اكتب رقم صحيح قبل الحفظ.", "status error");
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
    leadStatus.textContent = "تم حفظ الليد بعد تأكيد الرقم.";
  }

  setVoiceStatus("تم حفظ الليد برقم واتساب مؤكد.", "status success");
}

function cancelPendingVoiceLead() {
  pendingVoiceLead = null;
  if (phoneConfirmBox) phoneConfirmBox.classList.add("hidden");
  setVoiceStatus("Phone confirmation cancelled. اضغط واسأل again to continue.");
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

function requestRealtimeAudioResponse(instructions) {
  pendingRealtimeResponseInstructions = instructions;
  flushPendingRealtimeResponse();
}

function flushPendingRealtimeResponse() {
  if (!pendingRealtimeResponseInstructions) return;
  if (!realtimeDc || realtimeDc.readyState !== "open") return;
  if (realtimeResponseInProgress) return;

  const instructions = pendingRealtimeResponseInstructions;
  pendingRealtimeResponseInstructions = null;
  realtimeResponseInProgress = true;

  realtimeDc.send(JSON.stringify({
    type: "response.create",
    response: {
      output_modalities: ["audio"],
      instructions
    }
  }));

  setVoiceStatus("المساعد بيرد دلوقتي...");
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
    setVoiceStatus("خطأ في المساعد الصوتي: " + (payload.error?.message || "Unknown error"), "status error");
    return;
  }

  if (payload.type === "session.created") {
    setVoiceStatus("المساعد الصوتي جاهز. اضغط مطولًا واسأل.", "status success");
  }

  if (payload.type === "input_audio_buffer.speech_started") {
    setVoiceStatus("بسمعك...");
  }

  if (payload.type === "input_audio_buffer.speech_stopped") {
    setVoiceStatus("جاري تجهيز الرد...");
  }

  if (payload.type === "response.created") {
    realtimeResponseInProgress = true;
    setMicEnabled(false);
    setVoiceStatus("المساعد بيرد دلوقتي...");
  }

  if (payload.type === "response.audio.done" || payload.type === "response.done") {
    realtimeResponseInProgress = false;
    setMicEnabled(false);

    if (pendingRealtimeResponseInstructions) {
      setTimeout(flushPendingRealtimeResponse, 150);
    } else {
      setVoiceStatus("تقدر تسأل سؤال تاني دلوقتي.", "status success");
    }
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
    setVoiceStatus("بدور في المخزون عن: " + query);

    const searchData = await runAISearch(query);
    const spokenSummary = buildSpokenSearchSummary(query, searchData);
    const publicVoiceResults = dedupeUnitsForDisplay(searchData?.results || []).slice(0, 6);

    const toolOutput = {
      must_read_first: spokenSummary,
      answer_language_hint: isArabicText(query) ? "egyptian_arabic" : "english",
      results_count: publicVoiceResults.length,
      visible_cards_are_on_screen: true,
      results_public_summary: publicVoiceResults.map(unit => ({
        project_name: unit.project_name,
        location: unit.location,
        unit_type: unit.unit_type
      }))
    };

    sendToolOutput(callId, toolOutput);

    requestRealtimeAudioResponse(`
You just received search_properties tool output.

Critical:
- Say ONLY the exact text in must_read_first.
- Do not add any extra details.
- Do not mention price, area, bedrooms, delivery, payment, or installments unless those words are already inside must_read_first.
- Do not read results_public_summary aloud.
- Do not read anything from the visible cards.
- Do not call save_voice_lead in this response.
- Do not ask for phone in this response.
- Do not say the search is still continuing.
- Do not say you will check or search.
- Keep the reply short and natural.
- After reading must_read_first, stop.

If Arabic:
- Reply in Egyptian Arabic.
- Read must_read_first exactly if it is Arabic.

If English:
- Reply in warm simple English.
- Read must_read_first exactly if it is English.

After this response, wait for the user's next push-to-talk message. Only in a later user turn may you collect budget or phone.
`);

    return;
  }

  if (payload.name === "save_voice_lead") {
    setVoiceStatus("بجهز بيانات الليد...");

    try {
      const savedLead = await saveVoiceLeadFromArgs(args);

      if (leadStatus) {
        leadStatus.classList.remove("hidden");
        leadStatus.className = "status success";
        leadStatus.textContent = savedLead.pending_confirmation ? "الرقم محتاج تأكيد قبل الحفظ." : "تم حفظ الليد من الصوت.";
      }

      sendToolOutput(callId, {
        saved: savedLead.saved === true,
        pending_confirmation: savedLead.pending_confirmation === true,
        saved_to: savedLead.saved === true ? "Supabase leads table" : "waiting_for_user_phone_confirmation",
        phone_status: savedLead.phone === "voice-not-provided" ? "phone_not_provided" : "phone_pending_confirmation",
        lead: savedLead
      });

      requestRealtimeAudioResponse(`
The save_voice_lead tool returned status.

If pending_confirmation is true:
- Tell the user the number is shown on screen and ask them to press Confirm & Save Lead after checking it.
- Do not say it is saved yet.

If saved is true:
- Say the details are saved.

If phone_status is phone_not_provided:
- Ask for the WhatsApp number in one short question.

Use the user's language. Arabic should be Egyptian Arabic.
`);
    } catch (error) {
      console.error("Voice lead save error:", error);

      sendToolOutput(callId, {
        saved: false,
        error: error.message || "Could not save voice lead"
      });

      requestRealtimeAudioResponse("The lead was not saved. Apologize briefly and ask the user to use the contact form.");
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
    realtimeResponseInProgress = false;
    pendingRealtimeResponseInstructions = null;
    setVoiceStatus("جاري تشغيل المساعد الصوتي...");

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
        setVoiceStatus("حالة اتصال المساعد: " + realtimePc.connectionState);
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
      setVoiceStatus("المساعد الصوتي جاهز. اضغط مطولًا واسأل.", "status success");
    });

    realtimeDc.addEventListener("close", () => {
      setVoiceStatus("اتصال المساعد الصوتي اتقفل.", "status error");
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
    stopRealtimeAgent("تعذر تشغيل المساعد الصوتي: " + err.message);
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
      setVoiceStatus("تعذر حفظ الليد المؤكد: " + (error.message || "Unknown error"), "status error");
    } finally {
      confirmPhoneBtn.disabled = false;
    }
  });
}

if (cancelPhoneBtn) {
  cancelPhoneBtn.addEventListener("click", cancelPendingVoiceLead);
}

startVoiceAgentBtn.addEventListener("click", startRealtimeAgent);
stopVoiceAgentBtn.addEventListener("click", () => stopRealtimeAgent("تم إيقاف المساعد الصوتي."));
window.addEventListener("beforeunload", () => stopRealtimeAgent("المساعد الصوتي متوقف."));

loadData();
