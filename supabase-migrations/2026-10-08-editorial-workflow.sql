-- Durable editorial workflow. Additive only; scheduled/paid execution remains disabled.
create table if not exists public.editorial_workflow_config (
  id boolean primary key default true check (id),
  workflow_version text not null default 'v1',
  timezone text not null default 'Africa/Cairo',
  proposed_weekday text not null default 'MONDAY',
  proposed_local_time time not null default '09:00',
  schedule_enabled boolean not null default false,
  monthly_budget_cents integer not null default 5000 check (monthly_budget_cents between 0 and 5000),
  max_attempts_per_job integer not null default 3 check (max_attempts_per_job between 1 and 3),
  max_parallel_jobs integer not null default 1 check (max_parallel_jobs between 1 and 2),
  updated_at timestamptz not null default now()
);
insert into public.editorial_workflow_config(id) values (true) on conflict (id) do nothing;

create table if not exists public.editorial_runs (
  id uuid primary key default gen_random_uuid(),
  trigger_type text not null check (trigger_type in ('manual','weekly','dry_run')),
  status text not null default 'queued' check (status in ('queued','running','completed','partial','failed')),
  workflow_version text not null,
  scheduled_for timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  lock_token uuid,
  locked_until timestamptz,
  cost_reserved_cents integer not null default 0 check (cost_reserved_cents >= 0),
  cost_used_cents integer not null default 0 check (cost_used_cents >= 0),
  summary jsonb not null default '{}'::jsonb,
  created_by uuid not null references public.admin_users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.editorial_jobs (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.editorial_runs(id) on delete set null,
  idempotency_key text not null unique,
  content_type text not null check (content_type in ('developer','project','phase','comparison','guide')),
  primary_entity_id text,
  secondary_entity_id text,
  area_name text,
  topic text not null,
  source_input text,
  status text not null default 'discovered' check (status in ('discovered','verifying','verified','drafting','validating','ready_auto','publishing','published','needs_review','paused','rejected','rolled_back','retry_wait','failed')),
  current_step text not null default 'queued',
  attempts integer not null default 0 check (attempts between 0 and 3),
  revision bigint not null default 1 check (revision > 0),
  lock_token uuid,
  locked_until timestamptz,
  provider_response_id text,
  evidence jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence)='array'),
  claim_evidence jsonb not null default '[]'::jsonb check (jsonb_typeof(claim_evidence)='array'),
  validation_results jsonb not null default '[]'::jsonb check (jsonb_typeof(validation_results)='array'),
  exceptions jsonb not null default '[]'::jsonb check (jsonb_typeof(exceptions)='array'),
  draft_ar jsonb,
  draft_en jsonb,
  translation_group_id uuid not null default gen_random_uuid(),
  cost_reserved_cents integer not null default 0 check (cost_reserved_cents >= 0),
  cost_used_cents integer not null default 0 check (cost_used_cents >= 0),
  usage jsonb not null default '{}'::jsonb,
  last_error text,
  next_retry_at timestamptz,
  auto_publish_eligible boolean not null default false,
  review_kind text check (review_kind is null or review_kind in ('human','automated_validation')),
  reviewed_by uuid references public.admin_users(id) on delete set null,
  reviewed_at timestamptz,
  published_article_ids uuid[] not null default '{}',
  previous_version jsonb,
  created_by uuid not null references public.admin_users(id) on delete restrict,
  updated_by uuid not null references public.admin_users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists editorial_jobs_status_updated_idx on public.editorial_jobs(status, updated_at desc);
create index if not exists editorial_jobs_run_idx on public.editorial_jobs(run_id);

create table if not exists public.editorial_budget_ledger (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.editorial_runs(id) on delete set null,
  job_id uuid references public.editorial_jobs(id) on delete set null,
  kind text not null check (kind in ('reservation','usage','release','adjustment')),
  billing_month date not null default date_trunc('month',now())::date,
  operation_key text not null,
  amount_cents integer not null check (amount_cents >= 0),
  usage jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
  ,unique(operation_key,kind)
);
create index if not exists editorial_budget_month_idx on public.editorial_budget_ledger(created_at);

