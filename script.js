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

function price(value) {
  if (!value) return "Price on request";
  return "From " + new Intl.NumberFormat("en-US").format(Number(value)) + " EGP";
}

function card(item, type = "unit") {
  if (type === "project") {
    return `<article class="card"><div class="image">${safe(item.location)}</div><div class="content"><h3>${safe(item.name)}</h3><div class="tags"><span class="tag">${safe(item.developer)}</span><span class="tag">${safe(item.status)}</span><span class="tag">${safe(item.installments_text)}</span></div><div class="price">${price(item.min_price)}</div><p>${safe(item.description, "")}</p></div></article>`;
  }

  return `<article class="card"><div class="image">${safe(item.location)}</div><div class="content"><h3>${safe(item.project_name)}</h3><div class="tags"><span class="tag">${safe(item.unit_type)}</span><span class="tag">${safe(item.bedrooms_text)}</span><span class="tag">${safe(item.installments_text)}</span><span class="tag">${safe(item.delivery_text)}</span></div><div class="price">${price(item.starting_price)}</div><p>Down payment: ${safe(item.down_payment_text)}</p></div></article>`;
}

function render(list, target, type = "unit") {
  target.innerHTML = list.length ? list.map(item => card(item, type)).join("") : '<div class="status">No matching items found.</div>';
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

// Old browser text-to-speech is disabled completely.
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

// Quick Speak is dictation only.
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

async function saveVoiceLeadFromArgs(args) {
  const phoneRaw = String(args.phone || args.whatsapp || "").trim();

  const row = {
    name: args.name || null,
    phone: phoneRaw || "voice-not-provided",
    message: args.message || args.notes || "Voice lead captured from website voice agent",
    preferred_location: args.preferred_location || args.location || null,
    budget: parseBudgetNumber(args.budget),
    unit_type: args.unit_type || null,
    project_interest: args.project_interest || args.project || null,
    source: phoneRaw ? "website_voice_with_phone" : "website_voice_pending_phone"
  };

  await insertRow("leads", row);
  return row;
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
    const toolOutput = {
      answer_language_hint: isArabicText(query) ? "egyptian_arabic" : "english",
      answer: searchData?.answer || "Search completed.",
      results: (searchData?.results || []).slice(0, 6).map(unit => ({
        project_name: unit.project_name,
        location: unit.location,
        unit_type: unit.unit_type,
        bedrooms_text: unit.bedrooms_text,
        starting_price: unit.starting_price,
        down_payment_text: unit.down_payment_text,
        installments_text: unit.installments_text,
        delivery_text: unit.delivery_text
      }))
    };

    sendToolOutput(callId, toolOutput);

    realtimeDc.send(JSON.stringify({
      type: "response.create",
      response: {
        modalities: ["audio", "text"],
        instructions: `
Use the search_properties tool output only.

If the user's last request was Arabic:
- Reply in Egyptian Arabic as naturally as possible.
- Mention only the best result.
- Ask one short follow-up question.
- Do not say the search is still continuing.

If the user's last request was English:
- Reply in warm simple English.
- Mention only the best result.
- Ask one short follow-up question.

Lead capture:
- If the user sounds interested, asks for payment breakdown, says yes, asks for details, mentions budget, or gives a phone/WhatsApp number, continue the conversation naturally and collect one missing detail at a time.
- Once you have useful lead intent, call save_voice_lead.
`
      }
    }));

    return;
  }

  if (payload.name === "save_voice_lead") {
    setVoiceStatus("Saving voice lead...");

    try {
      const savedLead = await saveVoiceLeadFromArgs(args);

      if (leadStatus) {
        leadStatus.classList.remove("hidden");
        leadStatus.className = "status success";
        leadStatus.textContent = "Voice lead saved in Supabase.";
      }

      sendToolOutput(callId, {
        saved: true,
        saved_to: "Supabase leads table",
        phone_status: savedLead.phone === "voice-not-provided" ? "phone_not_provided" : "phone_provided",
        lead: savedLead
      });

      realtimeDc.send(JSON.stringify({
        type: "response.create",
        response: {
          modalities: ["audio", "text"],
          instructions: `
The lead was saved successfully.

If Arabic:
- Reply in Egyptian Arabic.
- If phone was not provided, ask for the WhatsApp number in one short question.
- If phone was provided, say that the details are saved and ask one short follow-up question.

If English:
- Reply in warm simple English.
- If phone was not provided, ask for the WhatsApp number in one short question.
- If phone was provided, say the details are saved and ask one short follow-up question.
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
          modalities: ["audio", "text"],
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

startVoiceAgentBtn.addEventListener("click", startRealtimeAgent);
stopVoiceAgentBtn.addEventListener("click", () => stopRealtimeAgent("Voice session stopped."));
window.addEventListener("beforeunload", () => stopRealtimeAgent("Voice agent is off."));

loadData();
