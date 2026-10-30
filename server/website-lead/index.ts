// website-lead: the name + mobile form shown before WhatsApp on tycoons-inv.com (29 Oct 2026).
//
// POST { name, phone, ...page context }  -> stores the lead in public.website_leads, then
//                                          pushes it to 8X CRM (Web Form Routing "tycoons-website").
// POST { action: "retry", secret }        -> pg_cron (every 15 min) re-sends leads the CRM missed.
//
// Secrets (Supabase → Edge Functions → Secrets):
//   EIGHTX_CRM_TOKEN    8X CRM API token (Settings → Integrations → Manage API Keys). Without it
//                       leads are only stored and wait as "pending" until it is set.
//   EIGHTX_CRM_FORM_ID  optional, defaults to "tycoons-website".
//   EIGHTX_CRM_URL      optional, defaults to the documented storeLead endpoint.
// The CRM token never reaches the browser.
import { createClient } from "npm:@supabase/supabase-js@2";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const CRM_URL = Deno.env.get("EIGHTX_CRM_URL") || "https://tycoons.8xcrm.com/api/v1/lead_generation/web_form_routings/storeLead";
const CRM_FORM_ID = Deno.env.get("EIGHTX_CRM_FORM_ID") || "tycoons-website";
const ALLOWED_ORIGINS = /^https:\/\/(?:www\.)?tycoons-inv\.(?:com|de)$|^https:\/\/[a-z0-9-]+--tycoons-ai-realestate\.netlify\.app$/i;

type Json = Record<string, unknown>;
type Lead = Record<string, unknown> & { id: string; full_name: string; phone: string; crm_attempts: number };

function cors(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.test(origin) ? origin : "https://tycoons-inv.com",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Vary": "Origin",
  };
}

function reply(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(origin), "content-type": "application/json" } });
}

function text(value: unknown, max: number) {
  const out = String(value ?? "").replace(/\s+/g, " ").trim();
  return out ? out.slice(0, max) : null;
}

// Arabic-Indic digits too, then keep digits and a leading +. Egyptian numbers are stored as 01xxxxxxxxx.
function normalisePhone(raw: unknown) {
  let value = String(raw ?? "")
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[^\d+]/g, "");
  if (value.startsWith("00")) value = "+" + value.slice(2);
  const digits = value.replace(/\D/g, "");
  if (/^201[0125]\d{8}$/.test(digits)) return "0" + digits.slice(2);
  if (/^1[0125]\d{8}$/.test(digits)) return "0" + digits;
  if (/^01[0125]\d{8}$/.test(digits)) return digits;
  if (value.startsWith("+") && digits.length >= 8 && digits.length <= 15) return "+" + digits;
  return null;
}

// 8X CRM rejects a description longer than 191 characters (HTTP 422), so keep it short:
// the project or page, where the visitor came from, and the tracking ref.
const CRM_DESCRIPTION_MAX = 190;

function describe(lead: Json) {
  const where = lead.project_name
    ? String(lead.project_name).slice(0, 80)
    : String(lead.unit_path || lead.page_path || "/").slice(0, 80);
  const parts = [
    `Website lead: ${where}`,
    lead.traffic_source ? `Src: ${lead.traffic_source}${lead.utm_campaign ? `/${String(lead.utm_campaign).slice(0, 30)}` : ""}` : null,
    lead.tracking_id ? `Ref: ${lead.tracking_id}` : null,
    lead.device ? String(lead.device) : null,
  ];
  const text = parts.filter(Boolean).join(" | ");
  return text.length > CRM_DESCRIPTION_MAX ? `${text.slice(0, CRM_DESCRIPTION_MAX - 1)}…` : text;
}

