-- Page guide orb (public/guide-orb.js + netlify/functions/orb-lines.cjs).
-- Additive only: two new tables and one view. Does not touch units, projects, leads or the Sales War Room.
-- Only the service role (the Netlify function) reads or writes them; the public key has no access.

-- The lines the orb says on a page. One row per page per version of its facts: when the page's
-- facts change (a new offer, new prices), the hash changes and the AI writes new lines once.
create table if not exists public.orb_lines (
  path text not null check (char_length(path) between 1 and 200),
  facts_hash text not null check (facts_hash ~ '^[a-f0-9]{16,64}$'),
  lang text not null check (lang in ('ar', 'en')),
  status text not null default 'pending' check (status in ('pending', 'ready', 'failed')),
  lines jsonb not null default '[]'::jsonb,
  provider text,
  model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (path, facts_hash)
);

create index if not exists orb_lines_updated_at_idx on public.orb_lines (updated_at desc);
alter table public.orb_lines enable row level security;

-- One row per AI call (Claude or OpenAI), with its tokens and cost in US dollars.
create table if not exists public.orb_ai_usage (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  path text not null check (char_length(path) <= 200),
  provider text not null check (provider in ('anthropic', 'openai')),
  model text not null check (char_length(model) <= 80),
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  cost_usd numeric(12, 6) not null default 0 check (cost_usd >= 0),
  ok boolean not null default true,
  lines_kept integer not null default 0,
  lines_dropped integer not null default 0,
  error text check (error is null or char_length(error) <= 300)
);

create index if not exists orb_ai_usage_created_at_idx on public.orb_ai_usage (created_at desc);
alter table public.orb_ai_usage enable row level security;

-- Daily totals (Cairo days): calls, tokens and dollars per provider and model.
create or replace view public.orb_ai_usage_daily
with (security_invoker = true) as
select
  (created_at at time zone 'Africa/Cairo')::date as day,
  provider,
  model,
  count(*) as calls,
  count(*) filter (where not ok) as failed_calls,
  sum(input_tokens) as input_tokens,
  sum(output_tokens) as output_tokens,
  round(sum(cost_usd), 4) as cost_usd,
  sum(lines_kept) as lines_kept,
  sum(lines_dropped) as lines_dropped
from public.orb_ai_usage
group by 1, 2, 3
order by 1 desc, 2, 3;

-- Monthly total, for a quick look in the Supabase SQL editor:
--   select date_trunc('month', day) as month, sum(cost_usd) from public.orb_ai_usage_daily group by 1 order by 1 desc;

revoke all on public.orb_lines, public.orb_ai_usage, public.orb_ai_usage_daily from anon, authenticated;
