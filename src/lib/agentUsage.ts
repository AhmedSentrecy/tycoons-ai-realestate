// Records AI agent tool calls (MCP server + WebMCP) into Supabase
// table public.agent_tool_calls. Insert-only with the public key, fire-and-forget:
// a logging failure never breaks or slows down the tool itself.

const viteEnv =
  (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};
const nodeEnv: Record<string, string | undefined> =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};

const SUPABASE_URL =
  viteEnv.VITE_SUPABASE_URL ||
  nodeEnv.SUPABASE_URL ||
  "https://coqnjymekrkoausiiytm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  viteEnv.VITE_SUPABASE_PUBLISHABLE_KEY ||
  nodeEnv.VITE_SUPABASE_PUBLISHABLE_KEY ||
  nodeEnv.SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_6VFTijqKQB6RD7nIsSj_JQ_eEdoibGg";

const LOG_TIMEOUT_MS = 2500;

export type AgentChannel = "mcp" | "webmcp";

export interface AgentToolCall {
  channel: AgentChannel;
  tool: string;
  ok: boolean;
  query?: unknown;
  resultCount?: unknown;
  client?: unknown;
  pagePath?: unknown;
}

function clip(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

export function agentToolCallRow(call: AgentToolCall) {
  const tool = String(call.tool || "").toLowerCase().slice(0, 64);
  const count = Number(call.resultCount);
  return {
    channel: call.channel === "webmcp" ? "webmcp" : "mcp",
    tool: /^[a-z0-9_.-]{1,64}$/.test(tool) ? tool : "unknown",
    ok: call.ok !== false,
    query: clip(call.query, 300),
    result_count:
      Number.isInteger(count) && count >= 0 && count <= 1000 ? count : null,
    client: clip(call.client, 200),
    page_path: clip(call.pagePath, 300),
  };
}

/** Sends one usage row. Never throws, never waits longer than LOG_TIMEOUT_MS. */
export async function recordAgentToolCall(
  call: AgentToolCall,
  fetcher: typeof fetch = fetch,
): Promise<boolean> {
  try {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), LOG_TIMEOUT_MS) : null;
    try {
      const response = await fetcher(`${SUPABASE_URL}/rest/v1/agent_tool_calls`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify(agentToolCallRow(call)),
        keepalive: true,
        signal: controller?.signal,
      });
      return response.ok;
    } finally {
      if (timer) clearTimeout(timer);
    }
  } catch {
    return false;
  }
}

/** Counts results in a tool's returned object, when it has a list of them. */
export function agentResultCount(result: unknown): number | null {
  if (!result || typeof result !== "object") return null;
  const record = result as Record<string, unknown>;
  for (const key of ["results", "comparison"]) {
    if (Array.isArray(record[key])) return (record[key] as unknown[]).length;
  }
  if (record.property) return 1;
  return null;
}