create table if not exists public.editorial_job_events (
  id bigint generated always as identity primary key,job_id uuid not null references public.editorial_jobs(id) on delete cascade,
  actor_id uuid references public.admin_users(id) on delete set null,event_type text not null,from_status text,to_status text,
  details jsonb not null default '{}'::jsonb,created_at timestamptz not null default now()
);
create table if not exists public.editorial_job_versions (
  id uuid primary key default gen_random_uuid(),job_id uuid not null references public.editorial_jobs(id) on delete cascade,
  version_number bigint not null,draft_ar jsonb not null,draft_en jsonb not null,evidence jsonb not null,claim_evidence jsonb not null,
  created_by uuid references public.admin_users(id) on delete set null,created_at timestamptz not null default now(),unique(job_id,version_number)
);
create table if not exists public.editorial_trusted_entities (
  id uuid primary key default gen_random_uuid(),entity_type text not null check(entity_type in ('developer','project','phase','area')),
  source_entity_id text not null,revision bigint not null default 1,public_facts jsonb not null,provenance jsonb not null,
  verified_by uuid not null references public.admin_users(id) on delete restrict,verified_at timestamptz not null,fresh_until timestamptz,
  unique(entity_type,source_entity_id,revision)
);
create table if not exists public.editorial_trusted_evidence (
  id uuid primary key default gen_random_uuid(),entity_id uuid references public.editorial_trusted_entities(id) on delete cascade,
  evidence_type text not null,claim_key text not null,claim_value jsonb not null,source_url text not null,source_revision text,
  provenance jsonb not null,rights_status text check(rights_status is null or rights_status in ('owned','licensed','authorized','forbidden','unknown')),
  verified_by uuid not null references public.admin_users(id) on delete restrict,verified_at timestamptz not null,fresh_until timestamptz,revision bigint not null default 1,
  unique(entity_id,claim_key,revision)
);

alter table public.editorial_workflow_config enable row level security;
alter table public.editorial_runs enable row level security;
alter table public.editorial_jobs enable row level security;
alter table public.editorial_budget_ledger enable row level security;
alter table public.editorial_job_events enable row level security;
alter table public.editorial_job_versions enable row level security;
alter table public.editorial_trusted_entities enable row level security;
alter table public.editorial_trusted_evidence enable row level security;
revoke all on public.editorial_workflow_config, public.editorial_runs, public.editorial_jobs, public.editorial_budget_ledger, public.editorial_job_events, public.editorial_job_versions, public.editorial_trusted_entities, public.editorial_trusted_evidence from public, anon, authenticated;

create or replace function public.admin_reserve_editorial_budget(p_run_id uuid, p_job_id uuid, p_lock_token uuid, p_operation_key text, p_amount_cents integer)
returns boolean language plpgsql security definer set search_path=''
as $$
declare ceiling integer; spent integer; month_start date:=date_trunc('month',now())::date; existing integer;
begin
  if p_amount_cents < 0 then return false; end if;
  if not exists(select 1 from public.editorial_jobs where id=p_job_id and run_id=p_run_id and lock_token=p_lock_token and status='verifying' and locked_until>now()) then return false; end if;
  perform pg_advisory_xact_lock(hashtextextended(month_start::text,0));
  select amount_cents into existing from public.editorial_budget_ledger where operation_key=p_operation_key and kind='reservation';
  if found then return existing=p_amount_cents; end if;
  select monthly_budget_cents into ceiling from public.editorial_workflow_config where id=true;
  if ceiling is null or ceiling<=0 then return false; end if;
  select coalesce(sum(case when kind in ('reservation','usage','adjustment') then amount_cents else -amount_cents end),0)
    into spent from public.editorial_budget_ledger where billing_month=month_start;
  if spent + p_amount_cents > ceiling then return false; end if;
  insert into public.editorial_budget_ledger(run_id,job_id,kind,billing_month,operation_key,amount_cents) values(p_run_id,p_job_id,'reservation',month_start,p_operation_key,p_amount_cents);
  update public.editorial_jobs set cost_reserved_cents=cost_reserved_cents+p_amount_cents,updated_at=now() where id=p_job_id;
  return true;
