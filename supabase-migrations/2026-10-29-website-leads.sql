-- Website leads (29 Oct 2026).
--
-- Before a visitor opens WhatsApp from tycoons-inv.com, a small form asks for their name and
-- mobile number. The lead is stored first (this table), then pushed
-- to 8X CRM by the website-lead edge function, so a CRM outage never loses a lead.
--
-- Only the edge function (service role) reads or writes this table: RLS is on with no policies,
-- so the public key can neither insert nor read rows directly.

create table if not exists public.website_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text not null check (char_length(full_name) between 2 and 80),
  phone text not null check (phone ~ '^\+?[0-9]{8,15}$'),
  tracking_id text check (char_length(tracking_id) <= 40),
  page_path text check (char_length(page_path) <= 300),
  page_url text check (char_length(page_url) <= 500),
  project_slug text check (char_length(project_slug) <= 160),
  project_name text check (char_length(project_name) <= 160),
  unit_path text check (char_length(unit_path) <= 300),
  button_label text check (char_length(button_label) <= 120),
  placement text check (char_length(placement) <= 60),
  lang text check (char_length(lang) <= 10),
  device text check (char_length(device) <= 20),
  traffic_source text check (char_length(traffic_source) <= 40),
  referrer text check (char_length(referrer) <= 200),
  landing_path text check (char_length(landing_path) <= 300),
  utm_source text check (char_length(utm_source) <= 60),
  utm_medium text check (char_length(utm_medium) <= 60),
  utm_campaign text check (char_length(utm_campaign) <= 120),
  -- 8X CRM delivery
  crm_status text not null default 'pending' check (crm_status in ('pending', 'sent', 'failed', 'duplicate')),
  crm_attempts integer not null default 0,
  crm_last_error text check (char_length(crm_last_error) <= 500),
  crm_sent_at timestamptz
);

create index if not exists website_leads_created_at_idx on public.website_leads (created_at desc);
create index if not exists website_leads_phone_idx on public.website_leads (phone, created_at desc);
create index if not exists website_leads_pending_idx on public.website_leads (crm_status) where crm_status in ('pending', 'failed');

alter table public.website_leads enable row level security;
revoke all on public.website_leads from anon, authenticated;

-- Retry anything the CRM did not accept (every 15 minutes, up to 8 attempts per lead).
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

insert into public.media_admin_settings (key, value, updated_at)
values ('website_lead_retry_secret', encode(extensions.gen_random_bytes(18), 'hex'), now())
on conflict (key) do nothing;

create or replace function public.website_leads_retry()
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  secret text;
begin
  if not exists (select 1 from public.website_leads where crm_status in ('pending', 'failed') and crm_attempts < 8 and created_at < now() - interval '2 minutes') then
    return 'nothing_to_retry';
  end if;
  select value into secret from public.media_admin_settings where key = 'website_lead_retry_secret';
  perform net.http_post(
    url := 'https://coqnjymekrkoausiiytm.supabase.co/functions/v1/website-lead',
    body := jsonb_build_object('action', 'retry', 'secret', secret),
    headers := jsonb_build_object('Content-Type', 'application/json')
  );
  return 'retry_requested';
end;
$$;

revoke all on function public.website_leads_retry() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'website-leads-retry';
select cron.schedule('website-leads-retry', '*/15 * * * *', 'select public.website_leads_retry();');
