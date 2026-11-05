-- Project data fixes from the 5 Nov 2026 page audit.
-- Run once in Supabase → SQL Editor. Each table is backed up first, so every change can be undone.

begin;

-- Backups
create table if not exists admin_backup_projects_audit_20261105 as
  select * from projects
  where slug in ('mountain-view-icity-october--mountain-view', 'mountain-view-icity-new-cairo--mountain-view');
create table if not exists admin_backup_units_icity_october_20261105 as
  select u.* from units u join projects p on p.id = u.project_id
  where p.slug = 'mountain-view-icity-october--mountain-view';
create table if not exists admin_backup_developers_adh_20261105 as
  select * from developers where slug in ('arab-developers-holding', 'arab-developers-holding-adh');

-- 1) Mountain View iCity October is in 6th of October, not Sheikh Zayed (the guide and FAQ say October).
update projects
set location = '6th of October City',
    hero_text = 'اعرف أسعار ومساحات ماونتن فيو آي سيتي أكتوبر وخطط السداد والوحدات المتاحة في 6 أكتوبر.'
where slug = 'mountain-view-icity-october--mountain-view';

update units u
set location = '6th of October City'
from projects p
where p.id = u.project_id
  and p.slug = 'mountain-view-icity-october--mountain-view'
  and u.location = 'Sheikh Zayed';

-- 2) iCity New Cairo: the hero line had an old starting price (14,274,110) and old areas (110–565 m²)
--    that contradict the facts box. The page now says only what the units table shows.
update projects
set hero_text = 'اعرف أسعار ومساحات ماونتن فيو آي سيتي التجمع الخامس وخطط السداد والوحدات المتاحة.'
where slug = 'mountain-view-icity-new-cairo--mountain-view';

-- 3) Arab Developers Holding: the official Arabic name (ad-holding.com/ar) is «المطورون العرب القابضة»,
--    the same name the Nyoum October guide uses.
update developers
set name_ar = 'المطورون العرب القابضة'
where slug in ('arab-developers-holding', 'arab-developers-holding-adh');

commit;

-- Check (should show the new values):
select slug, location, hero_text from projects
where slug in ('mountain-view-icity-october--mountain-view', 'mountain-view-icity-new-cairo--mountain-view');
select slug, name_ar from developers where slug in ('arab-developers-holding', 'arab-developers-holding-adh');
