-- WhatsApp inbox, 6 Nov 2026: Claude checks each project's photos before its ready units go on the site
-- by themselves (the photos belong to this project, and show no phone number except Tycoons' WhatsApp).
-- One row per project; checked again by itself when the project's photos change.
-- Run once in Supabase → SQL Editor. Nothing on the public site changes.

begin;

create table if not exists public.wa_photo_checks (
  project_id uuid primary key references public.projects(id) on delete cascade,
  -- The photos that were checked (cover + gallery, in order): a new photo means a new check.
  photos_key text not null,
  -- ok = Claude found nothing wrong; mismatch = not this project; phone = another phone number on a photo;
  -- confirmed = the admin pressed «الصور صح»; error = the check could not run (tried again later).
  status text not null check (status in ('ok', 'mismatch', 'phone', 'confirmed', 'error')),
  reason text,
  bad_urls text[] not null default '{}',
  checked_at timestamptz not null default now(),
  confirmed_by uuid references public.admin_users(id) on delete set null
);

alter table public.wa_photo_checks enable row level security;

commit;

-- Check: empty at first; rows appear as the automatic approval runs.
select count(*) from public.wa_photo_checks;
