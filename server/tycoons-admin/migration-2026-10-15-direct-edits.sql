-- 2026-10-15: admins edit and delete directly; the change log covers projects, units and developers.
-- 1) admin_apply_ops gains project_update (also refreshes the project name / developer / location
--    copied on its units) and project_delete (its units go with it: units.project_id cascades).
-- 2) The change log accepts 'developer' rows (developer page SEO edits).
-- 3) Developers get their own Google title / description per language.

alter table public.developers
  add column if not exists seo_title_ar text,
  add column if not exists seo_description_ar text,
  add column if not exists seo_title_en text,
  add column if not exists seo_description_en text;

alter table public.admin_change_requests drop constraint if exists admin_change_requests_entity_check;
alter table public.admin_change_requests add constraint admin_change_requests_entity_check
  check (entity = any (array['project'::text, 'unit'::text, 'developer'::text]));

create or replace function public.admin_apply_ops(ops jsonb)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  unit_cols constant text[] := array['project_id','project_name','developer','location','unit_type','bedrooms_text',
    'area_sqm','starting_price','down_payment_text','installments_text','delivery_text','finishing',
    'availability_status','description','image_url','gallery_urls','video_url','brochure_url'];
  media_cols constant text[] := array['image_url','gallery_urls','video_url','brochure_url'];
  project_cols constant text[] := array['name','developer','location','slug','status','description','hero_text','seo_title','seo_description','min_price'];
  project_edit_cols constant text[] := array['name','developer','location','description','hero_text','seo_title','seo_description',
    'down_payment_text','installments_text','delivery_text'];
  item jsonb; vals jsonb; cols text[]; sets text; new_id uuid; affected integer;
  created integer := 0; updated integer := 0; deleted integer := 0; created_ids jsonb := '[]'::jsonb;
begin
  if jsonb_typeof(ops) <> 'array' then raise exception 'ops must be an array'; end if;
  for item in select value from jsonb_array_elements(ops) loop
    vals := coalesce(item->'values', '{}'::jsonb);
    if item->>'op' = 'media' then
      select array_agg(k) into cols from jsonb_object_keys(vals) k where k = any(media_cols);
      if cols is null then continue; end if;
      select string_agg(format('%I = (jsonb_populate_record(null::public.%I, $1)).%I', c,
        case when item->>'entity' = 'project' then 'projects' else 'units' end, c), ', ') into sets from unnest(cols) c;
      execute format('update public.%I set %s where id = $2', case when item->>'entity' = 'project' then 'projects' else 'units' end, sets)
        using vals, (item->>'id')::uuid;
      get diagnostics affected = row_count;
      if affected = 0 then raise exception 'not_found:%', item->>'id'; end if;
      updated := updated + 1;
    elsif item->>'op' = 'create' then
      select array_agg(k) into cols from jsonb_object_keys(vals) k where k = any(unit_cols);
      if cols is null or not ('project_id' = any(cols)) then raise exception 'create_requires_project_id'; end if;
      execute format('insert into public.units (%s) select %s from jsonb_populate_record(null::public.units, $1) returning id',
        (select string_agg(format('%I', c), ', ') from unnest(cols) c), (select string_agg(format('%I', c), ', ') from unnest(cols) c))
        using vals into new_id;
      created := created + 1; created_ids := created_ids || to_jsonb(new_id);
    elsif item->>'op' = 'project_create' then
      select array_agg(k) into cols from jsonb_object_keys(vals) k where k = any(project_cols);
      if cols is null or not ('name' = any(cols)) then raise exception 'project_requires_name'; end if;
      execute format('insert into public.projects (%s) select %s from jsonb_populate_record(null::public.projects, $1) returning id',
        (select string_agg(format('%I', c), ', ') from unnest(cols) c), (select string_agg(format('%I', c), ', ') from unnest(cols) c))
        using vals into new_id;
      created := created + 1; created_ids := created_ids || to_jsonb(new_id);
    elsif item->>'op' = 'project_update' then
      select array_agg(k) into cols from jsonb_object_keys(vals) k where k = any(project_edit_cols);
      if cols is null then continue; end if;
      select string_agg(format('%I = (jsonb_populate_record(null::public.projects, $1)).%I', c, c), ', ') into sets from unnest(cols) c;
      execute format('update public.projects set %s where id = $2', sets) using vals, (item->>'id')::uuid;
      get diagnostics affected = row_count;
      if affected = 0 then raise exception 'not_found:%', item->>'id'; end if;
      -- Units keep a copy of the project name / developer / location: keep them in step.
      update public.units u set
        project_name = case when vals ? 'name' then p.name else u.project_name end,
        developer = case when vals ? 'developer' then p.developer else u.developer end,
        location = case when vals ? 'location' then p.location else u.location end
      from public.projects p
      where p.id = (item->>'id')::uuid and u.project_id = p.id and (vals ? 'name' or vals ? 'developer' or vals ? 'location');
      updated := updated + 1;
    elsif item->>'op' = 'project_delete' then
      delete from public.projects where id = (item->>'id')::uuid;
      get diagnostics affected = row_count;
      if affected = 0 then raise exception 'not_found:%', item->>'id'; end if;
      deleted := deleted + 1;
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
    else raise exception 'unknown_op:%', item->>'op';
    end if;
  end loop;
  return jsonb_build_object('created', created, 'updated', updated, 'deleted', deleted, 'created_ids', created_ids);
end; $function$;
revoke all on function public.admin_apply_ops(jsonb) from public, anon, authenticated;
grant execute on function public.admin_apply_ops(jsonb) to service_role;
