-- 2026-11-03: a NEW project (and its units) shows on the public site only after it has a published
-- article. Projects that existed before today stay public (awaiting_article = false); the admin lists
-- the ones without an article so their articles can be written.
alter table public.projects add column if not exists awaiting_article boolean not null default false;
-- Every project added from now on waits for its article (admin, WhatsApp "new project", imports).
alter table public.projects alter column awaiting_article set default true;

-- Publishing an article about the project releases it (and its units) to the site.
create or replace function public.release_project_on_article_publish() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.project_id is not null and new.status = 'published' and new.published_at is not null and new.reviewed_at is not null then
    update public.projects set awaiting_article = false where id = new.project_id and awaiting_article;
  end if;
  return new;
end $$;
drop trigger if exists release_project_on_article_publish on public.editorial_articles;
create trigger release_project_on_article_publish
  after insert or update of status, published_at, reviewed_at on public.editorial_articles
  for each row execute function public.release_project_on_article_publish();

-- The public (anon) key no longer sees a project waiting for its article, nor its units.
-- The admin functions use the service role and still see everything.
drop policy if exists "Public can read projects" on public.projects;
create policy "Public can read projects" on public.projects for select to anon using (not awaiting_article);
-- (security definer: anon cannot see a waiting project, so a plain subquery would never find it.)
create or replace function public.project_waiting_for_article(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select awaiting_article from public.projects where id = pid), false)
$$;
drop policy if exists "Public can read units" on public.units;
create policy "Public can read units" on public.units for select to anon
  using (project_id is null or not public.project_waiting_for_article(project_id));
