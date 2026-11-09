// Supabase Edge Function: wa-direct
// WAHA sends every WhatsApp event straight here (no Make). Webhook URL:
//   https://coqnjymekrkoausiiytm.supabase.co/functions/v1/wa-direct?key=<media_admin_settings.wa_inbox_key>
// For each group message that passes the light filter:
//   1. answers WAHA at once (200) and keeps working in the background
//   2. wa-inbox "track"  -> registers the group, stops if the group is switched off in the admin
//   3. Excel/CSV: same sheet name (dates and numbers removed) from the same group is read once every 7 days
//   4. sends the text / image / PDF / sheet (as CSV) to Claude with the Tycoons rules (prompt.ts)
//   5. wa-inbox "intake_batch" -> units wait in the admin page for approval
// Every message that passed the filter is logged in public.wa_message_log.
// Secrets: ANTHROPIC_API_KEY (Edge Function secret). Settings: wa_inbox_key, wa_waha_base_url, wa_waha_key.
// Deploy with verify_jwt = false (WAHA cannot send a Supabase JWT; the ?key= check protects it).
import { createClient } from "npm:@supabase/supabase-js@2";
import * as XLSX from "npm:xlsx@0.18.5";
import { SYSTEM_PROMPT, UNITS_SCHEMA } from "./prompt.ts";

type Json = Record<string, unknown>;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const db = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const MODEL = "claude-sonnet-5-5";
const SHEET_REPEAT_DAYS = 7;
const MAX_SHEET_CHARS = 120_000;
const KEYWORDS = /sold|reserved|available|price|مباع|اتباع|خلص|محجوز|متاح|سعر|اسعار|أسعار|متر|مليون|مقدم|تقسيط|استلام|شيت|لانش|launch/i;

const text = (value: unknown) => (typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim());
const reply = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });

function timingSafeEqual(a: string, b: string) {
  if (!a || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** The admin's «وقّف كل الأتمتة» switch. Read fresh for every message (no cache) so it works at once. */
async function automationPaused() {
  const { data } = await db.from("media_admin_settings").select("value").eq("key", "wa_automation_paused").maybeSingle();
  return text(data?.value) === "on";
}

let settingsCache: Record<string, string> | null = null;
async function settings() {
  if (settingsCache) return settingsCache;
  const { data, error } = await db.from("media_admin_settings").select("key,value").in("key", ["wa_inbox_key", "wa_waha_base_url", "wa_waha_key", "anthropic_api_key", "wa_research_mode", "wa_intensive_until"]);
  if (error) throw new Error("settings_unavailable");
  settingsCache = Object.fromEntries((data ?? []).map((row) => [row.key, text(row.value)]));
  return settingsCache;
}

// ---------- 1. light filter (same as the last Make filter) ----------

type Kind = "text" | "image" | "pdf" | "sheet" | "other";

function mediaKind(mime: string, fileName: string): Kind {
  const name = fileName.toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (/spreadsheet|ms-excel|csv|opendocument\.spreadsheet/.test(mime) || /\.(xlsx|xlsm|xls|csv|ods)$/.test(name)) return "sheet";
  return "other";
}

/**
 * «مكثف» in the admin (until its end date): group messages the filter skips are written to wa_message_log
 * (status skipped_<reason>) without going to Claude, so the filter can be checked against them later.
 */
function intensive(s: Record<string, string>) {
  return s.wa_research_mode === "intensive" && (!s.wa_intensive_until || Date.parse(s.wa_intensive_until) > Date.now());
}

function passesFilter(event: Json): { ok: boolean; reason: string; kind: Kind } {
  const payload = (event.payload ?? {}) as Json;
  const media = (payload.media ?? {}) as Json;
  const mime = text(media.mimetype).toLowerCase();
  const body = text(payload.body);
  if (text(event.event) !== "message") return { ok: false, reason: "not_message_event", kind: "text" };
  if (!text(payload.from).endsWith("@g.us")) return { ok: false, reason: "not_group", kind: "text" };
  if (payload.fromMe === true) return { ok: false, reason: "from_me", kind: "text" };
  if (mime) {
    if (mime.startsWith("audio/") || mime.startsWith("video/") || mime === "image/webp") return { ok: false, reason: "voice_video_sticker", kind: "other" };
    return { ok: true, reason: "media", kind: mediaKind(mime, text(media.filename)) };
  }
  if (body.length >= 10 && /[0-9٠-٩]/.test(body)) return { ok: true, reason: "text_with_number", kind: "text" };
  if (body.length >= 40) return { ok: true, reason: "long_text", kind: "text" };
  if (KEYWORDS.test(body)) return { ok: true, reason: "keyword", kind: "text" };
  return { ok: false, reason: "short_chat", kind: "text" };
}

// ---------- helpers ----------

/** Calls the existing wa-inbox function (same rules as before: track, intake_batch). */
async function waInbox(fields: Record<string, string>) {
  const s = await settings();
  const response = await fetch(`${SUPABASE_URL}/functions/v1/wa-inbox`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "x-intake-key": s.wa_inbox_key, "x-waha-key": s.wa_waha_key || "" },
    body: new URLSearchParams(fields),
    signal: AbortSignal.timeout(40_000),
  });
  const data = (await response.json().catch(() => ({}))) as Json;
  if (!response.ok) throw new Error(`wa-inbox ${fields.action}: ${text(data.error) || response.status}`);
  return data;
}

