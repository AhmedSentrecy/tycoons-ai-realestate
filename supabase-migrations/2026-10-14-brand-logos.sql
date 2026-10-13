-- Brand logos: one place for developer and project logos, so they are data, not code.
-- Applied to production on 2026-10-14.
-- Files live in the public `brand-logos` bucket:
--   developers/{developer_slug}.{svg|png|webp}
--   projects/{project_slug}.{svg|png|webp}
-- Pages show the project logo, and fall back to the developer logo.

create table if not exists public.developers (
  slug text primary key check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null,
  name_ar text,
  aliases text[] not null default '{}',
  parent_slug text references public.developers(slug) on delete set null,
  website text check (website is null or website ~ '^https://'),
  logo_path text,
  logo_source_url text check (logo_source_url is null or logo_source_url ~ '^https://'),
  logo_status text not null default 'missing'
    check (logo_status in ('official_verified', 'probable', 'missing')),
  logo_on_dark boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Public read only: RLS has no insert/update/delete policy, so only the service role writes.
alter table public.developers enable row level security;
create policy "developers are public" on public.developers
  for select to anon, authenticated using (true);
grant select on public.developers to anon, authenticated;

alter table public.projects
  add column if not exists logo_path text,
  add column if not exists logo_source_url text,
  add column if not exists logo_status text not null default 'developer_fallback',
  add column if not exists logo_on_dark boolean not null default false;
alter table public.projects add constraint projects_logo_status_check
  check (logo_status in ('official_verified', 'probable', 'developer_fallback'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('brand-logos', 'brand-logos', true, 1048576,
        array['image/svg+xml', 'image/png', 'image/webp', 'image/jpeg'])
on conflict (id) do nothing;
create policy "brand logos are public" on storage.objects
  for select to anon, authenticated using (bucket_id = 'brand-logos');

-- Seed: the seven focus developers (plus Founders, a Hyde Park subsidiary).
insert into public.developers (slug, name, name_ar, aliases, website) values
 ('mountain-view','Mountain View','ماونتن فيو', array['Mountain View','MV'], 'https://www.mountainviewegypt.com'),
 ('ora-developers','Ora Developers','أورا للتطوير العقاري', array['Ora','ORA','Ora Developers'], 'https://www.oradevelopers.com'),
 ('sodic','SODIC','سوديك', array['SODIC','Sodic'], 'https://www.sodic.com'),
 ('palm-hills-developments','Palm Hills Developments','بالم هيلز', array['Palm Hills','Palm Hills Developments','PHD'], 'https://www.palmhillsdevelopments.com'),
 ('hyde-park-developments','Hyde Park Developments','هايد بارك', array['Hyde Park','Hyde park','Hydepark Developments','Hyde Park Developments'], 'https://www.hydeparkdevelopments.com'),
 ('madinet-masr','Madinet Masr','مدينة مصر', array['Madinet Masr','Madinet Nasr','MNHD','Madinet Nasr for Housing and Development'], 'https://madinetmasr.com'),
 ('la-vista-developments','La Vista Developments','لافيستا', array['La Vista','La Vista Developments','Lavista'], 'https://lavista.com.eg')
on conflict (slug) do nothing;
insert into public.developers (slug, name, name_ar, aliases, parent_slug) values
 ('founders-by-hyde-park','Founders','فاوندرز', array['Founders by Hyde Park','Founders'], 'hyde-park-developments')
on conflict (slug) do nothing;
