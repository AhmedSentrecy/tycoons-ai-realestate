-- AI agent usage counter.
-- Records one row every time an AI agent calls a tool on the public MCP server
-- (https://tycoons-inv.com/mcp) or on the in-page WebMCP tools.
-- Additive only: does not touch units, projects, leads, or Sales War Room data.
-- Same pattern as search_logs / whatsapp_clicks: the public key may INSERT,
-- nobody can read rows with the public key.

create table if not exists public.agent_tool_calls (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  channel text not null check (channel in ('mcp', 'webmcp')),
  tool text not null check (tool ~ '^[a-z0-9_.-]{1,64}$'),
  ok boolean not null default true,
  query text check (query is null or char_length(query) <= 300),
  result_count integer check (result_count is null or result_count between 0 and 1000),
  client text check (client is null or char_length(client) <= 200),
  page_path text check (page_path is null or char_length(page_path) <= 300)
);

create index if not exists agent_tool_calls_created_at_idx
  on public.agent_tool_calls (created_at desc);

alter table public.agent_tool_calls enable row level security;

drop policy if exists "Public can record agent tool calls" on public.agent_tool_calls;
create policy "Public can record agent tool calls"
  on public.agent_tool_calls
  for insert
  to anon
  with check (true);

-- Daily totals per channel and tool, for quick reporting.
create or replace view public.agent_tool_calls_daily
with (security_invoker = true) as
select
  (created_at at time zone 'Africa/Cairo')::date as day,
  channel,
  tool,
  count(*) as calls,
  count(*) filter (where not ok) as failed_calls
from public.agent_tool_calls
group by 1, 2, 3;

revoke all on public.agent_tool_calls_daily from anon, authenticated;
