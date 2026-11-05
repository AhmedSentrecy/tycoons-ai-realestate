-- WhatsApp projects that are not on the site yet (5 Nov 2026).
--
-- wa-inbox (action research_run) groups the WhatsApp names of one project ("101", "The 101", "Biography 101" …),
-- researches the project on the web (location, area, payment plan, finishing, delivery; each fact
-- from 2 different sites at least) and keeps it here as a draft. Nothing here is on the public site:
-- the admin presses «انشر» in /admin → «وحدات واتساب», which creates the project, its ready units and
-- its article (see wa-inbox "publish_draft").
-- Only the service role (edge functions) can read or write this table.
-- Run once in Supabase → SQL Editor.

begin;

create table if not exists public.wa_project_drafts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- researching -> ready (nothing doubtful) | needs_review (see doubts) -> published | rejected
  status text not null default 'researching' check (status in ('researching', 'ready', 'needs_review', 'published', 'rejected')),
  name text not null,
  name_ar text,
  developer text,
  area_group text,
  sub_area text,
  location text,
  description text,
  down_payment_text text,
  installments_text text,
  delivery_text text,
  finishing text,
  -- WhatsApp spellings of this project (project keys), so later units join the same draft.
  wa_keys text[] not null default '{}',
  -- field -> list of source URLs; doubts: codes shown to the admin (see wa-projects/index.ts)
  sources jsonb not null default '{}'::jsonb,
  doubts text[] not null default '{}',
  -- fields the admin edited or confirmed by hand (no longer need 2 sources)
  confirmed text[] not null default '{}',
  research_error text,
  researched_at timestamptz,
  project_id uuid references public.projects(id) on delete set null,
  published_at timestamptz,
  decided_by uuid references public.admin_users(id)
);
create index if not exists wa_project_drafts_status_idx on public.wa_project_drafts (status, updated_at desc);
create index if not exists wa_project_drafts_keys_idx on public.wa_project_drafts using gin (wa_keys);
alter table public.wa_project_drafts enable row level security;

alter table public.wa_unit_inbox add column if not exists draft_id uuid references public.wa_project_drafts(id) on delete set null;
-- A site project Claude thinks this name means (the admin confirms it, like the rule-based suggestions).
alter table public.wa_unit_inbox add column if not exists suggested_project_id uuid references public.projects(id) on delete set null;
create index if not exists wa_unit_inbox_draft_idx on public.wa_unit_inbox (draft_id) where draft_id is not null;

commit;

-- Every 15 minutes: group the new WhatsApp names and research a few new projects (2 per run).
-- Uses the same wa_inbox_key that wa-direct uses.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;
select cron.unschedule(jobid) from cron.job where jobname = 'wa-projects-research';
select cron.schedule(
  'wa-projects-research',
  '*/15 * * * *',
  $$select net.http_post(
      url := 'https://coqnjymekrkoausiiytm.supabase.co/functions/v1/wa-inbox',
      body := jsonb_build_object('action', 'research_run'),
      headers := jsonb_build_object('Content-Type', 'application/json',
        'x-intake-key', (select value from public.media_admin_settings where key = 'wa_inbox_key')),
      timeout_milliseconds := 5000
  );$$
);
