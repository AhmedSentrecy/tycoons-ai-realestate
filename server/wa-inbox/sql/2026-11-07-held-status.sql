-- WhatsApp inbox, 7 Nov 2026: the 7-day rule. After a unit type of a project (same type and bedrooms)
-- is updated on the site from WhatsApp, the same type is not updated again for 7 days unless the new
-- price is lower. Units stopped by the rule are kept with status 'held' (never shown, never approved),
-- so the same message is not read twice and the admin page can count them.
-- Run once in Supabase → SQL Editor. Nothing on the public site changes.

begin;

alter table public.wa_unit_inbox drop constraint if exists wa_unit_inbox_status_check;
alter table public.wa_unit_inbox add constraint wa_unit_inbox_status_check
  check (status in ('pending', 'approved', 'rejected', 'held'));

commit;

select status, count(*) from public.wa_unit_inbox group by 1;