end $$;
revoke all on function public.admin_reserve_editorial_budget(uuid,uuid,uuid,text,integer) from public, anon, authenticated;
grant execute on function public.admin_reserve_editorial_budget(uuid,uuid,uuid,text,integer) to service_role;

create or replace function public.admin_settle_editorial_budget(p_job_id uuid,p_operation_key text,p_actual_cents integer,p_usage jsonb,p_provider_response_id text)
returns boolean language plpgsql security definer set search_path=''
as $$
declare reserved integer; month_start date; target_run uuid; existing_actual integer;
begin
  if p_actual_cents<0 then return false; end if;
  -- Financial truth is anchored to the prior reservation, not to a lease that
  -- may expire while the provider is running. Known spend must still be recorded.
  select amount_cents,billing_month,run_id into reserved,month_start,target_run from public.editorial_budget_ledger
    where job_id=p_job_id and operation_key=p_operation_key and kind='reservation' for update;
  if not found then return false; end if;
  select amount_cents into existing_actual from public.editorial_budget_ledger where operation_key=p_operation_key and kind='usage';
  if found then return existing_actual=p_actual_cents; end if;
  insert into public.editorial_budget_ledger(run_id,job_id,kind,billing_month,operation_key,amount_cents)
    values(target_run,p_job_id,'release',month_start,p_operation_key,reserved) on conflict(operation_key,kind) do nothing;
  insert into public.editorial_budget_ledger(run_id,job_id,kind,billing_month,operation_key,amount_cents)
    values(target_run,p_job_id,'usage',month_start,p_operation_key,p_actual_cents);
  update public.editorial_jobs set cost_reserved_cents=greatest(0,cost_reserved_cents-reserved),cost_used_cents=cost_used_cents+p_actual_cents,
    usage=coalesce(p_usage,'{}'::jsonb),provider_response_id=nullif(left(p_provider_response_id,200),''),updated_at=now() where id=p_job_id;
  return true;
end $$;
revoke all on function public.admin_settle_editorial_budget(uuid,text,integer,jsonb,text) from public, anon, authenticated;
grant execute on function public.admin_settle_editorial_budget(uuid,text,integer,jsonb,text) to service_role;

create or replace function public.admin_create_editorial_job(
  p_user_id uuid,p_idempotency_key text,p_content_type text,p_primary_entity_id text,p_secondary_entity_id text,p_area_name text,p_topic text,p_source_input text
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare existing_id uuid; next_run uuid; next_job public.editorial_jobs; workflow text;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key,0));
  select id into existing_id from public.editorial_jobs where idempotency_key=p_idempotency_key;
  if found then return jsonb_build_object('state','duplicate','job_id',existing_id); end if;
  select workflow_version into workflow from public.editorial_workflow_config where id=true;
  insert into public.editorial_runs(trigger_type,status,workflow_version,created_by) values('manual','queued',workflow,p_user_id) returning id into next_run;
  insert into public.editorial_jobs(run_id,idempotency_key,content_type,primary_entity_id,secondary_entity_id,area_name,topic,source_input,created_by,updated_by)
    values(next_run,p_idempotency_key,p_content_type,p_primary_entity_id,p_secondary_entity_id,p_area_name,p_topic,p_source_input,p_user_id,p_user_id) returning * into next_job;
  return jsonb_build_object('state','created','job',to_jsonb(next_job),'run_id',next_run);
