-- Tycoons Investments WhatsApp Lead Tracking v1
-- Run this in Supabase SQL Editor once.
-- It creates a click tracking table for WhatsApp buttons.

create table if not exists public.whatsapp_clicks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  tracking_id text,
  source text,
  page_url text,
  page_path text,
  referrer text,
  user_agent text,
  project_name text,
  unit_type text,
  bedrooms_text text,
  starting_price numeric,
  whatsapp_url text,
  utm_source text default 'website',
  utm_medium text default 'whatsapp',
  utm_campaign text default 'tycoons_lead'
);

alter table public.whatsapp_clicks enable row level security;

drop policy if exists "Allow anonymous whatsapp click inserts" on public.whatsapp_clicks;

create policy "Allow anonymous whatsapp click inserts"
on public.whatsapp_clicks
for insert
to anon
with check (true);

create index if not exists whatsapp_clicks_created_at_idx
on public.whatsapp_clicks (created_at desc);

create index if not exists whatsapp_clicks_source_idx
on public.whatsapp_clicks (source);

create index if not exists whatsapp_clicks_page_path_idx
on public.whatsapp_clicks (page_path);
