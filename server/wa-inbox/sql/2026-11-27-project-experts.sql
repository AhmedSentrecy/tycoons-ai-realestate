-- Expert card per project (rent, yield, resale, payment plans, developer facts). Supabase is the single source;
-- scripts/sync-project-experts.cjs pulls the active cards into content/project-experts/cards.json at build.
-- `sources` (incl. listing websites) is internal only and never exposed; the public view leaves it out.
create table if not exists public.project_experts (
  project_id uuid primary key references public.projects(id) on delete cascade,
  slug text not null unique,
  card jsonb not null,
  sources jsonb not null default '[]'::jsonb,
  card_version text,
  status text not null default 'active' check (status in ('active','draft','archived')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz
);
alter table public.project_experts enable row level security;  -- service role only; the site reads the view

create or replace view public.project_experts_public as
  select e.project_id, e.slug, e.card_version, e.card - 'sources' as card, e.updated_at
  from public.project_experts e
  where e.status = 'active';
grant select on public.project_experts_public to anon, authenticated;

-- Active, not-ended sales facts for project pages («أسئلة بالأرقام») — no notes, urls or reviewer ids.
create or replace view public.sales_facts_public as
  select f.id, f.category, f.kind, f.project_id, f.project_name, f.developer, f.statement_ar,
         f.source_type, f.source_label, f.source_date, f.valid_until
  from public.sales_facts f
  where f.status = 'active' and (f.valid_until is null or f.valid_until >= (now() at time zone 'Africa/Cairo')::date);
grant select on public.sales_facts_public to anon, authenticated;

-- 2026-11-27: the two cards were moved here from content/project-experts/*.json (commit 29a58ae), identical
-- (card || {sources}) = the original file, checked in SQL.
