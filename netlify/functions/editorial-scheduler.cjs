// Intentionally inert until deployment supplies a dedicated non-human worker
// identity and a platform-authenticated scheduled invocation. Never store or
// reuse a human admin session token for automation.
exports.handler=async()=>({statusCode:503,headers:{"content-type":"application/json"},body:JSON.stringify({enabled:false,error:"editorial_scheduler_worker_identity_not_configured"})});
