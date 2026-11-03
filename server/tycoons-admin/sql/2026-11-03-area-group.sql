-- 2026-11-03: main area + sub area for projects (dropdowns in the admin) and WhatsApp inbox items.
-- projects.area_group / projects.sub_area were added and filled on 2026-11-03
-- (backup of the old developer/location values: public.admin_backup_projects_loc_dev_20261103).
alter table public.projects add column if not exists area_group text;
alter table public.projects add column if not exists sub_area text;
alter table public.wa_unit_inbox add column if not exists area_group text;

-- admin_apply_ops may now write area_group / sub_area when a project is created or edited.
do $$
declare
  def text;
begin
  select pg_get_functiondef('public.admin_apply_ops(jsonb)'::regprocedure) into def;
  if position('''sub_area''' in def) > 0 then return; end if;
  def := replace(def,
    $q$'seo_description','min_price']$q$,
    $q$'seo_description','min_price','area_group','sub_area']$q$);
  def := replace(def,
    $q$'down_payment_text','installments_text','delivery_text'];$q$,
    $q$'down_payment_text','installments_text','delivery_text','area_group','sub_area'];$q$);
  execute def;
end $$;
