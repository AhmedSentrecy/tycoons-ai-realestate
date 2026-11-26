// Payment details for the MCP (search_properties + get_property_details).
// The units table only carries a short down payment / installments text. The full picture lives in:
//   1. the project's live offer in content/project-showcase.json (same source as the voice assistant),
//   2. the project row (projects.down_payment_text / installments_text / delivery_text / finishing / description),
//   3. WhatsApp project updates the admin APPLIED (wa_project_updates.details, valid_until).
// Pending (not yet reviewed) WhatsApp updates are never published.
import { voiceOfferFor } from "../../src/lib/voiceOffers.ts";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://coqnjymekrkoausiiytm.supabase.co";
const PUBLISHABLE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_6VFTijqKQB6RD7nIsSj_JQ_eEdoibGg";
const CACHE_TTL_MS = 5 * 60 * 1000;
const UPDATE_TYPES = ["payment_plan", "offer", "price_change", "launch", "delivery"];

const cache = new Map(); // project_id -> { expiresAt, value }

function clean(value, max = 600) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

async function rest(path, key) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`supabase ${response.status}`);
  return response.json();
}

async function projectPlan(projectId) {
  const rows = await rest(
    `projects?id=eq.${encodeURIComponent(projectId)}&select=down_payment_text,installments_text,delivery_text,finishing,description&limit=1`,
    PUBLISHABLE_KEY,
  );
  const row = rows?.[0];
  if (!row) return null;
  const plan = {
    down_payment: clean(row.down_payment_text, 200),
    installments: clean(row.installments_text, 200),
    delivery: clean(row.delivery_text, 200),
    finishing: clean(row.finishing, 200),
    description: clean(row.description, 900),
  };
  return Object.values(plan).some(Boolean) ? Object.fromEntries(Object.entries(plan).filter(([, v]) => v)) : null;
}

async function appliedUpdates(projectId) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return [];
  const rows = await rest(
    `wa_project_updates?project_id=eq.${encodeURIComponent(projectId)}&status=eq.applied` +
      `&update_type=in.(${UPDATE_TYPES.join(",")})&order=message_date.desc&limit=3` +
      "&select=update_type,message_date,down_payment_text,installments_text,delivery_text,finishing,valid_until,details",
    serviceKey,
  );
  return (rows || [])
    .map((row) => {
      const update = {
        type: row.update_type,
        date: row.message_date ? String(row.message_date).slice(0, 10) : "",
        down_payment: clean(row.down_payment_text, 200),
        installments: clean(row.installments_text, 200),
        delivery: clean(row.delivery_text, 200),
        finishing: clean(row.finishing, 200),
        valid_until: clean(row.valid_until, 60),
        details: clean(row.details, 900),
      };
      return Object.fromEntries(Object.entries(update).filter(([, v]) => v));
    })
    .filter((update) => update.details || update.down_payment || update.installments);
}

/** Payment details for one unit's project (cached per project for 5 minutes). Never throws. */
export async function paymentDetailsFor(unit, now = Date.now()) {
  const projectId = unit?.project_id || "";
  const key = projectId || `slug:${unit?.project_slug || unit?.project_name || ""}`;
  const hit = cache.get(key);
  if (hit && now < hit.expiresAt) return hit.value;

  const offer = voiceOfferFor(unit?.project_slug, now);
  const [plan, updates] = await Promise.all([
    projectId ? projectPlan(projectId).catch(() => null) : null,
    projectId ? appliedUpdates(projectId).catch(() => []) : [],
  ]);

  const details = {};
  if (offer) {
    details.current_offer = {
      kind: offer.kind,
      title: offer.title,
      plans: offer.plans,
      ...(offer.down_payment_breakdown ? { down_payment_breakdown: offer.down_payment_breakdown } : {}),
    };
  }
  if (plan) details.project_plan = plan;
  if (updates.length) details.latest_updates = updates;
  const value = Object.keys(details).length
    ? {
        ...details,
        notice:
          "Official payment information for this project (developer offer, project plan, reviewed updates). Quote it as written; do not convert it into equal installments.",
      }
    : null;
  cache.set(key, { expiresAt: now + CACHE_TTL_MS, value });
  return value;
}

/** Adds payment_details to a list of public units (one lookup per project). */
export async function withPaymentDetails(entries, unitsById) {
  const byProject = new Map();
  for (const entry of entries) {
    const unit = unitsById.get(entry.unit_id);
    if (!unit) continue;
    const key = unit.project_id || unit.project_slug || unit.project_name;
    if (!byProject.has(key)) byProject.set(key, paymentDetailsFor(unit));
  }
  const resolved = new Map();
  await Promise.all([...byProject.entries()].map(async ([key, promise]) => resolved.set(key, await promise)));
  return entries.map((entry) => {
    const unit = unitsById.get(entry.unit_id);
    const details = unit ? resolved.get(unit.project_id || unit.project_slug || unit.project_name) : null;
    return details ? { ...entry, payment_details: details } : entry;
  });
}
