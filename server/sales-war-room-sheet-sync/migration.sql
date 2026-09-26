-- Apply once to the Tycoons Supabase project before deploying the sync function.
alter table public.sales_pipeline
  add column if not exists crm_lead_id text;

create unique index if not exists sales_pipeline_crm_lead_id_unique
  on public.sales_pipeline (crm_lead_id)
  where crm_lead_id is not null;

alter table public.sales_pipeline_activity
  add column if not exists external_feedback_key text;

create unique index if not exists sales_pipeline_activity_external_feedback_key_unique
  on public.sales_pipeline_activity (external_feedback_key)
  where external_feedback_key is not null;

create table if not exists public.sales_war_room_sync_keys (
  name text primary key,
  token_sha256 text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.sales_war_room_sync_keys enable row level security;
revoke all on public.sales_war_room_sync_keys from anon, authenticated;
