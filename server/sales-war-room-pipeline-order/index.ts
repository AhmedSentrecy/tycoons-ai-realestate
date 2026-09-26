import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type,x-agent-token",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};
const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
});
const sha256 = async (text: string) => Array.from(new Uint8Array(await crypto.subtle.digest(
  "SHA-256", new TextEncoder().encode(text),
))).map((byte) => byte.toString(16).padStart(2, "0")).join("");

async function requireAgent(req: Request) {
  const token = req.headers.get("x-agent-token") || "";
  if (!token) return null;
  const { data: session } = await db.from("sales_agent_sessions")
    .select("agent_id,expires_at").eq("token_hash", await sha256(token)).maybeSingle();
  if (!session || new Date(session.expires_at) < new Date()) return null;
  return String(session.agent_id);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "method_not_allowed" }, 405);
  try {
    const agentId = await requireAgent(req);
    if (!agentId) return reply({ error: "unauthorized" }, 401);
    const body = await req.json().catch(() => ({}));
    const orderedIds = Array.isArray(body.ordered_ids)
      ? [...new Set(body.ordered_ids.map((id: unknown) => String(id)))].slice(0, 500)
      : [];
    if (!orderedIds.length || orderedIds.some((id) => !/^[0-9a-f-]{20,40}$/i.test(id)))
      return reply({ error: "invalid_order" }, 400);

    const { data: owned, error: ownedError } = await db.from("sales_pipeline")
      .select("id").eq("agent_id", agentId).in("id", orderedIds);
    if (ownedError) throw ownedError;
    if ((owned || []).length !== orderedIds.length) return reply({ error: "forbidden" }, 403);

    const base = Date.now();
    for (let index = 0; index < orderedIds.length; index++) {
      const { error } = await db.from("sales_pipeline")
        .update({ sort_position: base - index }).eq("id", orderedIds[index]).eq("agent_id", agentId);
      if (error) throw error;
    }
    return reply({ ok: true, ordered_ids: orderedIds });
  } catch (cause) {
    return reply({ error: String((cause as Error).message || cause) }, 500);
  }
});
