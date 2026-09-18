-- tycoons-admin v2: users with roles (owner/editor), change requests with owner approval,
-- and one atomic apply function. RLS on + no policies everywhere = service role only.

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique check (username ~ '^[a-z0-9._-]{3,32}$'),
  display_name text not null default '',
  role text not null check (role in ('owner', 'editor')),
  password_salt text not null,
  password_hash text not null,
  password_iterations integer not null default 210000,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references public.admin_users(id) on delete set null,
  last_login_at timestamptz
);
alter table public.admin_users enable row level security;
revoke all on public.admin_users from anon, authenticated;

-- Owner account keeps the password already handed to Ahmed.
insert into public.admin_users (username, display_name, role, password_salt, password_hash, password_iterations)
values ('ahmed', 'Ahmed El Sentrecy', 'owner', '53c9878f427bb0807534276086046e07',
        'ea3defbd301ed242294e8e06599ca60f898eadd0b9ba6a9558491773ec46d5b3', 210000)
on conflict (username) do nothing;

-- Sessions now belong to a user; old single-password sessions are dropped.
delete from public.media_admin_sessions;
alter table public.media_admin_sessions add column if not exists user_id uuid references public.admin_users(id) on delete cascade;

create table if not exists public.admin_change_requests (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  created_by uuid not null references public.admin_users(id) on delete cascade,
  entity text not null check (entity in ('project', 'unit')),
  action text not null check (action in ('media', 'create', 'update', 'delete', 'import')),
  target_id uuid,
  project_id uuid,
  summary text not null default '',
  ops jsonb not null,
  before jsonb,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled', 'failed')),
  reviewed_by uuid references public.admin_users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  result jsonb
);
create index if not exists admin_change_requests_status_idx on public.admin_change_requests (status, created_at desc);
alter table public.admin_change_requests enable row level security;
revoke all on public.admin_change_requests from anon, authenticated;

-- Apply a list of ops atomically (all or nothing). Only whitelisted columns can be written.
-- op shapes:
--   {"op":"media","entity":"project"|"unit","id":uuid,"values":{image_url,gallery_urls,video_url,brochure_url}}
--   {"op":"create","values":{...unit columns incl. project_id}}
--   {"op":"update","id":uuid,"values":{...unit columns}}
--   {"op":"delete","id":uuid}
create or replace function public.admin_apply_ops(ops jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  unit_cols constant text[] := array['project_id','project_name','developer','location','unit_type','bedrooms_text',
    'area_sqm','starting_price','down_payment_text','installments_text','delivery_text','finishing',
    'availability_status','description','image_url','gallery_urls','video_url','brochure_url'];
  media_cols constant text[] := array['image_url','gallery_urls','video_url','brochure_url'];
  item jsonb;
  vals jsonb;
  cols text[];
  sets text;
  new_id uuid;
  affected integer;
  created integer := 0;
  updated integer := 0;
  deleted integer := 0;
  created_ids jsonb := '[]'::jsonb;
begin
  if jsonb_typeof(ops) <> 'array' then
    raise exception 'ops must be an array';
  end if;

  for item in select value from jsonb_array_elements(ops) loop
    vals := coalesce(item->'values', '{}'::jsonb);

    if item->>'op' = 'media' then
      select array_agg(k) into cols from jsonb_object_keys(vals) k where k = any(media_cols);
      if cols is null then continue; end if;
      select string_agg(format('%I = (jsonb_populate_record(null::public.%I, $1)).%I', c,
        case when item->>'entity' = 'project' then 'projects' else 'units' end, c), ', ')
        into sets from unnest(cols) c;
      execute format('update public.%I set %s where id = $2',
        case when item->>'entity' = 'project' then 'projects' else 'units' end, sets)
        using vals, (item->>'id')::uuid;
      get diagnostics affected = row_count;
      if affected = 0 then raise exception 'not_found:%', item->>'id'; end if;
      updated := updated + 1;

    elsif item->>'op' = 'create' then
      select array_agg(k) into cols from jsonb_object_keys(vals) k where k = any(unit_cols);
      if cols is null or not ('project_id' = any(cols)) then raise exception 'create_requires_project_id'; end if;
      execute format('insert into public.units (%s) select %s from jsonb_populate_record(null::public.units, $1) returning id',
        (select string_agg(format('%I', c), ', ') from unnest(cols) c),
        (select string_agg(format('%I', c), ', ') from unnest(cols) c))
        using vals into new_id;
      created := created + 1;
      created_ids := created_ids || to_jsonb(new_id);

    elsif item->>'op' = 'update' then
      select array_agg(k) into cols from jsonb_object_keys(vals) k where k = any(unit_cols);
      if cols is null then continue; end if;
      select string_agg(format('%I = (jsonb_populate_record(null::public.units, $1)).%I', c, c), ', ') into sets from unnest(cols) c;
      execute format('update public.units set %s where id = $2', sets) using vals, (item->>'id')::uuid;
      get diagnostics affected = row_count;
      if affected = 0 then raise exception 'not_found:%', item->>'id'; end if;
      updated := updated + 1;

    elsif item->>'op' = 'delete' then
      delete from public.units where id = (item->>'id')::uuid;
      get diagnostics affected = row_count;
      if affected = 0 then raise exception 'not_found:%', item->>'id'; end if;
      deleted := deleted + 1;

    else
      raise exception 'unknown_op:%', item->>'op';
    end if;
  end loop;

  return jsonb_build_object('created', created, 'updated', updated, 'deleted', deleted, 'created_ids', created_ids);
end;
$$;
revoke all on function public.admin_apply_ops(jsonb) from public, anon, authenticated;
grant execute on function public.admin_apply_ops(jsonb) to service_role;
