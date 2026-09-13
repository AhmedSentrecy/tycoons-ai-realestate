import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const bucket = db.storage.from("voice-recordings");
const origins = new Set(["https://tycoons-inv.com", "https://www.tycoons-inv.com", "https://tycoons-inv.de"]);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const hash = async (v: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v)))).map(v => v.toString(16).padStart(2,"0")).join("");
async function identity(req: Request) {
  const owner = req.headers.get("x-admin-token");
  if (owner) {
    const { data } = await db.from("sales_admin_sessions").select("role,session_type").eq("token_hash",await hash(owner)).gt("expires_at",new Date().toISOString()).maybeSingle();
    if (data?.role === "owner" && data.session_type !== "manager") return { owner: true, agent: "" };
  }
  const token = req.headers.get("x-agent-token");
  if (token) {
    const { data } = await db.from("sales_agent_sessions").select("agent_id").eq("token_hash",await hash(token)).gt("expires_at",new Date().toISOString()).maybeSingle();
    if (data) {
      const { data: agent } = await db.from("sales_agents").select("id").eq("id",data.agent_id).eq("active",true).maybeSingle();
      if (agent) return { owner: false, agent: agent.id };
    }
  }
  return null;
}
Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") || "";
  const headers = {"Content-Type":"application/json", "Cache-Control":"no-store", "Access-Control-Allow-Origin":origins.has(origin)?origin:"https://tycoons-inv.com", "Vary":"Origin", "Access-Control-Allow-Headers":"content-type,x-admin-token,x-agent-token", "Access-Control-Allow-Methods":"GET,POST,PATCH,OPTIONS"};
  const reply = (body: unknown,status=200) => new Response(JSON.stringify(body),{status,headers});
  if (origin && !origins.has(origin)) return reply({error:"origin_not_allowed"},403);
  if (req.method === "OPTIONS") return reply({ok:true});
  try {
    const url = new URL(req.url);
    // Public inbound form, deliberately separate from authenticated listing/playback.
    // Global transaction-locked trial quotas cap anonymous intake and storage exposure.
    if (req.method === "POST" && url.searchParams.get("action") === "submit") {
      if (Number(req.headers.get("content-length") || 0)>8_600_000) return reply({error:"file_too_large"},413);
      const reader = req.body?.getReader();
      if (!reader) return reply({error:"missing_body"},400);
      const chunks: Uint8Array[] = []; let size=0;
      for (;;) { const {done,value}=await reader.read(); if(done) break; size+=value.length; if(size>8_600_000){await reader.cancel();return reply({error:"file_too_large"},413);} chunks.push(value); }
      const form = await new Response(new Blob(chunks),{headers:{"Content-Type":req.headers.get("content-type")||""}}).formData();
      const input = JSON.parse(String(form.get("data")||"{}"));
      const audio = form.get("audio");
      if (!uuid.test(input.id)||typeof input.name!=="string"||!input.name.trim()||input.name.length>100||!/^\+[1-9]\d{7,14}$/.test(input.phone)||input.confirmed!==true||input.website) return reply({error:"invalid_contact"},400);
      if (!Array.isArray(input.transcript)||input.transcript.length>1000||input.transcript.some((r: any)=>!r||!["client","assistant"].includes(r.speaker)||typeof r.text!=="string")||JSON.stringify(input.transcript).length>100000||typeof input.summary!=="string"||input.summary.length>4000) return reply({error:"invalid_summary"},400);
      const ext: Record<string,string> = {"audio/webm":"webm","audio/mp4":"m4a","audio/ogg":"ogg"};
      const mime = audio instanceof File ? audio.type.split(";")[0] : "";
      if (audio && (!(audio instanceof File)||!ext[mime]||audio.size>8388608||audio.size===0)) return reply({error:"invalid_audio"},400);
      const {error} = await db.rpc("reserve_voice_inquiry",{p_id:input.id,p_name:input.name.trim(),p_phone:input.phone,p_summary:input.summary,p_transcript:input.transcript});
      if (error) return reply({error:error.code==="23505"?"already_submitted":"intake_limit_or_error"},error.code==="23505"?409:429);
      let audioPath: string|null = null;
      if (audio instanceof File) {
        const path = `${input.id}/conversation.${ext[mime]}`;
        const {error: uploadError} = await bucket.upload(path,audio,{contentType:mime,upsert:false});
        if (!uploadError) audioPath=path;
      }
      const {error: finishError} = await db.from("voice_inquiries").update({audio_path:audioPath,status:audio&&!audioPath?"audio_failed":"ready"}).eq("id",input.id);
      if (finishError) return reply({error:"finalization_failed"},500);
      return reply({saved:true,audio_saved:Boolean(audioPath)},201);
    }
    const who = await identity(req);
    if (!who) return reply({error:"unauthorized"},401);
    if (req.method === "PATCH") {
      if (!who.owner) return reply({error:"forbidden"},403);
      const b=await req.json();
      if (!uuid.test(b.id)||!uuid.test(b.pipeline_id)) return reply({error:"invalid_id"},400);
      const {data: lead} = await db.from("sales_pipeline").select("id").eq("id",b.pipeline_id).maybeSingle();
      if (!lead) return reply({error:"lead_not_found"},404);
      const {error}=await db.from("voice_inquiries").update({pipeline_id:lead.id}).eq("id",b.id);
      return error?reply({error:"link_failed"},500):reply({linked:true});
    }
    if (req.method !== "GET") return reply({error:"method_not_allowed"},405);
    const pipeline=url.searchParams.get("pipeline_id");
    if (!who.owner) {
      if (!pipeline) return reply({error:"forbidden"},403);
      const {data: lead}=await db.from("sales_pipeline").select("agent_id").eq("id",pipeline).maybeSingle();
      if (lead?.agent_id!==who.agent) return reply({error:"forbidden"},403);
    }
    let q=db.from("voice_inquiries").select("id,name,phone,summary,transcript,pipeline_id,audio_path,status,created_at,expires_at").order("created_at",{ascending:false}).limit(100);
    if (pipeline) q=q.eq("pipeline_id",pipeline);
    const {data,error}=await q;
    if(error) return reply({error:"read_failed"},500);
    const rows=await Promise.all((data||[]).map(async row=>{
      const {audio_path,...safe}=row;
      let audio_url=null;
      if(audio_path&&new Date(row.expires_at)>new Date()) {
        const {data:signed}=await bucket.createSignedUrl(audio_path,300);
        audio_url=signed?.signedUrl||null;
      }
      return {...safe,audio_url};
    }));
    return reply({rows});
  } catch {return reply({error:"request_failed"},400);}
});
