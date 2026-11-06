-- WhatsApp inbox, 6 Nov 2026: photos found on the developer's official website for projects with no photos.
-- Claude keeps only photos of the project with no phone number except Tycoons' WhatsApp and no other
-- company's logo or watermark; they are copied to Storage and wait as a suggestion until the admin
-- adds them to the project. Run once in Supabase → SQL Editor. Nothing on the public site changes.

begin;

create table if not exists public.wa_photo_suggestions (
  id bigserial primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  created_at timestamptz not null default now(),
  -- pending = photos wait for the admin; none = nothing usable found; error = the search failed;
  -- approved / rejected = the admin decided.
  status text not null check (status in ('pending', 'none', 'error', 'approved', 'rejected')),
  source_page text,
  urls text[] not null default '{}',
  original_urls text[] not null default '{}',
  reason text,
  firecrawl_credits integer not null default 0,
  decided_at timestamptz,
  decided_by uuid references public.admin_users(id) on delete set null
);

create index if not exists wa_photo_suggestions_project on public.wa_photo_suggestions (project_id, created_at desc);
alter table public.wa_photo_suggestions enable row level security;

commit;

select count(*) from public.wa_photo_suggestions;
