-- Independent editorial guides. This migration is additive and does not touch
-- projects.article_sections, units, or Sales War Room data.

create table if not exists public.editorial_articles (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'draft' check (status in ('draft', 'published')),
  language text not null default 'ar' check (language in ('ar', 'en')),
  title text not null check (char_length(title) between 5 and 180),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  excerpt text not null default '' check (char_length(excerpt) <= 500),
  body_markdown text not null default '' check (char_length(body_markdown) <= 30000),
  meta_title text not null default '' check (char_length(meta_title) <= 180),
  meta_description text not null default '' check (char_length(meta_description) <= 500),
  target_type text not null check (target_type in ('project', 'area')),
  project_id uuid references public.projects(id) on delete set null,
  area_name text,
  source_refs jsonb not null default '[]'::jsonb check (jsonb_typeof(source_refs) = 'array'),
  revision bigint not null default 1 check (revision > 0),
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  created_by uuid not null references public.admin_users(id) on delete restrict,
  updated_by uuid not null references public.admin_users(id) on delete restrict,
  reviewed_by uuid references public.admin_users(id) on delete set null,
  reviewed_by_name text,
  reviewed_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint editorial_article_target check (
    (target_type = 'project' and project_id is not null and area_name is null)
    or (target_type = 'area' and project_id is null and nullif(btrim(area_name), '') is not null)
  ),
  constraint editorial_article_publish_review check (
    status = 'draft'
    or (published_at is not null and reviewed_at is not null and reviewed_by is not null and nullif(btrim(reviewed_by_name), '') is not null)
  )
);

create index if not exists editorial_articles_status_updated_idx
  on public.editorial_articles (status, updated_at desc);
create index if not exists editorial_articles_project_idx
  on public.editorial_articles (project_id) where project_id is not null;

alter table public.editorial_articles enable row level security;
revoke all on public.editorial_articles from anon, authenticated;

-- Public clients can only read rows that an owner explicitly published.
drop policy if exists "published editorial articles are public" on public.editorial_articles;
create policy "published editorial articles are public"
  on public.editorial_articles for select
  to anon, authenticated
  using (status = 'published' and published_at is not null and reviewed_at is not null);

-- Expose only publication-safe columns; admin UUIDs and drafts remain private.
create or replace view public.published_editorial_articles
with (security_barrier = true, security_invoker = true)
as
select id, 'published'::text as status, language, title, slug, excerpt, body_markdown, meta_title, meta_description,
       target_type, project_id, area_name, source_refs, reviewed_by_name,
       reviewed_at, published_at, updated_at
from public.editorial_articles
where status = 'published' and published_at is not null and reviewed_at is not null;

revoke all on public.editorial_articles from anon, authenticated;
grant select (id, status, language, title, slug, excerpt, body_markdown, meta_title,
  meta_description, target_type, project_id, area_name, source_refs,
  reviewed_by_name, reviewed_at, published_at, updated_at)
  on public.editorial_articles to anon, authenticated;
revoke all on public.published_editorial_articles from public;
revoke all on public.published_editorial_articles from anon, authenticated;
grant select on public.published_editorial_articles to anon, authenticated;

comment on table public.editorial_articles is
  'Independent reviewed guides; deliberately separate from projects.article_sections.';

-- Durable generation idempotency, locks and quota. This table is service-role
-- only; it contains no API key and no generated content is public until saved
-- separately as an editorial draft.
create table if not exists public.article_generation_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.admin_users(id) on delete cascade,
  session_hash text not null check (session_hash ~ '^[a-f0-9]{64}$'),
  idempotency_key text not null check (char_length(idempotency_key) between 16 and 120),
  payload_fingerprint text not null check (payload_fingerprint ~ '^[a-f0-9]{64}$'),
  status text not null check (status in ('in_progress', 'completed', 'failed')),
  lock_token uuid,
  locked_until timestamptz,
  attempts integer not null default 1 check (attempts between 1 and 3),
  response_json jsonb,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  unique (session_hash, idempotency_key)
);
create index if not exists article_generation_user_created_idx
  on public.article_generation_requests (user_id, created_at desc);
