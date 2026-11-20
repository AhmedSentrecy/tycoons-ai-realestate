-- SEO descriptions fixed in the 20 Nov 2026 review of PR #171.
-- Three Arabic descriptions had English place names, and one was cut mid-word ("في Go").
-- Run once in Supabase → SQL Editor. The rows are backed up first, so the change can be undone.

begin;

create table if not exists admin_backup_seo_desc_20261120 as
  select id, slug, seo_description from projects
  where slug in (
    'the-hillage--madaar-development',
    'sun-capital--arabia-holding-arabia-holding-for-real-estate-development-ar',
    'the-red-residence--al-borouj-misr-developments-group-abm'
  );

update projects
set seo_description = 'تعرف على أسعار The Hillage في 2026، الوحدات والمساحات المتاحة، المقدم وخطط السداد والاستلام. مشروع من Madaar Development في الشيخ زايد القديمة على طريق مصر إسكندرية الصحراوي.'
where slug = 'the-hillage--madaar-development';

update projects
set seo_description = 'تعرف على أسعار Sun Capital في 2026، الوحدات والمساحات المتاحة، المقدم وخطط السداد والاستلام. مشروع من العربية هولدينج في حدائق أكتوبر على طريق الفيوم.'
where slug = 'sun-capital--arabia-holding-arabia-holding-for-real-estate-development-ar';

update projects
set seo_description = 'تعرف على أسعار The Red Residence في 2026، الوحدات والمساحات المتاحة، المقدم وخطط السداد والاستلام. مشروع من البروج مصر (ABM) في الجولدن سكوير بالقاهرة الجديدة.'
where slug = 'the-red-residence--al-borouj-misr-developments-group-abm';

commit;

-- Undo:
-- update projects p set seo_description = b.seo_description
-- from admin_backup_seo_desc_20261120 b where b.id = p.id;
