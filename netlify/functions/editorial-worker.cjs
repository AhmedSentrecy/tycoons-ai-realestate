const { OpenAIEditorialProvider } = require("./_editorial-provider.cjs");
const { validateProviderResult } = require("./_editorial-workflow.cjs");
const { createSupabaseEditorialBudget } = require("./_editorial-budget.cjs");

const ADMIN_URL=(process.env.SUPABASE_URL||"https://coqnjymekrkoausiiytm.supabase.co")+"/functions/v1/tycoons-admin";
const PUBLIC_KEY=process.env.VITE_SUPABASE_PUBLISHABLE_KEY||process.env.SUPABASE_PUBLISHABLE_KEY||"sb_publishable_6VFTijqKQB6RD7nIsSj_JQ_eEdoibGg";
async function defaultAdminCall(token,action,payload={}){const response=await fetch(ADMIN_URL,{method:"POST",headers:{"content-type":"application/json",apikey:PUBLIC_KEY,"x-admin-token":token},body:JSON.stringify({action,...payload}),signal:AbortSignal.timeout(30000)});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||`admin_${response.status}`);return data;}

async function runEditorialJob({jobId,token,provider=new OpenAIEditorialProvider(),adminCall=defaultAdminCall,budget=createSupabaseEditorialBudget(),enabled=process.env.EDITORIAL_WORKER_ENABLED==="true"}){
  if(!enabled) throw Object.assign(new Error("editorial_worker_disabled"),{status:503});
  const claim=await adminCall(token,"editorial_job_claim",{id:jobId});
  if(claim.state!=="claimed") throw Object.assign(new Error(`editorial_${claim.state||"claim_failed"}`),{status:409});
  const lockToken=claim.lock_token; const job=claim.job;
  const operationKey=`${jobId}:attempt:${claim.attempt}:responses`; let reserved=false; let settlementRecorded=false; let actualCost=null; let providerUsage={}; let providerResponseId=null;
  try{
    if(provider.kind==="openai"){
      if(process.env.EDITORIAL_PAID_ENABLED!=="true")throw new Error("editorial_paid_execution_disabled");
      await budget.reserve({runId:job.run_id,jobId,lockToken,operationKey,amountCents:Number(process.env.EDITORIAL_RESERVATION_CENTS||150)});reserved=true;
    }
    const generated=await provider.generate(job);
    actualCost=Number(generated.cost_used_cents||0);
    providerUsage=generated.usage||{}; providerResponseId=generated.response_id||null;
    if(reserved){await budget.settle({jobId,operationKey,actualCents:actualCost,usage:providerUsage,providerResponseId});settlementRecorded=true;}
    const checked=validateProviderResult(generated.output);
    const completed=await adminCall(token,"editorial_job_complete",{id:jobId,lock_token:lockToken,...checked,usage:generated.usage||{},cost_used_cents:actualCost,provider_response_id:generated.response_id||null});
    if(completed.state!=="completed")throw new Error(`editorial_completion_${completed.state||"failed"}`);
    return completed;
  }catch(error){const knownCost=actualCost??(Number.isFinite(Number(error?.cost_used_cents))?Number(error.cost_used_cents):null);if(reserved&&!settlementRecorded&&knownCost!==null)await budget.settle({jobId,operationKey,actualCents:knownCost,usage:Object.keys(providerUsage).length?providerUsage:(error?.usage||{}),providerResponseId:providerResponseId||error?.response_id||null}).catch(()=>undefined);await adminCall(token,"editorial_job_fail",{id:jobId,lock_token:lockToken,error:String(error?.message||"worker_failed")}).catch(()=>undefined);throw error;}
}

exports.handler=async(event)=>{if(event.httpMethod!=="POST")return{statusCode:405,body:JSON.stringify({error:"method_not_allowed"})};const token=String(event.headers?.["x-admin-token"]||"");let body={};try{body=JSON.parse(event.body||"{}");const result=await runEditorialJob({jobId:String(body.id||""),token});return{statusCode:200,headers:{"content-type":"application/json"},body:JSON.stringify(result)};}catch(error){return{statusCode:Number(error?.status)||500,headers:{"content-type":"application/json"},body:JSON.stringify({error:String(error?.message||"worker_failed")})};}};
exports.runEditorialJob=runEditorialJob;
