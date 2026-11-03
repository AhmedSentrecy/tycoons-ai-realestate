-- wa-direct: WAHA -> Supabase directly (no Make)
-- 1) log of every WhatsApp message that passed the light filter (also stops WAHA retries from being processed twice)
create table if not exists public.wa_message_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  message_id text unique,
  group_id text,
  group_name text,
  sender text,
  kind text,              -- text | image | pdf | sheet | other
  body text,
  media_url text,
  file_name text,
  status text not null default 'received',  -- received | group_off | duplicate_sheet | not_inventory | stored | error
  units_found int,
  units_stored int,
  error text
);
create index if not exists wa_message_log_created_idx on public.wa_message_log (created_at desc);
alter table public.wa_message_log enable row level security;

-- 2) one row per group + sheet name (dates/numbers removed); the same sheet is read once every 7 days
create table if not exists public.wa_sheet_seen (
  group_id text not null,
  file_key text not null,
  group_name text,
  file_name text,
  last_processed timestamptz not null default now(),
  primary key (group_id, file_key)
);
alter table public.wa_sheet_seen enable row level security;
