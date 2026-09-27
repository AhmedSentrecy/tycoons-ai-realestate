import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// sales-war-room-pipeline-v2
// Same behaviour as deployed version 6, plus:
// - expected_value can be edited on PATCH (it was silently ignored before)
// - V3 structured fields: interest_types, areas, closing_keys, budget_min, budget_max,
//   lost_reason, meeting_date, meeting_time, meeting_location
// - When the client sends rules:"v3": Lost needs lost_reason, Meeting Scheduled needs date+time+location.
//   The classic page does not send rules, so it keeps working exactly as before.

const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type,x-agent-token","Access-Control-Allow-Methods":"POST,PATCH,OPTIONS"};
const reply=(data:any,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
const sha256=async(text:string)=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(text)))).map(b=>b.toString(16).padStart(2,"0")).join("");

const INTEREST_TYPES=["Apartment","Duplex","Penthouse","Studio","iVilla","Townhouse","Twin House","Villa","Chalet","Commercial"];
const AREAS=["New Cairo","Mostakbal City","New Capital","Sheikh Zayed","6th of October","North Coast","Ain Sokhna","Other"];
const LOST_REASONS=["Price","Location","Delivery date","Payment plan","Bought elsewhere","Not reachable","Not serious","Other"];
const MEETING_LOCATIONS=["Office","Site","Online","Developer office"];

async function requireAgent(req:Request,slug?:string){const token=req.headers.get("x-agent-token")||"";if(!token)return null;const {data:s}=await db.from("sales_agent_sessions").select("id,agent_id,expires_at,session_type").eq("token_hash",await sha256(token)).maybeSingle();if(!s||new Date(s.expires_at)<new Date())return null;const {data:a}=await db.from("sales_agents").select("id,slug,active").eq("id",s.agent_id).eq("active",true).maybeSingle();if(!a||(slug&&a.slug!==slug))return null;(a as any)._session_type=String(s.session_type||"agent");return a}
async function snapshot(agentId:string){const {data:p}=await db.from("sales_pipeline").select("stage").eq("agent_id",agentId);const rows=p||[];await db.from("sales_pipeline_snapshots").insert({agent_id:agentId,warm_count:rows.filter((x:any)=>x.stage==="Warm").length,hot_count:rows.filter((x:any)=>x.stage==="Hot / Very Potential").length,active_count:rows.filter((x:any)=>!["Won","Lost / Dead"].includes(x.stage)).length})}
const warmValid=(nextAction:any,nextDate:any,trigger:any)=>Boolean(String(nextAction||"").trim()&&(String(nextDate||"").trim()||String(trigger||"").trim()));
const numberOrNull=(v:any)=>{if(v===null||v===undefined||String(v).trim()==="")return null;const n=Number(v);return Number.isFinite(n)&&n>=0?n:NaN};
const actor=(agent:any)=>{const s=String(agent?._session_type||"agent");return {actor_type:s==="manager"?"manager":s==="owner"?"owner":"agent",actor_agent_id:s==="agent"?agent.id:null}}
const same=(a:any,b:any)=>JSON.stringify(a??"")===JSON.stringify(b??"");
async function logActivity(agent:any,pipelineId:string,type:string,extra:any={}){const who=actor(agent);await db.from("sales_pipeline_activity").insert({pipeline_id:pipelineId,agent_id:agent.id,activity_type:type,...who,...extra})}
function cleanPhone(v:any){return String(v||"").replace(/\D/g,"")}
const pickList=(v:any,allowed:string[],max=20)=>Array.isArray(v)?[...new Set(v.map((x:any)=>String(x)).filter((x:string)=>allowed.includes(x)))].slice(0,max):[];
const cleanKeys=(v:any)=>Array.isArray(v)?v.map((x:any)=>String(x||"").trim().slice(0,160)).filter(Boolean).slice(0,2):[];
const oneOf=(v:any,allowed:string[])=>{const s=String(v||"").trim();return allowed.includes(s)?s:null};

