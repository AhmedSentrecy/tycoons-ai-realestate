-- Project-level updates read from the WhatsApp groups (new payment plan, offer, delivery, finishing,
-- price change, launch). The reader saves them in wa_message_log.ai_updates; wa-inbox copies each item
-- here (one row per message + project + update type) so the admin can apply or ignore it.
-- Applying changes the project's payment/delivery/finishing through admin_apply_ops (logged in
-- admin_change_requests). Older pending rows of the same project + type become "superseded".

create table if not exists public.wa_project_updates (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  message_log_id bigint not null references public.wa_message_log(id) on delete cascade,
  message_date timestamptz,
  source_group text,
  project_name text not null,
  developer text,
  project_id uuid references public.projects(id) on delete set null,
  update_type text not null check (update_type in ('payment_plan','offer','delivery','finishing','price_change','launch','other')),
  down_payment_text text,
  installments_text text,
  delivery_text text,
  finishing text,
  valid_until text,
  details text,
  status text not null default 'pending' check (status in ('pending','applied','ignored','superseded')),
  decided_by uuid,
  decided_at timestamptz,
  unique (message_log_id, project_name, update_type)
);

create index if not exists wa_project_updates_pending on public.wa_project_updates (status, project_id, update_type, message_date desc);

alter table public.wa_project_updates enable row level security;
-- No policies: only the wa-inbox function (service role) reads and writes it.
