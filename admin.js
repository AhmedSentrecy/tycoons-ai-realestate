const API_URL = "/api/admin-inventory";

let adminPassword = localStorage.getItem("tycoons_admin_password") || "";
let projects = [];
let units = [];

const loginPanel = document.getElementById("loginPanel");
const adminPanel = document.getElementById("adminPanel");
const adminPasswordInput = document.getElementById("adminPassword");
const loginBtn = document.getElementById("loginBtn");
const loginStatus = document.getElementById("loginStatus");
const projectForm = document.getElementById("projectForm");
const unitForm = document.getElementById("unitForm");
const projectSelect = document.getElementById("projectSelect");
const unitTableWrap = document.getElementById("unitTableWrap");
const unitFilter = document.getElementById("unitFilter");
const refreshBtn = document.getElementById("refreshBtn");
const resetProjectBtn = document.getElementById("resetProjectBtn");
const resetUnitBtn = document.getElementById("resetUnitBtn");
const csvFile = document.getElementById("csvFile");
const importCsvBtn = document.getElementById("importCsvBtn");
const importStatus = document.getElementById("importStatus");

function setStatus(el, text, type = "") {
  el.className = "status " + type;
  el.classList.remove("hidden");
  el.textContent = text;
}

function money(value) {
  if (!value) return "-";
  return new Intl.NumberFormat("en-US").format(Number(value));
}

function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function cleanNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const num = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(num) ? num : null;
}

function cleanText(value) {
  const text = String(value || "").trim();
  return text || null;
}

async function api(action, payload = {}) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Password": adminPassword
    },
    body: JSON.stringify({ action, ...payload })
  });

  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { error: text }; }

  if (!res.ok) {
    throw new Error(data.error || "Admin request failed");
  }

  return data;
}

async function login() {
  adminPassword = adminPasswordInput.value.trim();

  if (!adminPassword) {
    setStatus(loginStatus, "Enter admin password first.", "error");
    return;
  }

  try {
    loginBtn.disabled = true;
    await loadData();
    localStorage.setItem("tycoons_admin_password", adminPassword);
    loginPanel.classList.add("hidden");
    adminPanel.classList.remove("hidden");
  } catch (error) {
    setStatus(loginStatus, error.message, "error");
  } finally {
    loginBtn.disabled = false;
  }
}

async function loadData() {
  const data = await api("list");
  projects = data.projects || [];
  units = data.units || [];
  renderStats();
  renderProjectOptions();
  renderUnits();
}

function renderStats() {
  document.getElementById("projectCount").textContent = projects.length;
  document.getElementById("unitCount").textContent = units.length;
  document.getElementById("availableCount").textContent = units.filter(u => u.availability_status === "available").length;
}

function renderProjectOptions() {
  projectSelect.innerHTML = '<option value="">Choose project</option>' + projects.map(p => {
    return `<option value="${p.id}">${p.name} — ${p.location || ""}</option>`;
  }).join("");
}

function filteredUnits() {
  const q = unitFilter.value.trim().toLowerCase();

  if (!q) return units;

  return units.filter(u => [
    u.project_name,
    u.developer,
    u.location,
    u.unit_type,
    u.bedrooms_text,
    u.starting_price,
    u.down_payment_text,
    u.installments_text,
    u.delivery_text,
    u.availability_status,
    u.image_url,
    u.brochure_url,
    u.video_url
  ].join(" ").toLowerCase().includes(q));
}

function mediaMini(unit) {
  const links = [];

  if (unit.image_url) links.push(`<a href="${unit.image_url}" target="_blank" rel="noopener">Image</a>`);
  if (unit.brochure_url) links.push(`<a href="${unit.brochure_url}" target="_blank" rel="noopener">Brochure</a>`);
  if (unit.video_url) links.push(`<a href="${unit.video_url}" target="_blank" rel="noopener">Video</a>`);

  return links.length ? `<div class="media-mini">${links.join("")}</div>` : "";
}

