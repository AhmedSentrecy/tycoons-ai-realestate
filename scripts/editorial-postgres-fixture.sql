\set ON_ERROR_STOP on
create extension if not exists pgcrypto;
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin; exception when duplicate_object then null; end $$;

create table if not exists public.admin_users (
  id uuid primary key,
  name text not null default 'Synthetic reviewer'
);
create table if not exists public.projects (
  id uuid primary key,
  name text not null default 'Synthetic project'
);

insert into public.admin_users(id,name) values
  ('10000000-0000-4000-8000-000000000001','Synthetic owner'),
  ('10000000-0000-4000-8000-000000000002','Synthetic editor')
on conflict (id) do nothing;
insert into public.projects(id,name) values
  ('20000000-0000-4000-8000-000000000001','Synthetic project')
on conflict (id) do nothing;
