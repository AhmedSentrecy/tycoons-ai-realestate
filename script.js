const SUPABASE_URL = window.TYCOONS_SUPABASE_URL;
const SUPABASE_KEY = window.TYCOONS_SUPABASE_KEY;
const API_BASE = SUPABASE_URL + "/rest/v1";

let units = [];
let projects = [];

const results = document.getElementById("results");
const projectGrid = document.getElementById("projectGrid");
const searchInput = document.getElementById("searchInput");
const statusBox = document.getElementById("status");
const leadForm = document.getElementById("leadForm");
const leadStatus = document.getElementById("leadStatus");
const voiceBtn = document.getElementById("voiceBtn");

document.getElementById("year").textContent = new Date().getFullYear();

function headers(extra = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: "Bearer " + SUPABASE_KEY,
    "Content-Type": "application/json",
    ...extra
  };
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
    return `<article class="card">
      <div class="image">${safe(item.location)}</div>
      <div class="content">
        <h3>${safe(item.name)}</h3>
        <div class="tags">
          <span class="tag">${safe(item.developer)}</span>
          <span class="tag">${safe(item.status)}</span>
          <span class="tag">${safe(item.installments_text)}</span>
        </div>
        <div class="price">${price(item.min_price)}</div>
        <p>${safe(item.description, "")}</p>
      </div>
    </article>`;
  }

  return `<article class="card">
    <div class="image">${safe(item.location)}</div>
    <div class="content">
      <h3>${safe(item.project_name)}</h3>
      <div class="tags">
        <span class="tag">${safe(item.unit_type)}</span>
        <span class="tag">${safe(item.bedrooms_text)}</span>
        <span class="tag">${safe(item.installments_text)}</span>
        <span class="tag">${safe(item.delivery_text)}</span>
      </div>
      <div class="price">${price(item.starting_price)}</div>
      <p>Down payment: ${safe(item.down_payment_text)}</p>
    </div>
  </article>`;
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

function budget(text) {
  const lower = normalize(text);
  const m = lower.match(/(\d+(\.\d+)?)\s*(m|million|مليون)/);
  if (m) return Number(m[1]) * 1000000;
  const n = lower.match(/(\d{6,})/);
  return n ? Number(n[1]) : null;
}

function search(query) {
  const q = normalize(query);
  const maxBudget = budget(q);
  const terms = q.split(/\s+/).filter(Boolean);

  const scored = units.map(unit => {
    const haystack = normalize([
      unit.project_name, unit.developer, unit.location, unit.unit_type, unit.bedrooms_text,
      unit.down_payment_text, unit.installments_text, unit.delivery_text, unit.description, unit.search_text
    ].filter(Boolean).join(" "));

    let score = 0;
    terms.forEach(term => {
      if (term.length > 2 && haystack.includes(term)) score += 1;
    });

    if (q.includes("new cairo") && haystack.includes("new cairo")) score += 5;
    if (q.includes("ain sokhna") && haystack.includes("ain sokhna")) score += 5;
    if (q.includes("apartment") && haystack.includes("apartment")) score += 4;
    if (q.includes("villa") && haystack.includes("villa")) score += 4;
    if (q.includes("ivilla") && haystack.includes("ivilla")) score += 4;
    if (q.includes("twinhouse") && haystack.includes("twinhouse")) score += 4;

    if (maxBudget && Number(unit.starting_price || 0) <= maxBudget) score += 4;
    if (maxBudget && Number(unit.starting_price || 0) > maxBudget) score -= 2;

    return { ...unit, _score: score };
  }).filter(unit => unit._score > 0);

  scored.sort((a, b) => b._score - a._score || Number(a.starting_price || 0) - Number(b.starting_price || 0));

  if (!scored.length) return [...units].sort((a, b) => Number(a.starting_price || 0) - Number(b.starting_price || 0)).slice(0, 6);
  return scored.slice(0, 6);
}

function speak(text) {
  if (!("speechSynthesis" in window)) return;
  const msg = new SpeechSynthesisUtterance(text);
  msg.lang = "en-US";
  msg.rate = 0.95;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(msg);
}

async function loadData() {
  try {
    statusBox.textContent = "Loading live data from Supabase...";
    statusBox.className = "status";

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

document.getElementById("searchBtn").addEventListener("click", async () => {
  const query = searchInput.value.trim();
  if (!query) {
    statusBox.className = "status";
    statusBox.textContent = "Please type or speak what you are looking for.";
    return;
  }

  const matches = search(query);
  render(matches, results);

  try {
    await insertRow("search_logs", { query, matched_results: matches.length });
  } catch (err) {
    console.warn("Search log failed:", err);
  }

  const best = matches[0];
  const answer = "I found " + matches.length + " matching option" + (matches.length > 1 ? "s" : "") + ". The closest match is " + best.project_name + ", " + price(best.starting_price) + ", with " + safe(best.installments_text) + " installments.";
  statusBox.className = "status success";
  statusBox.textContent = answer;
  speak(answer);
});

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

if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;

  voiceBtn.addEventListener("click", () => {
    voiceBtn.textContent = "Listening...";
    recognition.start();
  });

  recognition.addEventListener("result", (event) => {
    searchInput.value = event.results[0][0].transcript;
    voiceBtn.textContent = "Speak";
  });

  recognition.addEventListener("end", () => {
    voiceBtn.textContent = "Speak";
  });
} else {
  voiceBtn.addEventListener("click", () => {
    statusBox.textContent = "Voice input is not supported in this browser. Try Chrome on desktop.";
  });
}

loadData();
