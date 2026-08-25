const API = "https://coqnjymekrkoausiiytm.supabase.co/functions/v1/sales-war-room";
const ADMIN_AGENT_ACCESS_API = "https://coqnjymekrkoausiiytm.supabase.co/functions/v1/sales-war-room-admin-agent-access";

async function requestUrl(url: string, options: RequestInit = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

async function request(path: string, options: RequestInit = {}) {
  return requestUrl(`${API}/${path}`, options);
}

const agentHeaders = (token: string) => ({ "x-agent-token": token });

export const salesWarRoomApi = {
  agentLogin: (slug: string, password: string) => request("agent-login", { method: "POST", body: JSON.stringify({ slug, password }) }),
  getAgent: (slug: string, token: string, date?: string) => request(`agent?slug=${encodeURIComponent(slug)}${date ? `&date=${date}` : ""}`, { headers: agentHeaders(token) }),
  patchScore: (token: string, body: Record<string, unknown>) => request("score", { method: "PATCH", headers: agentHeaders(token), body: JSON.stringify(body) }),
  addLead: (token: string, body: Record<string, unknown>) => request("pipeline", { method: "POST", headers: agentHeaders(token), body: JSON.stringify(body) }),
  updateLead: (token: string, body: Record<string, unknown>) => request("pipeline", { method: "PATCH", headers: agentHeaders(token), body: JSON.stringify(body) }),
  deleteLead: (token: string, id: string) => request(`pipeline?id=${encodeURIComponent(id)}`, { method: "DELETE", headers: agentHeaders(token) }),
  addFollowup: (token: string, body: Record<string, unknown>) => request("followup", { method: "POST", headers: agentHeaders(token), body: JSON.stringify(body) }),
  updateFollowup: (token: string, body: Record<string, unknown>) => request("followup", { method: "PATCH", headers: agentHeaders(token), body: JSON.stringify(body) }),
  adminLogin: (password: string) => request("login", { method: "POST", body: JSON.stringify({ password }) }),
  adminSummary: (token: string, from: string, to: string) => request(`admin-summary?from=${from}&to=${to}`, { headers: { "x-admin-token": token } }),
  adminAgents: (token: string) => request("admin-agents", { headers: { "x-admin-token": token } }),
  addAdminAgent: (token: string, body: Record<string, unknown>) => request("admin-agents", { method: "POST", headers: { "x-admin-token": token }, body: JSON.stringify(body) }),
  adminAgentAccess: (token: string, slug: string) => requestUrl(ADMIN_AGENT_ACCESS_API, {
    method: "POST",
    headers: { "x-admin-token": token },
    body: JSON.stringify({ slug }),
  }),
};
