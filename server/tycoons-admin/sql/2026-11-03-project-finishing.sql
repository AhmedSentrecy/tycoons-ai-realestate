-- 2026-11-03: default finishing per project/phase (most phases are delivered with one finishing),
-- and confirmed WhatsApp names -> project (so the next units with the same name link by themselves).
alter table public.projects add column if not exists finishing text;

create table if not exists public.wa_project_aliases (
  alias_key text primary key,          -- lower-case letters/digits of the name as it came in WhatsApp
  alias text not null,                 -- the name as it came
  project_id uuid not null references public.projects(id) on delete cascade,
  created_by uuid,
  created_at timestamptz not null default now()
);
alter table public.wa_project_aliases enable row level security;

-- admin_apply_ops may now write projects.finishing when a project is created or edited.
do $$
declare
  def text;
begin
  select pg_get_functiondef('public.admin_apply_ops(jsonb)'::regprocedure) into def;
  if position('''finishing'']' in def) > 0 and position('''sub_area'',''finishing''' in def) > 0 then return; end if;
  def := replace(def,
    $q$'min_price','area_group','sub_area']$q$,
    $q$'min_price','area_group','sub_area','finishing']$q$);
  def := replace(def,
    $q$'down_payment_text','installments_text','delivery_text','area_group','sub_area'];$q$,
    $q$'down_payment_text','installments_text','delivery_text','area_group','sub_area','finishing'];$q$);
  execute def;
end $$;
