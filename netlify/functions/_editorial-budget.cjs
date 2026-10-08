const DEFAULT_SUPABASE_URL="https://coqnjymekrkoausiiytm.supabase.co";

function createSupabaseEditorialBudget({
  supabaseUrl=process.env.SUPABASE_URL||DEFAULT_SUPABASE_URL,
  serviceRoleKey=process.env.SUPABASE_SERVICE_ROLE_KEY,
  fetchImpl=fetch,
}={}){
  async function rpc(name,payload){
    if(!serviceRoleKey)throw new Error("editorial_budget_service_role_missing");
    const response=await fetchImpl(`${supabaseUrl}/rest/v1/rpc/${name}`,{
      method:"POST",
      headers:{apikey:serviceRoleKey,Authorization:`Bearer ${serviceRoleKey}`,"content-type":"application/json"},
      body:JSON.stringify(payload),
      signal:AbortSignal.timeout(30000),
    });
    const data=await response.json().catch(()=>null);
    if(!response.ok)throw new Error(data?.message||data?.error||`editorial_budget_rpc_${response.status}`);
    if(data!==true)throw new Error(name==="admin_reserve_editorial_budget"?"editorial_budget_exhausted_or_disabled":"editorial_budget_settlement_invalid");
    return true;
  }
  return {
    reserve:({runId,jobId,lockToken,operationKey,amountCents})=>rpc("admin_reserve_editorial_budget",{p_run_id:runId,p_job_id:jobId,p_lock_token:lockToken,p_operation_key:operationKey,p_amount_cents:amountCents}),
    settle:({jobId,operationKey,actualCents,usage={},providerResponseId=null})=>rpc("admin_settle_editorial_budget",{p_job_id:jobId,p_operation_key:operationKey,p_actual_cents:actualCents,p_usage:usage,p_provider_response_id:providerResponseId}),
  };
}

exports.createSupabaseEditorialBudget=createSupabaseEditorialBudget;