async function downloadMedia(url: string): Promise<Uint8Array> {
  const s = await settings();
  const response = await fetch(url, { headers: { "X-Api-Key": s.wa_waha_key || "" }, signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`media_download_failed:${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

function base64(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

/** "Price List 3-11-2026 (2).xlsx" -> "pricelist" : the same sheet even when the date in the name changes. */
function sheetKey(fileName: string) {
  const key = fileName.toLowerCase().replace(/\.[a-z0-9]{2,5}$/, "").replace(/[0-9٠-٩]+/g, " ")
    .replace(/(^|[^a-z؀-ۿ])(v|ver|version|final|updated|update|new|copy|نسخة|نسخه|جديد|جديدة|محدث|محدثة|تحديث)(?=$|[^a-z؀-ۿ])/g, " ")
    .replace(/[^a-z؀-ۿ]+/g, "");
  return key || "sheet";
}

function sheetToCsv(bytes: Uint8Array, fileName: string) {
  const book = fileName.toLowerCase().endsWith(".csv")
    ? XLSX.read(new TextDecoder().decode(bytes), { type: "string" })
    : XLSX.read(bytes, { type: "array" });
  let out = "";
  for (const name of book.SheetNames) {
    const csv = XLSX.utils.sheet_to_csv(book.Sheets[name], { blankrows: false }).trim();
    if (csv) out += `### Tab: ${name}\n${csv}\n\n`;
    if (out.length > MAX_SHEET_CHARS) break;
  }
  return out.length > MAX_SHEET_CHARS ? `${out.slice(0, MAX_SHEET_CHARS)}\n[sheet cut here: too long]` : out;
}

/**
 * Big messages (a sheet, or text over LONG_TEXT characters) are read without long thinking: thinking counts
 * toward max_tokens, and on big messages it used them all before Claude wrote the units (claude_bad_json:
 * max_tokens). The Supabase free plan stops a function after 150 seconds, so max_tokens cannot simply grow.
 */
const LONG_TEXT = 1500;

async function askClaude(content: unknown[], big = false): Promise<Json> {
  const s = await settings();
  const key = Deno.env.get("ANTHROPIC_API_KEY") || s.anthropic_api_key;
  if (!key) throw new Error("ANTHROPIC_API_KEY_missing");
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 16000,
      // Prompt caching: the long Tycoons rules are the same for every WhatsApp message, so Claude keeps
      // them for a few minutes and re-reads them at about 10% of the normal input price.
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      output_config: { format: { type: "json_schema", schema: UNITS_SCHEMA }, ...(big ? { effort: "medium" } : {}) },
      ...(big ? { thinking: { type: "between_tools" } } : {}),
      messages: [{ role: "user", content }],
    }),
    signal: AbortSignal.timeout(130_000),
  });
  const data = (await response.json().catch(() => ({}))) as Json;
  // Safety net: if the API refuses the big-message settings, read it the normal way.
  if (!response.ok && big && response.status === 400) return askClaude(content, false);
  if (!response.ok) throw new Error(`claude_${response.status}:${text((data.error as Json | undefined)?.message).slice(0, 300)}`);
  const block = ((data.content as Json[]) ?? []).find((item) => item.type === "text");
  try {
    return JSON.parse(text(block?.text) || "{}") as Json;
  } catch {
    throw new Error(`claude_bad_json:${text(data.stop_reason)}`);
  }
}

async function logUpdate(id: number | null, values: Json) {
  if (!id) return;
  await db.from("wa_message_log").update({ ...values, updated_at: new Date().toISOString() }).eq("id", id);
}

/** A group message the filter skipped, kept for the filter review (no Claude call, no cost). */
async function logSkipped(event: Json, reason: string) {
  const payload = (event.payload ?? {}) as Json;
  const info = ((payload._data as Json | undefined)?.Info ?? {}) as Json;
  const media = (payload.media ?? {}) as Json;
  await db.from("wa_message_log").insert({
    message_id: text(payload.id) || text(info.ID) || null,
    group_id: text(payload.from),
    sender: text(info.PushName) || text(payload.notifyName) || text(payload.participant),
    kind: text(media.mimetype) ? "other" : "text",
    body: text(payload.body).slice(0, 4000),
    status: `skipped_${reason}`,
  }).then(() => undefined, () => undefined);
}

// ---------- 2-5. background work for one message ----------