end $$;
revoke all on function public.admin_create_editorial_job(uuid,text,text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.admin_create_editorial_job(uuid,text,text,text,text,text,text,text) to service_role;

create or replace function public.admin_retry_editorial_job(p_job_id uuid,p_user_id uuid,p_expected_status text,p_expected_revision bigint)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare j public.editorial_jobs; max_attempts integer;
begin
  select max_attempts_per_job into max_attempts from public.editorial_workflow_config where id=true;
  update public.editorial_jobs set status='retry_wait',current_step='queued_for_safe_retry',next_retry_at=now(),last_error=null,
    revision=revision+1,updated_by=p_user_id,updated_at=now()
    where id=p_job_id and status=p_expected_status and revision=p_expected_revision and status in ('retry_wait','failed','needs_review') and attempts<max_attempts
    returning * into j;
  if not found then return jsonb_build_object('state','stale_or_not_retryable'); end if;
  return jsonb_build_object('state','queued','job',to_jsonb(j));
end $$;
revoke all on function public.admin_retry_editorial_job(uuid,uuid,text,bigint) from public, anon, authenticated;
grant execute on function public.admin_retry_editorial_job(uuid,uuid,text,bigint) to service_role;

create or replace function public.admin_claim_editorial_job(p_job_id uuid, p_user_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare j public.editorial_jobs; next_lock uuid; max_attempts integer; max_parallel integer; active_count integer;
begin
  -- One shared transaction lock serializes capacity accounting across different
  -- jobs. Always acquire it before the per-job lock to keep lock ordering stable.
  perform pg_advisory_xact_lock(hashtextextended('editorial_claim_capacity',0));
  perform pg_advisory_xact_lock(hashtextextended(p_job_id::text,0));
  select * into j from public.editorial_jobs where id=p_job_id for update;
  if not found then return jsonb_build_object('state','not_found'); end if;
  select max_attempts_per_job,max_parallel_jobs into max_attempts,max_parallel from public.editorial_workflow_config where id=true;
  if max_attempts is null or max_parallel is null then return jsonb_build_object('state','config_missing'); end if;
  if j.status='verifying' and j.locked_until>now() then return jsonb_build_object('state','busy'); end if;
  if j.status='retry_wait' and j.next_retry_at>now() then return jsonb_build_object('state','not_due'); end if;
  if j.attempts>=max_attempts then return jsonb_build_object('state','exhausted'); end if;
  if j.status not in ('discovered','retry_wait','failed','needs_review','verifying') then return jsonb_build_object('state','invalid_status','status',j.status); end if;
  select count(*) into active_count from public.editorial_jobs where status='verifying' and locked_until>now() and id<>p_job_id;
  if active_count>=max_parallel then return jsonb_build_object('state','capacity'); end if;
  next_lock:=gen_random_uuid();
  update public.editorial_jobs set status='verifying',current_step='research',attempts=attempts+1,
    lock_token=next_lock,locked_until=now()+interval '10 minutes',last_error=null,updated_by=p_user_id,updated_at=now()
    where id=p_job_id;
  update public.editorial_runs set status='running',started_at=coalesce(started_at,now()),lock_token=next_lock,locked_until=now()+interval '10 minutes'
    where id=j.run_id;
  return jsonb_build_object('state','claimed','lock_token',next_lock,'attempt',j.attempts+1,'job',to_jsonb(j));
end $$;
revoke all on function public.admin_claim_editorial_job(uuid,uuid) from public, anon, authenticated;
grant execute on function public.admin_claim_editorial_job(uuid,uuid) to service_role;

create or replace function public.admin_complete_editorial_job(
  p_job_id uuid, p_user_id uuid, p_lock_token uuid, p_evidence jsonb, p_claim_evidence jsonb,
  p_validation jsonb, p_exceptions jsonb, p_draft_ar jsonb, p_draft_en jsonb,
  p_usage jsonb, p_cost_used_cents integer, p_provider_response_id text
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare j public.editorial_jobs; ar_id uuid; en_id uuid; result_status text;
begin
  select * into j from public.editorial_jobs where id=p_job_id and lock_token=p_lock_token and status='verifying' and locked_until>now() for update;
  if not found then return jsonb_build_object('state','lock_lost'); end if;
  -- Provider/admin payloads cannot attest factual verification. Draft completion
  -- remains needs_review until a separate trusted deterministic validator derives
  -- readiness from persisted evidence and entity records.
  result_status := 'needs_review';
  insert into public.editorial_articles(language,title,slug,excerpt,body_markdown,meta_title,meta_description,target_type,project_id,area_name,source_refs,content_hash,status,created_by,updated_by)
    values('ar',p_draft_ar->>'title',p_draft_ar->>'slug',p_draft_ar->>'excerpt',p_draft_ar->>'body_markdown',p_draft_ar->>'meta_title',p_draft_ar->>'meta_description',
      case when j.primary_entity_id is not null and j.content_type='project' then 'project' else 'area' end,
      case when j.primary_entity_id is not null and j.content_type='project' then j.primary_entity_id::uuid else null end,
      case when j.content_type='project' then null else coalesce(j.area_name,'Editorial') end,p_evidence,p_draft_ar->>'content_hash','draft',p_user_id,p_user_id)
    returning id into ar_id;
  insert into public.editorial_articles(language,title,slug,excerpt,body_markdown,meta_title,meta_description,target_type,project_id,area_name,source_refs,content_hash,status,created_by,updated_by)
    values('en',p_draft_en->>'title',p_draft_en->>'slug',p_draft_en->>'excerpt',p_draft_en->>'body_markdown',p_draft_en->>'meta_title',p_draft_en->>'meta_description',
      case when j.primary_entity_id is not null and j.content_type='project' then 'project' else 'area' end,
      case when j.primary_entity_id is not null and j.content_type='project' then j.primary_entity_id::uuid else null end,
      case when j.content_type='project' then null else coalesce(j.area_name,'Editorial') end,p_evidence,p_draft_en->>'content_hash','draft',p_user_id,p_user_id)
    returning id into en_id;
  update public.editorial_jobs set status=result_status,current_step='drafts_saved',evidence=p_evidence,claim_evidence=p_claim_evidence,
    validation_results=p_validation,exceptions=p_exceptions,draft_ar=p_draft_ar,draft_en=p_draft_en,usage=p_usage,
    cost_used_cents=p_cost_used_cents,provider_response_id=p_provider_response_id,auto_publish_eligible=false,
    review_kind=null,published_article_ids=array[ar_id,en_id],
    lock_token=null,locked_until=null,updated_by=p_user_id,updated_at=now() where id=p_job_id;
  insert into public.editorial_job_versions(job_id,version_number,draft_ar,draft_en,evidence,claim_evidence,created_by)
    values(p_job_id,j.revision,p_draft_ar,p_draft_en,p_evidence,p_claim_evidence,p_user_id);
  insert into public.editorial_job_events(job_id,actor_id,event_type,from_status,to_status,details)
    values(p_job_id,p_user_id,'drafts_completed','verifying',result_status,jsonb_build_object('article_ids',array[ar_id,en_id]));
  update public.editorial_runs set status='partial',
    completed_at=now(),cost_used_cents=cost_used_cents+p_cost_used_cents,summary=jsonb_build_object('job_id',p_job_id,'status',result_status,'article_ids',array[ar_id,en_id]),lock_token=null,locked_until=null where id=j.run_id;
  return jsonb_build_object('state','completed','status',result_status,'article_ids',array[ar_id,en_id]);
exception when unique_violation then
  return jsonb_build_object('state','slug_conflict');
end $$;
revoke all on function public.admin_complete_editorial_job(uuid,uuid,uuid,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,integer,text) from public, anon, authenticated;
grant execute on function public.admin_complete_editorial_job(uuid,uuid,uuid,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,integer,text) to service_role;

create or replace function public.admin_fail_editorial_job(p_job_id uuid,p_user_id uuid,p_lock_token uuid,p_error text)
returns boolean language plpgsql security definer set search_path=''
as $$
declare affected integer; max_attempts integer;
begin
  select max_attempts_per_job into max_attempts from public.editorial_workflow_config where id=true;
  update public.editorial_jobs set status=case when attempts>=max_attempts then 'failed' else 'retry_wait' end,
    current_step='failed',last_error=left(p_error,1000),next_retry_at=case when attempts>=max_attempts then null else now()+interval '5 minutes' end,
    lock_token=null,locked_until=null,updated_by=p_user_id,updated_at=now()
    where id=p_job_id and lock_token=p_lock_token and status='verifying';
  get diagnostics affected=row_count;
  return affected=1;
end $$;
revoke all on function public.admin_fail_editorial_job(uuid,uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.admin_fail_editorial_job(uuid,uuid,uuid,text) to service_role;

create or replace function public.admin_control_editorial_job(
  p_job_id uuid,p_user_id uuid,p_action text,p_expected_revision bigint,p_version_id uuid default null,p_resolution jsonb default null,
  p_expected_ar_revision bigint default null,p_expected_ar_hash text default null,p_expected_ar_status text default null,
  p_expected_en_revision bigint default null,p_expected_en_hash text default null,p_expected_en_status text default null
)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare j public.editorial_jobs; v public.editorial_job_versions; ar public.editorial_articles; en public.editorial_articles; target_status text;
begin
  select * into j from public.editorial_jobs where id=p_job_id and revision=p_expected_revision for update;
  if not found then return jsonb_build_object('state','stale'); end if;
  if p_action='pause' then
    if j.status in ('published','publishing','verifying','paused') then return jsonb_build_object('state','invalid_status'); end if;
    target_status:='paused';
  elsif p_action='resume' then
    if j.status<>'paused' then return jsonb_build_object('state','invalid_status'); end if;
    target_status:='retry_wait';
  elsif p_action='resolve_exception' then
    if j.status<>'needs_review' or p_resolution->>'outcome' not in ('acknowledged_not_verified','linked_trusted_evidence') then return jsonb_build_object('state','invalid_resolution'); end if;
    if p_resolution->>'outcome'='linked_trusted_evidence' and not exists(
      select 1 from public.editorial_trusted_evidence e join public.editorial_trusted_entities t on t.id=e.entity_id
      where e.id=(p_resolution->>'trusted_evidence_id')::uuid
        and e.claim_key=p_resolution->>'claim_key'
        and t.source_entity_id in (j.primary_entity_id,j.secondary_entity_id,j.area_name)
        and jsonb_typeof(e.provenance)='object' and e.provenance<>'{}'::jsonb
        and jsonb_typeof(t.provenance)='object' and t.provenance<>'{}'::jsonb
        and e.source_url like 'https://%'
        and (e.fresh_until is null or e.fresh_until>now()) and (t.fresh_until is null or t.fresh_until>now())
        and coalesce(e.rights_status,'authorized')<>'forbidden'
    ) then return jsonb_build_object('state','trusted_evidence_invalid'); end if;
    target_status:='needs_review';
  elsif p_action='rollback' then
    select * into v from public.editorial_job_versions where id=p_version_id and job_id=p_job_id;
    if not found then return jsonb_build_object('state','version_not_found'); end if;
    if coalesce(array_length(j.published_article_ids,1),0)<>2 then return jsonb_build_object('state','article_pair_missing'); end if;
    -- Lock in deterministic UUID order before checking either member of the pair.
    perform 1 from public.editorial_articles where id=any(j.published_article_ids) order by id for update;
    select * into ar from public.editorial_articles where id=j.published_article_ids[1] and language='ar';
    select * into en from public.editorial_articles where id=j.published_article_ids[2] and language='en';
    if ar.id is null or en.id is null then return jsonb_build_object('state','article_pair_missing'); end if;
    if p_expected_ar_revision is null or p_expected_en_revision is null or
       ar.revision<>p_expected_ar_revision or en.revision<>p_expected_en_revision or
       ar.content_hash is distinct from p_expected_ar_hash or en.content_hash is distinct from p_expected_en_hash or
       ar.status<>p_expected_ar_status or en.status<>p_expected_en_status or
       ar.status<>'draft' or en.status<>'draft' then
      return jsonb_build_object('state','article_pair_stale');
    end if;
    update public.editorial_jobs set draft_ar=v.draft_ar,draft_en=v.draft_en,evidence=v.evidence,claim_evidence=v.claim_evidence,
      status='needs_review',current_step='rolled_back_to_draft_version',auto_publish_eligible=false,review_kind=null,
      revision=revision+1,updated_by=p_user_id,updated_at=now() where id=p_job_id;
    update public.editorial_articles set title=v.draft_ar->>'title',slug=v.draft_ar->>'slug',excerpt=v.draft_ar->>'excerpt',
        body_markdown=v.draft_ar->>'body_markdown',meta_title=v.draft_ar->>'meta_title',meta_description=v.draft_ar->>'meta_description',
        source_refs=v.evidence,content_hash=v.draft_ar->>'content_hash',status='draft',reviewed_by=null,reviewed_at=null,published_at=null,
        revision=revision+1,updated_by=p_user_id,updated_at=now() where id=j.published_article_ids[1] and language='ar';
    update public.editorial_articles set title=v.draft_en->>'title',slug=v.draft_en->>'slug',excerpt=v.draft_en->>'excerpt',
        body_markdown=v.draft_en->>'body_markdown',meta_title=v.draft_en->>'meta_title',meta_description=v.draft_en->>'meta_description',
        source_refs=v.evidence,content_hash=v.draft_en->>'content_hash',status='draft',reviewed_by=null,reviewed_at=null,published_at=null,
        revision=revision+1,updated_by=p_user_id,updated_at=now() where id=j.published_article_ids[2] and language='en';
    insert into public.editorial_job_versions(job_id,version_number,draft_ar,draft_en,evidence,claim_evidence,created_by)
      values(p_job_id,j.revision+1,v.draft_ar,v.draft_en,v.evidence,v.claim_evidence,p_user_id);
    insert into public.editorial_job_events(job_id,actor_id,event_type,from_status,to_status,details)
      values(p_job_id,p_user_id,'rollback',j.status,'needs_review',jsonb_build_object('source_version_id',p_version_id));
    return jsonb_build_object('state','updated','status','needs_review','revision',j.revision+1);
  else return jsonb_build_object('state','invalid_action'); end if;
  update public.editorial_jobs set status=target_status,current_step=p_action,revision=revision+1,updated_by=p_user_id,updated_at=now() where id=p_job_id;
  insert into public.editorial_job_events(job_id,actor_id,event_type,from_status,to_status,details)
    values(p_job_id,p_user_id,p_action,j.status,target_status,coalesce(p_resolution,'{}'::jsonb));
  return jsonb_build_object('state','updated','status',target_status,'revision',j.revision+1);
end $$;
revoke all on function public.admin_control_editorial_job(uuid,uuid,text,bigint,uuid,jsonb,bigint,text,text,bigint,text,text) from public, anon, authenticated;
grant execute on function public.admin_control_editorial_job(uuid,uuid,text,bigint,uuid,jsonb,bigint,text,text,bigint,text,text) to service_role;

comment on table public.editorial_jobs is 'Durable source-grounded bilingual workflow; ready_auto means automated validation, never implied human review.';