function renderUnits() {
  const list = filteredUnits();

  unitTableWrap.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Project</th>
          <th>Unit</th>
          <th>Price</th>
          <th>Payment / Media</th>
          <th>Delivery</th>
          <th>Status</th>
          <th>Updated</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${list.map(unit => `
          <tr>
            <td><strong>${unit.project_name || "-"}</strong><br><span class="pill">${unit.location || "-"}</span></td>
            <td>${unit.unit_type || "-"}<br><span class="pill">${unit.bedrooms_text || "No bedrooms"}</span></td>
            <td>${money(unit.starting_price)} EGP</td>
            <td>${unit.down_payment_text || "-"}<br>${unit.installments_text || ""}${mediaMini(unit)}</td>
            <td>${unit.delivery_text || "-"}</td>
            <td><span class="pill">${unit.availability_status || "-"}</span></td>
            <td>${unit.last_updated_at ? new Date(unit.last_updated_at).toLocaleDateString() : "-"}</td>
            <td>
              <div class="actions">
                <button class="ghost small" type="button" onclick="editUnit('${unit.id}')">Edit</button>
                <button class="ghost small" type="button" onclick="toggleUnit('${unit.id}', '${unit.availability_status === "available" ? "unavailable" : "available"}')">${unit.availability_status === "available" ? "Mark unavailable" : "Mark available"}</button>
              </div>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

async function saveProject(event) {
  event.preventDefault();

  const data = formData(projectForm);

  const project = {
    id: data.id || undefined,
    name: cleanText(data.name),
    developer: cleanText(data.developer),
    location: cleanText(data.location),
    status: cleanText(data.status),
    min_price: cleanNumber(data.min_price),
    down_payment_text: cleanText(data.down_payment_text),
    installments_text: cleanText(data.installments_text),
    delivery_text: cleanText(data.delivery_text),
    description: cleanText(data.description),
    image_url: cleanText(data.image_url),
    brochure_url: cleanText(data.brochure_url),
    video_url: cleanText(data.video_url)
  };

  if (!project.name || !project.location) {
    alert("Project name and location are required.");
    return;
  }

  await api("saveProject", { project });
  projectForm.reset();
  await loadData();
}

async function saveUnit(event) {
  event.preventDefault();

  const data = formData(unitForm);
  const selectedProject = projects.find(p => p.id === data.project_id);

  if (!selectedProject) {
    alert("Choose a project first.");
    return;
  }

  const unit = {
    id: data.id || undefined,
    project_id: selectedProject.id,
    project_name: selectedProject.name,
    developer: selectedProject.developer || null,
    location: selectedProject.location,
    unit_type: cleanText(data.unit_type),
    bedrooms_text: cleanText(data.bedrooms_text),
    area_sqm: cleanNumber(data.area_sqm),
    starting_price: cleanNumber(data.starting_price),
    down_payment_text: cleanText(data.down_payment_text),
    installments_text: cleanText(data.installments_text),
    delivery_text: cleanText(data.delivery_text),
    finishing: cleanText(data.finishing),
    availability_status: data.availability_status || "available",
    description: cleanText(data.description),
    image_url: cleanText(data.image_url),
    brochure_url: cleanText(data.brochure_url),
    video_url: cleanText(data.video_url)
  };

  console.log("Saving unit payload:", unit);

  if (!unit.unit_type || !unit.starting_price) {
    alert("Unit type and starting price are required.");
    return;
  }

  await api("saveUnit", { unit });
  unitForm.reset();
  await loadData();
}

window.editUnit = function(id) {
  const unit = units.find(u => u.id === id);
  if (!unit) return;

  unitForm.id.value = unit.id || "";
  unitForm.project_id.value = unit.project_id || "";
  unitForm.unit_type.value = unit.unit_type || "";
  unitForm.bedrooms_text.value = unit.bedrooms_text || "";
  unitForm.area_sqm.value = unit.area_sqm || "";
  unitForm.starting_price.value = unit.starting_price || "";
  unitForm.down_payment_text.value = unit.down_payment_text || "";
  unitForm.installments_text.value = unit.installments_text || "";
  unitForm.delivery_text.value = unit.delivery_text || "";
  unitForm.finishing.value = unit.finishing || "";
  unitForm.availability_status.value = unit.availability_status || "available";
  unitForm.description.value = unit.description || "";

  if (unitForm.image_url) unitForm.image_url.value = unit.image_url || "";
  if (unitForm.brochure_url) unitForm.brochure_url.value = unit.brochure_url || "";
  if (unitForm.video_url) unitForm.video_url.value = unit.video_url || "";

  unitForm.scrollIntoView({ behavior: "smooth", block: "start" });
};

window.toggleUnit = async function(id, availability_status) {
  await api("toggleUnit", { id, availability_status });
  await loadData();
};

function parseCSV(text) {
  const rows = [];
  let current = [];
  let value = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && insideQuotes && next === '"') {
      value += '"';
      i++;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
      current.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && next === "\n") i++;
      current.push(value);
      value = "";
      if (current.some(cell => cell.trim() !== "")) rows.push(current);
      current = [];
    } else {
      value += char;
    }
  }

  current.push(value);
  if (current.some(cell => cell.trim() !== "")) rows.push(current);

  const headers = rows.shift().map(h => h.trim());

  return rows.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = (row[index] || "").trim();
    });
    return obj;
  });
}

async function importCsv() {
  if (!csvFile.files?.[0]) {
    setStatus(importStatus, "Choose a CSV file first.", "error");
    return;
  }

  try {
    importCsvBtn.disabled = true;
    const text = await csvFile.files[0].text();
    const rows = parseCSV(text);

    if (!rows.length) {
      setStatus(importStatus, "CSV has no rows.", "error");
      return;
    }

    const result = await api("importUnits", { rows });
    setStatus(importStatus, `Imported ${result.inserted_units} units and created ${result.created_projects} projects.`, "success");
    await loadData();
  } catch (error) {
    setStatus(importStatus, error.message, "error");
  } finally {
    importCsvBtn.disabled = false;
  }
}

loginBtn.addEventListener("click", login);
adminPasswordInput.addEventListener("keydown", (e) => { if (e.key === "Enter") login(); });
projectForm.addEventListener("submit", saveProject);
unitForm.addEventListener("submit", saveUnit);
refreshBtn.addEventListener("click", loadData);
unitFilter.addEventListener("input", renderUnits);
resetProjectBtn.addEventListener("click", () => projectForm.reset());
resetUnitBtn.addEventListener("click", () => unitForm.reset());
importCsvBtn.addEventListener("click", importCsv);

if (adminPassword) {
  adminPasswordInput.value = adminPassword;
}