// Reads the V3 fields from the request body. Only keys present in the body are returned.
function structuredPatch(b:any){
  const p:any={};
  if("interest_types" in b)p.interest_types=pickList(b.interest_types,INTEREST_TYPES);
  if("areas" in b)p.areas=pickList(b.areas,AREAS);
  if("closing_keys" in b)p.closing_keys=cleanKeys(b.closing_keys);
  if("budget_min" in b){const n=numberOrNull(b.budget_min);if(Number.isNaN(n))return {error:"invalid_budget"};p.budget_min=n}
  if("budget_max" in b){const n=numberOrNull(b.budget_max);if(Number.isNaN(n))return {error:"invalid_budget"};p.budget_max=n}
  if("lost_reason" in b)p.lost_reason=oneOf(b.lost_reason,LOST_REASONS);
  if("meeting_date" in b)p.meeting_date=b.meeting_date||null;
  if("meeting_time" in b)p.meeting_time=b.meeting_time||null;
  if("meeting_location" in b)p.meeting_location=oneOf(b.meeting_location,MEETING_LOCATIONS);
  return {patch:p};
}
// V3 business rules, only when the client asks for them.
function v3RuleError(row:any){
  if(row.stage==="Lost / Dead"&&!row.lost_reason)return "lost_reason_required";
  if(row.stage==="Meeting Scheduled"&&(!row.meeting_date||!row.meeting_time||!row.meeting_location))return "meeting_details_required";
  if(row.budget_min!=null&&row.budget_max!=null&&Number(row.budget_min)>Number(row.budget_max))return "invalid_budget_range";
  return "";
}

