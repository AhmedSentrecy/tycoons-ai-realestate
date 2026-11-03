-- WhatsApp developer-group inbox (3 Nov 2026).
--
-- Make.com reads each unit Claude extracts from a WhatsApp developer group and posts it to the
-- wa-inbox edge function, which stores it here as "pending". Nothing reaches the public site from
-- this table: the admin edits the row in /admin -> "وحدات واتساب" and presses "وافق", which writes
-- the unit to public.units through admin_apply_ops (logged in admin_change_requests).
-- wa_groups is the on/off switch per WhatsApp group (track = false -> Make skips the group).
-- Only the service role (edge functions) can read or write these tables.

create table if not exists public.wa_unit_inbox (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  project_id uuid references public.projects(id) on delete set null,
  project_name text,
  developer text,
  location text,
  unit_type text,
  bedrooms_text text,
  area_sqm numeric,
  starting_price numeric,
  down_payment_text text,
  installments_text text,
  delivery_text text,
  finishing text,
  description text,
  image_url text,
  source_group text,
  source_group_id text,
  sender text,
  message_id text,
  match_unit_id uuid references public.units(id) on delete set null,
  dedupe_key text unique,
  decided_by uuid references public.admin_users(id),
  decided_at timestamptz,
  result_unit_id uuid,
  note text
);
create index if not exists wa_unit_inbox_status_idx on public.wa_unit_inbox (status, created_at desc);
alter table public.wa_unit_inbox enable row level security;

create table if not exists public.wa_groups (
  group_id text primary key,
  name text,
  track boolean not null default true,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  messages integer not null default 0
);
alter table public.wa_groups enable row level security;

-- Shared secret Make sends in the x-intake-key header.
insert into public.media_admin_settings (key, value, updated_at)
select 'wa_inbox_key', encode(extensions.gen_random_bytes(24), 'hex'), now()
where not exists (select 1 from public.media_admin_settings where key = 'wa_inbox_key');
