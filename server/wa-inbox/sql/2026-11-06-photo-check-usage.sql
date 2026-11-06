-- WhatsApp inbox, 6 Nov 2026: what Claude's photo checks cost (tokens per check), shown in the admin
-- next to the «تشييك الصور» switch. Run once in Supabase → SQL Editor. Nothing on the public site changes.

begin;

create table if not exists public.wa_photo_check_usage (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  project_id uuid references public.projects(id) on delete set null,
  status text not null,
  photos integer not null default 0,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0
);

alter table public.wa_photo_check_usage enable row level security;

commit;

select count(*) from public.wa_photo_check_usage;
