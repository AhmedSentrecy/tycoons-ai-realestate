-- WhatsApp click counter (re-activated Oct 2026).
-- public.whatsapp_clicks already exists (it recorded clicks until 30 Jun 2026, when the
-- old front-end code that wrote to it was removed). public/wa-track.js now writes to it
-- again from every public page.
--
-- Additive only: new nullable columns + length limits for the new columns.
-- Existing rows, the insert-only policy for the public key and RLS stay as they are.

alter table public.whatsapp_clicks
  add column if not exists button_label text,
  add column if not exists project_slug text,
  add column if not exists traffic_source text,
  add column if not exists landing_path text,
  add column if not exists device text,
  add column if not exists lang text;

-- Size limits so the public insert key cannot be used to store large blobs.
-- NOT VALID: applies to new rows only, old rows are left untouched.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'whatsapp_clicks_sizes_chk') then
    alter table public.whatsapp_clicks add constraint whatsapp_clicks_sizes_chk check (
      coalesce(char_length(tracking_id), 0) <= 60
      and coalesce(char_length(source), 0) <= 60
      and coalesce(char_length(button_label), 0) <= 120
      and coalesce(char_length(page_url), 0) <= 500
      and coalesce(char_length(page_path), 0) <= 300
      and coalesce(char_length(project_slug), 0) <= 160
      and coalesce(char_length(project_name), 0) <= 160
      and coalesce(char_length(traffic_source), 0) <= 60
      and coalesce(char_length(referrer), 0) <= 200
      and coalesce(char_length(landing_path), 0) <= 300
      and coalesce(char_length(device), 0) <= 20
      and coalesce(char_length(lang), 0) <= 10
      and coalesce(char_length(user_agent), 0) <= 300
      and coalesce(char_length(whatsapp_url), 0) <= 1500
      and coalesce(char_length(utm_source), 0) <= 60
      and coalesce(char_length(utm_medium), 0) <= 60
      and coalesce(char_length(utm_campaign), 0) <= 120
    ) not valid;
  end if;
end $$;

create index if not exists whatsapp_clicks_created_at_idx
  on public.whatsapp_clicks (created_at desc);

-- The public key may only INSERT (RLS already blocks the rest; this removes the grants too).
revoke select, update, delete, truncate, references, trigger on public.whatsapp_clicks from anon, authenticated;
grant insert on public.whatsapp_clicks to anon;
