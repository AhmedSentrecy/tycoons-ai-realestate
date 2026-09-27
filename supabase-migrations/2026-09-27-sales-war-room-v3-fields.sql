-- Sales War Room V3: structured client fields
-- Safe to run more than once. Adds columns only; does not change or delete existing data.
alter table public.sales_pipeline
  add column if not exists interest_types text[] not null default '{}',
  add column if not exists areas text[] not null default '{}',
  add column if not exists closing_keys text[] not null default '{}',
  add column if not exists budget_min numeric,
  add column if not exists budget_max numeric,
  add column if not exists lost_reason text,
  add column if not exists meeting_date date,
  add column if not exists meeting_time time,
  add column if not exists meeting_location text;

comment on column public.sales_pipeline.interest_types is 'Unit types from the fixed V3 list (Apartment, Duplex, ...)';
comment on column public.sales_pipeline.areas is 'Areas from the fixed V3 list (New Cairo, Sheikh Zayed, ...)';
comment on column public.sales_pipeline.closing_keys is 'Up to 2 short facts that would close the deal';
comment on column public.sales_pipeline.budget_min is 'Budget from, in EGP';
comment on column public.sales_pipeline.budget_max is 'Budget to, in EGP';
comment on column public.sales_pipeline.lost_reason is 'Why the lead was lost (fixed V3 list)';
comment on column public.sales_pipeline.meeting_location is 'Office / Site / Online / Developer office';
