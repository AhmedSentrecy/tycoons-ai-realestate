-- WhatsApp inbox, 5 Nov 2026: each WhatsApp group remembers its usual developer.
-- Used only when a message does not name the developer ("Unknown", "Needs developer name").
-- Run once in Supabase → SQL Editor. Nothing on the public site changes.

begin;

alter table public.wa_groups add column if not exists developer text;

-- Start from what the admin already approved: the developer of the projects each group's units
-- were linked to (most frequent), when it is at least 80% of that group's linked units.
with linked as (
  select i.source_group_id as group_id, p.developer, count(*) as n
  from public.wa_unit_inbox i
  join public.projects p on p.id = i.project_id
  where i.source_group_id is not null and coalesce(p.developer, '') <> ''
  group by 1, 2
), ranked as (
  select group_id, developer, n, sum(n) over (partition by group_id) as total,
         row_number() over (partition by group_id order by n desc) as rn
  from linked
)
update public.wa_groups g
set developer = r.developer
from ranked r
where r.group_id = g.group_id and r.rn = 1 and r.n >= 0.8 * r.total and g.developer is null;

commit;

-- Check: groups and their developer (empty = the admin can pick one in "الجروبات").
select name, developer from public.wa_groups order by developer nulls first, name;