async function pushToCrm(lead: Lead) {
  const token = Deno.env.get("EIGHTX_CRM_TOKEN");
  if (!token) return { ok: false, error: "crm_token_missing" };
  const name = String(lead.full_name);
  const [first, ...rest] = name.split(" ");
  const phone = String(lead.phone);
  const body = {
    title: "",
    first_name: first || name,
    middle_name: "",
    last_name: rest.join(" "),
    full_name: name,
    description: describe(lead),
    company: "",
    address: "",
    zip_code: "",
    birthdate: "",
    phones: [{ phone: phone.startsWith("+") ? phone.slice(1) : phone, country_code: phone.startsWith("+") ? "" : "EG" }],
    social_accounts: [],
    form_id: CRM_FORM_ID,
  };
  try {
    const response = await fetch(CRM_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "TycoonsInv/Web",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    const textBody = (await response.text()).slice(0, 400);
    if (!response.ok) return { ok: false, error: `crm_http_${response.status}: ${textBody}` };
    return { ok: true, error: null };
  } catch (error) {
    return { ok: false, error: `crm_unreachable: ${String(error).slice(0, 300)}` };
  }
}

async function deliver(lead: Lead) {
  const result = await pushToCrm(lead);
  await db.from("website_leads").update({
    crm_status: result.ok ? "sent" : result.error === "crm_token_missing" ? "pending" : "failed",
    crm_attempts: lead.crm_attempts + (result.error === "crm_token_missing" ? 0 : 1),
    crm_last_error: result.error,
    crm_sent_at: result.ok ? new Date().toISOString() : null,
  }).eq("id", lead.id);
  return result.ok;
}

async function createLead(body: Json) {
  if (text(body.company_website, 10)) return { ok: true }; // honeypot: bots fill every field
  const name = text(body.name, 80);
  const phone = normalisePhone(body.phone);
  if (!name || name.length < 2) return { ok: false, error: "invalid_name" };
  if (!phone) return { ok: false, error: "invalid_phone" };

  // The same number again within 30 minutes (double tap, second button): keep one CRM lead.
  const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data: recent } = await db.from("website_leads").select("id").eq("phone", phone).gte("created_at", since).limit(1);
  const duplicate = Boolean(recent && recent.length);

  const row = {
    full_name: name,
    phone,
    tracking_id: text(body.tracking_id, 40),
    page_path: text(body.page_path, 300),
    page_url: text(body.page_url, 500),
    project_slug: text(body.project_slug, 160),
    project_name: text(body.project_name, 160),
    unit_path: /^\/units\//.test(String(body.page_path || "")) ? text(body.page_path, 300) : null,
    button_label: text(body.button_label, 120),
    placement: text(body.placement, 60),
    lang: text(body.lang, 10),
    device: text(body.device, 20),
    traffic_source: text(body.traffic_source, 40),
    referrer: text(body.referrer, 200),
    landing_path: text(body.landing_path, 300),
    utm_source: text(body.utm_source, 60),
    utm_medium: text(body.utm_medium, 60),
    utm_campaign: text(body.utm_campaign, 120),
    crm_status: duplicate ? "duplicate" : "pending",
  };
  const { data, error } = await db.from("website_leads").insert(row).select("*").single();
  if (error || !data) return { ok: false, error: "store_failed" };
  if (!duplicate) await deliver(data as Lead);
  return { ok: true };
}

async function retry(body: Json) {
  const { data: setting } = await db.from("media_admin_settings").select("value").eq("key", "website_lead_retry_secret").maybeSingle();
  if (!setting?.value || text(body.secret, 100) !== setting.value) return { ok: false, error: "forbidden" };
  const { data } = await db.from("website_leads").select("*")
    .in("crm_status", ["pending", "failed"]).lt("crm_attempts", 8)
    .order("created_at", { ascending: true }).limit(25);
  let sent = 0;
  for (const lead of (data || []) as Lead[]) if (await deliver(lead)) sent += 1;
  return { ok: true, tried: (data || []).length, sent };
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return reply({ ok: false, error: "method_not_allowed" }, 405, origin);
  const body = (await req.json().catch(() => ({}))) as Json;
  if (body.action === "retry") {
    const result = await retry(body);
    return reply(result, result.ok ? 200 : 403, origin);
  }
  const result = await createLead(body);
  return reply(result, result.ok ? 200 : 400, origin);
});