async function processMessage(event: Json, kind: Kind) {
  const payload = (event.payload ?? {}) as Json;
  const media = (payload.media ?? {}) as Json;
  const info = ((payload._data as Json | undefined)?.Info ?? {}) as Json;
  const groupId = text(payload.from);
  const messageId = text(payload.id) || text(info.ID);
  const sender = text(info.PushName) || text(payload.notifyName) || text(payload.participant);
  const body = text(payload.body);
  const mediaUrl = text(media.url);
  const fileName = text(media.filename);

  // WAHA may retry a webhook: the unique message_id makes the second copy stop here.
  const { data: logRow, error: logError } = await db.from("wa_message_log")
    .insert({ message_id: messageId || null, group_id: groupId, sender, kind, body: body.slice(0, 4000), media_url: mediaUrl || null, file_name: fileName || null })
    .select("id").maybeSingle();
  if (logError) {
    if (logError.code === "23505") return; // already processed
    console.error("log insert failed", logError.message);
  }
  const logId = (logRow?.id as number | undefined) ?? null;

  try {
    const tracked = await waInbox({ action: "track", group_id: groupId, group_name: "" });
    const { data: group } = await db.from("wa_groups").select("name").eq("group_id", groupId).maybeSingle();
    const groupName = text(group?.name) || groupId;
    await logUpdate(logId, { group_name: groupName });
    if (tracked.track === false) return await logUpdate(logId, { status: "group_off" });
    // «وقّف كل الأتمتة» in the admin: the message is kept (text + media link) but not sent to Claude.
    if (await automationPaused()) return await logUpdate(logId, { status: "paused" });

    const header = `WhatsApp group: ${groupName}\nSender: ${sender || "unknown"}\nAttached file: ${fileName || "none"} (${text(media.mimetype) || "none"})\nMessage text:\n${body || "(no text)"}`;
    const content: unknown[] = [{ type: "text", text: header }];
    let seenKey = "";

    if (kind === "image" && mediaUrl) {
      const bytes = await downloadMedia(mediaUrl);
      if (bytes.length > 5_000_000) throw new Error("image_too_large_for_claude");
      content.push({ type: "image", source: { type: "base64", media_type: text(media.mimetype).toLowerCase(), data: base64(bytes) } });
    } else if (kind === "pdf" && mediaUrl) {
      const bytes = await downloadMedia(mediaUrl);
      if (bytes.length > 30_000_000) throw new Error("pdf_too_large_for_claude");
      content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: base64(bytes) } });
    } else if (kind === "sheet" && mediaUrl) {
      seenKey = sheetKey(fileName);
      const { data: seen } = await db.from("wa_sheet_seen").select("last_processed").eq("group_id", groupId).eq("file_key", seenKey).maybeSingle();
      if (seen && Date.now() - new Date(seen.last_processed).getTime() < SHEET_REPEAT_DAYS * 86_400_000) {
        return await logUpdate(logId, { status: "duplicate_sheet", error: `same sheet (${seenKey}) already read on ${seen.last_processed}` });
      }
      const csv = sheetToCsv(await downloadMedia(mediaUrl), fileName);
      if (!csv) throw new Error("sheet_empty");
      content.push({ type: "text", text: `Excel sheet "${fileName}" as CSV:\n\n${csv}` });
    }

    const result = await askClaude(content, kind === "sheet" || body.length > LONG_TEXT);
    const units = Array.isArray(result.units) ? (result.units as Json[]) : [];
    if (seenKey) {
      await db.from("wa_sheet_seen").upsert({ group_id: groupId, file_key: seenKey, group_name: groupName, file_name: fileName, last_processed: new Date().toISOString() });
    }
    if (result.is_inventory !== true || !units.length) {
      return await logUpdate(logId, { status: "not_inventory", units_found: 0, error: text(result.message_note).slice(0, 500) || null });
    }
    const stored = await waInbox({
      action: "intake_batch",
      units_b64: base64(new TextEncoder().encode(JSON.stringify({ units }))),
      source_group: groupName,
      source_group_id: groupId,
      sender,
      message_id: messageId,
      image_url: mediaUrl,
    });
    await logUpdate(logId, { status: "stored", units_found: units.length, units_stored: Number(stored.stored ?? 0) });
  } catch (error) {
    console.error("wa-direct", messageId, error);
    await logUpdate(logId, { status: "error", error: text((error as Error)?.message || error).slice(0, 1000) });
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return reply({ ok: true, service: "wa-direct" });
  try {
    const s = await settings();
    const key = new URL(req.url).searchParams.get("key") || "";
    if (!timingSafeEqual(key, s.wa_inbox_key || "")) return reply({ error: "key_invalid" }, 401);
    const event = ((await req.json().catch(() => ({}))) ?? {}) as Json;
    const check = passesFilter(event);
    if (!check.ok) {
      if (intensive(s) && (check.reason === "short_chat" || check.reason === "voice_video_sticker")) await logSkipped(event, check.reason);
      return reply({ skipped: check.reason });
    }
    // Answer WAHA now; the slow part (download, Claude, intake) keeps running in the background.
    // deno-lint-ignore no-explicit-any
    const runtime = (globalThis as any).EdgeRuntime;
    if (runtime?.waitUntil) runtime.waitUntil(processMessage(event, check.kind));
    else await processMessage(event, check.kind);
    return reply({ accepted: true, kind: check.kind });
  } catch (error) {
    console.error(error);
    return reply({ error: "server_error" }, 500);
  }
});
