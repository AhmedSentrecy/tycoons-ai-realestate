// rebuild-gate: stands between the admin panels and the Netlify build hook (28 Oct 2026).
//
// Every Netlify production deploy costs credits. tycoons-admin used to deploy the whole
// site after each content edit (developer text, research FAQ, project delete), at most
// 3 minutes apart, and that used the month's allowance: 194 deploys = 2,910 of 3,000 credits.
//
// media_admin_settings.netlify_build_hook now points here (…/functions/v1/rebuild-gate/<secret>)
// and the real Netlify hook lives in netlify_build_hook_real.
//   - "Admin update" / "Media admin update" (the owner pressing "حدّث الموقع"): forwarded to
//     Netlify right away, so urgent fixes still go live in minutes.
//   - anything else (automatic rebuilds after an edit): only marks the site as changed and
//     answers 409, so the caller reports "not rebuilt now". public.site_daily_rebuild()
//     (pg_cron, 02:00 UTC) deploys once a day when something changed.
import { createClient } from "npm:@supabase/supabase-js@2";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const MANUAL = new Set(["Admin update", "Media admin update"]);

async function getSetting(key: string) {
  const { data } = await db.from("media_admin_settings").select("value").eq("key", key).maybeSingle();
  return (data?.value as string | undefined) || "";
}

async function setSetting(key: string, value: string) {
  await db.from("media_admin_settings").upsert({ key, value, updated_at: new Date().toISOString() });
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const secret = url.pathname.split("/").filter(Boolean).pop() || "";
  const expected = await getSetting("rebuild_gate_secret");
  if (req.method !== "POST" || !expected || secret !== expected) return json({ error: "not_found" }, 404);

  const title = url.searchParams.get("trigger_title") || "";
  if (!MANUAL.has(title)) {
    if (!(await getSetting("rebuild_pending_since"))) await setSetting("rebuild_pending_since", new Date().toISOString());
    return json({ queued_for_daily_update: true }, 409);
  }

  const hook = await getSetting("netlify_build_hook_real");
  if (!/^https:\/\/api\.netlify\.com\/build_hooks\/[a-zA-Z0-9]{10,}$/.test(hook)) return json({ error: "build_hook_missing" }, 502);
  const response = await fetch(`${hook}?trigger_title=${encodeURIComponent(title)}`, { method: "POST" });
  if (!response.ok) return json({ error: "build_hook_failed" }, 502);
  // this deploy carries every change so far
  await db.from("media_admin_settings").delete().eq("key", "rebuild_pending_since");
  await setSetting("last_site_deploy_at", new Date().toISOString());
  return json({ deployed: true }, 200);
});
