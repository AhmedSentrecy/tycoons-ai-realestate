-- media-admin: sessions, login throttling, settings. RLS on + no policies = service role only.
create table if not exists public.media_admin_sessions (
  token_hash text primary key,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create table if not exists public.media_admin_login_failures (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists media_admin_login_failures_ip_idx on public.media_admin_login_failures (ip_hash, created_at);
create table if not exists public.media_admin_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table public.media_admin_sessions enable row level security;
alter table public.media_admin_login_failures enable row level security;
alter table public.media_admin_settings enable row level security;
revoke all on public.media_admin_sessions, public.media_admin_login_failures, public.media_admin_settings from anon, authenticated;

create or replace function public.media_admin_storage_usage()
returns table (objects bigint, bytes bigint)
language sql
security definer
set search_path = ''
as $$
  select count(*)::bigint, coalesce(sum((metadata->>'size')::bigint), 0)::bigint
  from storage.objects where bucket_id = 'property-images';
$$;
revoke all on function public.media_admin_storage_usage() from public, anon, authenticated;
grant execute on function public.media_admin_storage_usage() to service_role;