create index if not exists article_generation_expiry_idx
  on public.article_generation_requests (expires_at);
alter table public.article_generation_requests enable row level security;
revoke all on public.article_generation_requests from anon, authenticated;

create or replace function public.admin_claim_article_generation(
  p_user_id uuid, p_session_hash text, p_idempotency_key text, p_payload_fingerprint text
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare r public.article_generation_requests; quota_count integer; next_lock uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  delete from public.article_generation_requests where expires_at < now() - interval '1 hour';
  select * into r from public.article_generation_requests
    where session_hash = p_session_hash and idempotency_key = p_idempotency_key for update;
  if found then
    if r.user_id <> p_user_id or r.payload_fingerprint <> p_payload_fingerprint then
      return jsonb_build_object('state','conflict');
    end if;
    if r.status = 'completed' and r.expires_at > now() then
      return jsonb_build_object('state','replay','response',r.response_json);
    end if;
    if r.status = 'in_progress' and r.locked_until > now() then
      return jsonb_build_object('state','busy','retry_after_seconds',greatest(1,ceil(extract(epoch from (r.locked_until-now())))::integer));
    end if;
    if r.attempts >= 3 then return jsonb_build_object('state','exhausted'); end if;
    next_lock := gen_random_uuid();
    update public.article_generation_requests set status='in_progress', lock_token=next_lock,
      locked_until=now()+interval '180 seconds', attempts=attempts+1, updated_at=now(), last_error=null
      where id=r.id;
    return jsonb_build_object('state','claimed','lock_token',next_lock,'attempt',r.attempts+1);
  end if;
  select count(*) into quota_count from public.article_generation_requests
    where user_id=p_user_id and created_at >= now()-interval '10 minutes';
  if quota_count >= 6 then return jsonb_build_object('state','rate_limited'); end if;
  next_lock := gen_random_uuid();
  insert into public.article_generation_requests(user_id,session_hash,idempotency_key,payload_fingerprint,status,lock_token,locked_until)
    values(p_user_id,p_session_hash,p_idempotency_key,p_payload_fingerprint,'in_progress',next_lock,now()+interval '180 seconds');
  return jsonb_build_object('state','claimed','lock_token',next_lock,'attempt',1);
end; $$;

create or replace function public.admin_finish_article_generation(
  p_user_id uuid, p_session_hash text, p_idempotency_key text, p_payload_fingerprint text,
  p_lock_token uuid, p_response jsonb, p_error text default null
) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare affected integer;
begin
  if p_error is null then
    update public.article_generation_requests set status='completed', response_json=p_response,
      lock_token=null, locked_until=null, updated_at=now(), expires_at=now()+interval '15 minutes'
      where user_id=p_user_id and session_hash=p_session_hash and idempotency_key=p_idempotency_key
        and payload_fingerprint=p_payload_fingerprint and lock_token=p_lock_token and status='in_progress';
  else
    update public.article_generation_requests set status='failed', response_json=null,
      last_error=left(p_error,200), lock_token=null, locked_until=null, updated_at=now()
      where user_id=p_user_id and session_hash=p_session_hash and idempotency_key=p_idempotency_key
        and payload_fingerprint=p_payload_fingerprint and lock_token=p_lock_token and status='in_progress';
  end if;
  get diagnostics affected = row_count;
  return affected = 1;
end; $$;

revoke all on function public.admin_claim_article_generation(uuid,text,text,text) from public, anon, authenticated;
revoke all on function public.admin_finish_article_generation(uuid,text,text,text,uuid,jsonb,text) from public, anon, authenticated;
grant execute on function public.admin_claim_article_generation(uuid,text,text,text) to service_role;
grant execute on function public.admin_finish_article_generation(uuid,text,text,text,uuid,jsonb,text) to service_role;