Deno.serve(async(req:Request)=>{if(req.method==="OPTIONS")return new Response("ok",{headers:cors});if(!["POST","PATCH"].includes(req.method))return reply({error:"method_not_allowed"},405);try{const b=await req.json();
const v3=b.rules==="v3";
const sp=structuredPatch(b);if((sp as any).error)return reply({error:(sp as any).error},400);const structured=(sp as any).patch;
if(req.method==="POST"){
  const ev=numberOrNull(b.expected_value);if(Number.isNaN(ev))return reply({error:"invalid_expected_value"},400);
  const agent=await requireAgent(req,String(b.slug||""));if(!agent)return reply({error:"unauthorized"},401);
  const stage=b.stage||"New Lead";if(stage==="Warm"&&!warmValid(b.next_action,b.next_action_date,b.next_action_trigger))return reply({error:"warm_requires_next_action"},400);
  if(v3){const err=v3RuleError({stage,...structured});if(err)return reply({error:err},400)}
  const bucket=Math.floor(Date.now()/30000);const submissionKey=await sha256(`${agent.id}|${cleanPhone(b.phone)}|${String(b.client_name||"").trim().toLowerCase()}|${bucket}`);
  const insertRow={agent_id:agent.id,client_name:b.client_name,phone:b.phone||"",budget:b.budget||"",stage,next_action:b.next_action||"",next_action_date:b.next_action_date||null,next_action_time:b.next_action_date?(b.next_action_time||null):null,next_action_trigger:b.next_action_trigger||"",notes:b.notes||"",expected_value:ev,submission_key:submissionKey,...structured};
  const {data,error}=await db.from("sales_pipeline").insert(insertRow).select().single();
  if(error){if(error.code==="23505"){const {data:existing}=await db.from("sales_pipeline").select("*").eq("submission_key",submissionKey).maybeSingle();if(existing)return reply({lead:existing,duplicate:true},200)}return reply({error:error.message},400)}
  const {data:history}=await db.from("sales_pipeline_history").insert({pipeline_id:data.id,agent_id:agent.id,from_stage:null,to_stage:data.stage}).select("id").single();
  await logActivity(agent,data.id,"created",{to_stage:data.stage,metadata:{initial_stage:data.stage}});
  await logActivity(agent,data.id,"stage_change",{from_stage:null,to_stage:data.stage,metadata:{history_id:history?.id||null,initial:true}});
  if(String(b.notes||"").trim())await logActivity(agent,data.id,"feedback",{body:String(b.notes).trim(),metadata:{source:"initial_notes"}});
  if(String(b.next_action||"").trim()||b.next_action_date||String(b.next_action_trigger||"").trim())await logActivity(agent,data.id,"followup_change",{body:String(b.next_action||"").trim(),metadata:{from:null,to:{next_action:b.next_action||"",next_action_date:b.next_action_date||null,next_action_time:b.next_action_date?(b.next_action_time||null):null,next_action_trigger:b.next_action_trigger||""}}});
  await snapshot(agent.id);return reply({lead:data},201)
}
const {data:old}=await db.from("sales_pipeline").select("*").eq("id",b.id).maybeSingle();if(!old)return reply({error:"not_found"},404);
const agent=await requireAgent(req);if(!agent||agent.id!==old.agent_id)return reply({error:"unauthorized"},401);
const stage=b.stage??old.stage;const nextAction=b.next_action??old.next_action;const nextDate=b.next_action_date??old.next_action_date;const trigger=b.next_action_trigger??old.next_action_trigger;
if(stage==="Warm"&&!warmValid(nextAction,nextDate,trigger))return reply({error:"warm_requires_next_action"},400);
const patch:any={updated_at:new Date().toISOString()};for(const k of ["client_name","phone","budget","stage","next_action","next_action_trigger","notes"])if(k in b)patch[k]=b[k]||"";if("next_action_date" in b)patch.next_action_date=b.next_action_date||null;if("next_action_time" in b)patch.next_action_time=b.next_action_time||null;if("next_action_date" in b&&!b.next_action_date)patch.next_action_time=null;
if("expected_value" in b){const ev=numberOrNull(b.expected_value);if(Number.isNaN(ev))return reply({error:"invalid_expected_value"},400);patch.expected_value=ev}
Object.assign(patch,structured);
if(v3){const merged={...old,...patch};const stageChanged=b.stage!==undefined&&b.stage!==old.stage;const err=v3RuleError(stageChanged||"meeting_date" in b||"meeting_time" in b||"meeting_location" in b||"lost_reason" in b?merged:{...merged,stage:""});if(err)return reply({error:err},400)}
const {data,error}=await db.from("sales_pipeline").update(patch).eq("id",b.id).select().single();if(error)return reply({error:error.message},400);
if(b.stage!==undefined&&b.stage!==old.stage){const {data:history}=await db.from("sales_pipeline_history").insert({pipeline_id:b.id,agent_id:old.agent_id,from_stage:old.stage,to_stage:b.stage}).select("id").single();await logActivity(agent,b.id,"stage_change",{from_stage:old.stage,to_stage:b.stage,metadata:{history_id:history?.id||null,lost_reason:b.stage==="Lost / Dead"?data.lost_reason||null:undefined,meeting:b.stage==="Meeting Scheduled"?{date:data.meeting_date,time:data.meeting_time,location:data.meeting_location}:undefined}})}
const followKeys=["next_action","next_action_date","next_action_time","next_action_trigger"];const followChanged=followKeys.some(k=>k in b&&!same((old as any)[k],(data as any)[k]));if(followChanged)await logActivity(agent,b.id,"followup_change",{body:String(data.next_action||"").trim(),metadata:{from:{next_action:old.next_action,next_action_date:old.next_action_date,next_action_time:old.next_action_time,next_action_trigger:old.next_action_trigger},to:{next_action:data.next_action,next_action_date:data.next_action_date,next_action_time:data.next_action_time,next_action_trigger:data.next_action_trigger}}});
if("notes" in b&&!same(old.notes,data.notes)&&String(data.notes||"").trim())await logActivity(agent,b.id,"feedback",{body:String(data.notes).trim(),metadata:{source:"legacy_notes_field"}});
const changedFields=["client_name","phone","budget","expected_value","interest_types","areas","closing_keys","budget_min","budget_max","lost_reason","meeting_date","meeting_time","meeting_location"].filter(k=>k in b&&!same((old as any)[k],(data as any)[k]));if(changedFields.length)await logActivity(agent,b.id,"edit",{metadata:{fields:changedFields}});
await snapshot(old.agent_id);return reply({lead:data})
}catch(e){return reply({error:String((e as any)?.message||e)},500)}});
