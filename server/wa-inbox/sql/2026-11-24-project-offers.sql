-- Offers / new launches / price changes shown on the site (project card badge + a section in the
-- project article), published from the admin tab «تحديثات المشاريع». One live offer per project + kind:
-- publishing a new one of the same kind retires the old one. An offer stays until it is replaced,
-- edited or removed in the admin; when the message gave an end date (valid_until) it hides after it.

create table if not exists public.project_offers (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  project_id uuid not null references public.projects(id) on delete cascade,
  update_id bigint references public.wa_project_updates(id) on delete set null,
  kind text not null check (kind in ('offer','launch','price_change','other')),
  title_ar text not null check (length(title_ar) between 3 and 200),
  body_ar text check (body_ar is null or length(body_ar) <= 1200),
  valid_until date,
  active boolean not null default true,
  created_by uuid
);

create index if not exists project_offers_live on public.project_offers (project_id) where active;

alter table public.project_offers enable row level security;
drop policy if exists "live offers are public" on public.project_offers;
create policy "live offers are public" on public.project_offers for select to anon, authenticated
  using (active and (valid_until is null or valid_until >= current_date));

-- Arabic wording for the site, written by the reader (or the admin) for offer / launch / price change updates.
alter table public.wa_project_updates add column if not exists headline_ar text, add column if not exists summary_ar text;
