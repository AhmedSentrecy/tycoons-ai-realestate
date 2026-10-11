-- Builds data-driven buyer FAQ (Arabic) for a project from its available units.
-- Lives in a private schema (not exposed through the public API).
-- Usage: select admin_tools.build_project_faq('<project uuid>');
create schema if not exists admin_tools;
revoke all on schema admin_tools from public;

create or replace function admin_tools.num(t text) returns numeric
language sql immutable as $$
  select (regexp_match(replace(coalesce(t, ''), ',', ''), '[0-9]+(?:\.[0-9]+)?'))[1]::numeric
$$;

create or replace function admin_tools.fmt(n numeric) returns text
language sql immutable as $$ select to_char(round(n), 'FM999,999,999,990') $$;

create or replace function admin_tools.dec(n numeric) returns text
language sql immutable as $$
  select regexp_replace(regexp_replace(to_char(n, 'FM999990.0'), '0+$', ''), '\.$', '')
$$;

-- "حوالي X مليون" / "X ألف"
create or replace function admin_tools.money_short(n numeric) returns text
language sql immutable as $$
  select case when n >= 1000000 then admin_tools.dec(round(n / 1000000, 1)) || ' مليون'
              else admin_tools.fmt(round(n / 1000)) || ' ألف' end
$$;

create or replace function admin_tools.thousands(n numeric) returns text
language sql immutable as $$ select admin_tools.fmt(round(n / 1000)) || ' ألف' $$;

create or replace function admin_tools.ar_month(d date) returns text
language sql immutable as $$
  select (array['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'])[extract(month from d)::int]
         || ' ' || extract(year from d)::int
$$;

create or replace function admin_tools.years_ar(n numeric) returns text
language sql immutable as $$
  select case when n = 1 then 'سنة' when n = 2 then 'سنتين'
              when n <= 10 then admin_tools.dec(n) || ' سنوات' else admin_tools.dec(n) || ' سنة' end
$$;

create or replace function admin_tools.unit_family(t text) returns text
language sql immutable as $$
  select case
    when t ~* 'i-?villa' then 'ivilla'
    when t ~* 'twin' then 'twin'
    when t ~* 'town|\yths\y' then 'town'
    when t ~* 'triplex' then 'triplex'
    when t ~* 'suite' then 'suite'
    when t ~* 'quadro' then 'quadro'
    when t ~* 'pent' then 'penthouse'
    when t ~* 'duplex|maisonette' then 'duplex'
    when t ~* 'chalet|cabin' then 'chalet'
    when t ~* 'studio' then 'studio'
    when t ~* 'loft' then 'loft'
    when t ~* 'clinic|medical|pharmacy|laborator' then 'medical'
    when t ~* 'office|admin' then 'office'
    when t ~* 'retail|f&b|bank|shop|commercial' then 'retail'
    when t ~* 'villa|stand ?alone|single storey' then 'villa'
    when t ~* 'apart|apt|bed|[0-9] ?br|[0-9] ?bd|[0-9]b |millennial|typical|ground|garden|terrace|floor|flat|serviced' then 'apartment'
    else 'unit' end
$$;

-- Definite plural label, e.g. "الشقق"
create or replace function admin_tools.family_label(f text) returns text
language sql immutable as $$
  select case f
    when 'apartment' then 'الشقق' when 'villa' then 'الفيلات المستقلة' when 'ivilla' then 'الآي فيلا'
    when 'town' then 'التاون هاوس' when 'twin' then 'التوين هاوس' when 'quadro' then 'الكوادرو'
    when 'penthouse' then 'البنتهاوس' when 'duplex' then 'الدوبلكس' when 'chalet' then 'الشاليهات'
    when 'studio' then 'الستوديوهات' when 'triplex' then 'التريبلكس' when 'suite' then 'الأجنحة الفندقية' when 'loft' then 'اللوفت' when 'medical' then 'الوحدات الطبية'
    when 'office' then 'المكاتب الإدارية' when 'retail' then 'المحلات التجارية' when 'unit' then 'الوحدات'
    else 'وحدات ' || f end
$$;

-- Singular label, e.g. "شقة"
create or replace function admin_tools.family_single(f text) returns text
language sql immutable as $$
  select case f
    when 'apartment' then 'شقة' when 'villa' then 'فيلا مستقلة' when 'ivilla' then 'آي فيلا'
    when 'town' then 'تاون هاوس' when 'twin' then 'توين هاوس' when 'quadro' then 'كوادرو'
    when 'penthouse' then 'بنتهاوس' when 'duplex' then 'دوبلكس' when 'chalet' then 'شاليه'
    when 'studio' then 'ستوديو' when 'triplex' then 'تريبلكس' when 'suite' then 'جناح فندقي' when 'loft' then 'لوفت' when 'medical' then 'وحدة طبية'
    when 'office' then 'مكتب إداري' when 'retail' then 'محل تجاري' when 'unit' then 'وحدة'
    else f end
$$;

create or replace function admin_tools.location_ar(loc text) returns text
language sql immutable as $$
  select case
    when loc ~* 'mostakbal' then 'مستقبل سيتي'
    when loc ~* '\yr4\y|\yr8\y|capital' then 'العاصمة الإدارية الجديدة'
    when loc ~* 'fifth|5th' then 'التجمع الخامس بالقاهرة الجديدة'
    when loc ~* '6th settlement' then 'التجمع السادس بالقاهرة الجديدة'
    when loc ~* 'golden square' then 'منطقة الجولدن سكوير بالقاهرة الجديدة'
    when loc ~* 'north investors' then 'منطقة المستثمرين الشمالية بالقاهرة الجديدة'
    when loc ~* 'south investors' then 'منطقة المستثمرين الجنوبية بالقاهرة الجديدة'
    when loc ~* 'lotus' then 'منطقة اللوتس بالقاهرة الجديدة'
    when loc ~* '90' then 'شارع التسعين بالقاهرة الجديدة'
    when loc ~* 'south new cairo' then 'جنوب القاهرة الجديدة'
    when loc ~* 'suez road' then 'طريق السويس بالقاهرة الجديدة'
    when loc ~* 'shorouk' then 'مدينة الشروق'
    when loc ~* 'new cairo|east cairo|heliopolis|القاهرة الجديدة' then 'القاهرة الجديدة'
    when loc ~* 'new zayed' then 'الشيخ زايد الجديدة'
    when loc ~* 'zayed|sodic west|west cairo' then 'الشيخ زايد'
    when loc ~* 'october' then 'مدينة السادس من أكتوبر'
    when loc ~* 'hekma|hikma' then 'رأس الحكمة بالساحل الشمالي'
    when loc ~* 'alamein' then 'العلمين الجديدة بالساحل الشمالي'
    when loc ~* 'dabaa' then 'الضبعة بالساحل الشمالي'
    when loc ~* 'sidi abdel' then 'سيدي عبد الرحمن بالساحل الشمالي'
    when loc ~* 'ghazala' then 'خليج غزالة بالساحل الشمالي'
    when loc ~* 'hamam' then 'الحمام بالساحل الشمالي'
    when loc ~* 'north coast|sahel|الساحل' then 'الساحل الشمالي'
    when loc ~* 'sokhna|galala' then 'العين السخنة'
    when loc ~* 'gouna' then 'الجونة'
    when loc ~* 'alexandria' then 'الإسكندرية'
    when loc ~* 'downtown|central cairo' then 'وسط القاهرة'
    else loc end
$$;

-- Placeholder text written by an old bulk import: not real project data.
create or replace function admin_tools.is_placeholder(dp text, fin text) returns boolean
language sql immutable as $$
  select coalesce(dp, '') ~ 'في بعض المشاريع' or coalesce(fin, '') ~ 'تختلف حسب المشروع'
$$;

create or replace function admin_tools.dp_pct(t text) returns numeric
language sql immutable as $$ select (regexp_match(coalesce(t, ''), '([0-9]+(\.[0-9]+)?)\s*%'))[1]::numeric $$;

create or replace function admin_tools.years_max(t text) returns numeric
language sql immutable as $$
  select max(m[1]::numeric) from regexp_matches(coalesce(t, ''), '([0-9]+(\.[0-9]+)?)\s*(years?|yrs?|y\y|سنة|سنوات|سنين)', 'gi') m
$$;

create or replace function admin_tools.delivery_label(t text) returns text
language plpgsql immutable as $$
declare m text[];
begin
  if t is null or trim(t) = '' or t ~* 'varies' then return null; end if;
  if t ~* 'ready|immediate|فوري' then return 'استلام فوري'; end if;
  m := regexp_match(t, '([0-9]{4})-([0-9]{2})');
  if m is not null then return 'في ' || admin_tools.ar_month(make_date(m[1]::int, m[2]::int, 1)); end if;
  m := regexp_match(t, 'Q\s*([1-4])\D*([0-9]{4})', 'i');
  if m is not null then return 'في الربع ' || (array['الأول','الثاني','الثالث','الرابع'])[m[1]::int] || ' من ' || m[2]; end if;
  m := regexp_match(t, '([0-9]+(\.[0-9]+)?)\s*(years?|سنوات|سنة|سنين)', 'i');
  if m is not null then return 'خلال ' || admin_tools.years_ar(m[1]::numeric) || ' من التعاقد'; end if;
  m := regexp_match(t, '([0-9]+)\s*months?', 'i');
  if m is not null then return 'خلال ' || m[1] || ' شهر من التعاقد'; end if;
  m := regexp_match(t, '(20[2-4][0-9])');
  if m is not null then return 'في ' || m[1]; end if;
  return null;
end $$;

create or replace function admin_tools.finishing_label(t text) returns text
language sql immutable as $$
  select case
    when t is null or trim(t) = '' then null
    when t ~* 'core' then 'كور آند شل (بدون تشطيب داخلي)'
    when t ~* 'semi' then 'نصف تشطيب'
    when t ~* 'not fin|unfinish' then 'بدون تشطيب'
    when t ~* 'flexi' then 'تشطيب مرن (Flexi)'
    when t ~* 'furnish' then 'مفروشة'
    when t ~* 'finish|تشطيب كامل' then 'تشطيب كامل'
    else null end
$$;

-- One normalized row per available unit of a project.
create or replace function admin_tools.project_units(pid uuid)
returns table(fam text, area numeric, price numeric, dp numeric, yrs numeric, deliv text, fin text, upd date)
language sql stable set search_path = public as $$
  select admin_tools.unit_family(u.unit_type),
         nullif(admin_tools.num(u.area_sqm::text), 0),
         nullif(admin_tools.num(u.starting_price::text), 0),
         case when admin_tools.is_placeholder(u.down_payment_text, u.finishing) then null else admin_tools.dp_pct(u.down_payment_text) end,
         case when admin_tools.is_placeholder(u.down_payment_text, u.finishing) then null else admin_tools.years_max(u.installments_text) end,
         case when admin_tools.is_placeholder(u.down_payment_text, u.finishing) then null else admin_tools.delivery_label(u.delivery_text) end,
         case when admin_tools.is_placeholder(u.down_payment_text, u.finishing) then null else admin_tools.finishing_label(u.finishing) end,
         u.last_updated_at::date
  from units u
  where u.project_id = pid and u.availability_status = 'available'
$$;

create or replace function admin_tools.area_range(a1 numeric, a2 numeric) returns text
language sql immutable as $$
  select case when a1 is null then null when a1 = a2 then admin_tools.fmt(a1) || ' م²'
              else admin_tools.fmt(a1) || '–' || admin_tools.fmt(a2) || ' م²' end
$$;

create or replace function admin_tools.build_project_faq(pid uuid) returns jsonb
language plpgsql volatile set search_path = public as $$
declare
  p record; n text; loc text; dated text; faq jsonb := '[]'::jsonb;
  cnt int; m record; others text; txt text; parts text[];
  dmin numeric; dmax numeric; ymin numeric; ymax numeric;
  pmin numeric; pmax numeric; fams int; a record; b record;
  ready int; known int; labels text;
begin
  select * into p from projects where id = pid;
  if not found then return null; end if;
  n := p.name; loc := admin_tools.location_ar(p.location);
  set local client_min_messages = warning;
  create temp table if not exists _pu (fam text, area numeric, price numeric, dp numeric, yrs numeric, deliv text, fin text, upd date) on commit drop;
  truncate _pu;
  insert into _pu select * from admin_tools.project_units(pid);
  select count(*) into cnt from _pu where price is not null;
  if cnt = 0 then return null; end if;
  dated := 'آخر تحديث: ' || admin_tools.ar_month((select max(upd) from _pu)) || '.';
  select count(distinct fam) into fams from _pu where price is not null;

  -- 1. Starting price + per-type starting prices
  select fam, area, price into m from _pu where price is not null order by price, area nulls last limit 1;
  select string_agg(admin_tools.family_label(f) || ' من حوالي ' || admin_tools.money_short(mp) || ' جنيه', '، ' order by mp)
    into others from (select fam f, min(price) mp from _pu where price is not null and fam <> m.fam group by fam order by mp limit 4) x;
  faq := faq || jsonb_build_object('question', 'أسعار ' || n || ' بتبدأ من كام في ' || extract(year from current_date)::int || '؟',
    'answer', 'تبدأ الأسعار المعروضة في ' || n || ' من ' || admin_tools.fmt(m.price) || ' جنيه (' || admin_tools.family_single(m.fam)
      || coalesce(' ' || admin_tools.fmt(m.area) || ' م²', '') || ').' || coalesce(' وبحسب النوع: ' || others || '.', '') || ' ' || dated);

  -- 2. Payment plan
  select min(dp), max(dp), min(yrs), max(yrs) into dmin, dmax, ymin, ymax from _pu;
  if dmin is not null or ymax is not null then
    parts := array[]::text[];
    if dmin is not null then
      parts := parts || case when dmin = dmax and dmin = 0 then 'بدون مقدم'
                             when dmin = dmax then 'مقدم ' || admin_tools.dec(dmin) || '%'
                             when dmin = 0 then 'مقدم يبدأ من 0% (بدون مقدم) في بعض الوحدات'
                             else 'مقدم يبدأ من ' || admin_tools.dec(dmin) || '%' end;
    end if;
    if ymax is not null then
      parts := parts || case when ymin = ymax then 'تقسيط على ' || admin_tools.years_ar(ymax)
                             else 'تقسيط يصل إلى ' || admin_tools.years_ar(ymax) end;
    end if;
    faq := faq || jsonb_build_object('question', 'إيه نظام السداد في ' || n || '؟',
      'answer', 'نظام السداد المتاح على الوحدات المعروضة في ' || n || ': ' || array_to_string(parts, ' و') || '. قد تختلف الخطة حسب الوحدة وتاريخ الحجز، ونأكدها وقت الطلب. ' || dated);
  end if;

  -- 3. Price per square meter
  select min(price / area), max(price / area), count(*) into pmin, pmax, cnt from _pu where price is not null and area is not null;
  if cnt >= 2 then
    txt := case when round(pmin / 1000) = round(pmax / 1000)
                then 'سعر المتر في الوحدات المعروضة في ' || n || ' حوالي ' || admin_tools.thousands(pmin) || ' جنيه.'
                else 'سعر المتر في الوحدات المعروضة في ' || n || ' يتراوح بين حوالي ' || admin_tools.thousands(pmin) || ' و' || admin_tools.thousands(pmax) || ' جنيه حسب نوع الوحدة.' end;
    if fams >= 2 then
      select string_agg(admin_tools.family_label(f) || case when round(l / 1000) = round(h / 1000) then ' حوالي ' || admin_tools.thousands(l)
                         else ' من ' || admin_tools.fmt(round(l / 1000)) || ' لـ' || admin_tools.thousands(h) end, '، ' order by l)
        into others from (select fam f, min(price / area) l, max(price / area) h from _pu where price is not null and area is not null group by fam order by min(price / area) limit 4) x;
      txt := txt || ' ' || others || ' جنيه للمتر.';
    end if;
    faq := faq || jsonb_build_object('question', 'سعر المتر في ' || n || ' كام؟', 'answer', txt || ' ' || dated);
  end if;

  -- 4. Maintenance deposit (confirmed by the owner for Mountain View projects only)
  if p.developer ~* '^mountain view' then
    faq := faq || jsonb_build_object('question', 'وديعة الصيانة في ' || n || ' كام؟',
      'answer', 'وديعة الصيانة في مشاريع Mountain View عمومًا 8% من سعر الوحدة. تأكد من النسبة وموعد سدادها في عقد الوحدة قبل التعاقد.');
  end if;

  -- 5. Unit types and areas
  select string_agg(admin_tools.family_label(f) || coalesce(' ' || admin_tools.area_range(a1, a2), ''), '، ' order by mp)
    into others from (select fam f, min(area) a1, max(area) a2, min(price) mp from _pu group by fam) x;
  faq := faq || jsonb_build_object('question', 'إيه أنواع الوحدات والمساحات في ' || n || '؟',
    'answer', 'الوحدات المعروضة في ' || n || ' تشمل ' || others || '. المساحات المتاحة بتتغير حسب المخزون. ' || dated);

  -- 6. Difference between the two most common types
  if fams >= 2 then
    select fam, min(area) a1, max(area) a2, min(price) mp, min(price / area) ppm, count(*) c into a
      from _pu where price is not null group by fam order by count(*) desc, min(price) limit 1;
    select fam, min(area) a1, max(area) a2, min(price) mp, min(price / area) ppm, count(*) c into b
      from _pu where price is not null and fam <> a.fam group by fam order by count(*) desc, min(price) limit 1;
    if a.mp > b.mp then m := a; a := b; b := m; end if;
    faq := faq || jsonb_build_object('question', 'إيه الفرق بين ' || admin_tools.family_label(a.fam) || ' و' || admin_tools.family_label(b.fam) || ' في ' || n || '؟',
      'answer', admin_tools.family_label(a.fam) || ' في ' || n || coalesce(case when a.a1 = a.a2 then ' بمساحة ' else ' بمساحات ' end || admin_tools.area_range(a.a1, a.a2), '') || ' وتبدأ من حوالي ' || admin_tools.money_short(a.mp) || ' جنيه'
        || coalesce(' (من حوالي ' || admin_tools.thousands(a.ppm) || ' جنيه للمتر)', '') || '، أما ' || admin_tools.family_label(b.fam)
        || coalesce(case when b.a1 = b.a2 then ' فبمساحة ' else ' فبمساحات ' end || admin_tools.area_range(b.a1, b.a2), '') || ' وتبدأ من حوالي ' || admin_tools.money_short(b.mp) || ' جنيه'
        || coalesce(' (من حوالي ' || admin_tools.thousands(b.ppm) || ' جنيه للمتر)', '') || '. ' || dated);
  end if;

  -- 7. Finishing
  select count(distinct fin) into cnt from _pu where fin is not null;
  if cnt = 1 then
    select max(fin) into txt from _pu;
    faq := faq || jsonb_build_object('question', 'الوحدات في ' || n || ' بتتسلم بأي تشطيب؟',
      'answer', 'الوحدات المعروضة حاليًا في ' || n || ' بتتسلم ' || txt || '. تأكد من مواصفات التشطيب المكتوبة في عقد الوحدة نفسها. ' || dated);
  elsif cnt > 1 then
    select string_agg(admin_tools.family_label(f) || ': ' || fl, '، ') into txt
      from (select fam f, string_agg(distinct fin, ' أو ') fl from _pu where fin is not null group by fam) x;
    faq := faq || jsonb_build_object('question', 'الوحدات في ' || n || ' بتتسلم بأي تشطيب؟',
      'answer', 'التشطيب في ' || n || ' بيختلف حسب الوحدة — ' || txt || '. تأكد من مواصفات التشطيب المكتوبة في عقد الوحدة نفسها. ' || dated);
  end if;

  -- 8. Location + nearby projects on the site
  select string_agg(name, '، ' order by name) into others from (
    select q.name from projects q where q.id <> pid and q.slug is not null and admin_tools.location_ar(q.location) = loc
      and exists (select 1 from units u where u.project_id = q.id and u.availability_status = 'available')
    order by q.name limit 3) x;
  faq := faq || jsonb_build_object('question', n || ' فين بالظبط؟',
    'answer', 'يقع ' || n || ' في ' || loc || '.' || coalesce(' ومن المشاريع القريبة المعروضة على Tycoons: ' || others || '.', ''));

  -- 9. Delivery
  select count(*) filter (where deliv = 'استلام فوري'), count(deliv) into ready, known from _pu;
  if known > 0 then
    select string_agg(deliv, ' أو ') into labels from (
      select deliv from _pu where deliv is not null and deliv <> 'استلام فوري' group by deliv order by count(*) desc limit 3) x;
    if ready > 0 then
      faq := faq || jsonb_build_object('question', 'هل في وحدات استلام فوري في ' || n || '؟',
        'answer', case when labels is null then 'نعم، كل الوحدات المعروضة حاليًا في ' || n || ' استلام فوري. '
                       else 'نعم، في ' || ready || ' وحدة استلام فوري من الوحدات المعروضة في ' || n || '، وباقي الوحدات موعد استلامها ' || labels || '. ' end || dated);
    else
      faq := faq || jsonb_build_object('question', 'موعد استلام ' || n || ' إمتى؟',
        'answer', 'موعد الاستلام المعلن للوحدات المعروضة في ' || n || ' ' || labels || ' حسب الوحدة، والموعد النهائي بيتحدد في عقد الحجز. ' || dated);
    end if;
  end if;

  -- 10. Developer + their other projects on the site
  select string_agg(name, '، ' order by name) into others from (
    select q.name from projects q where q.id <> pid and q.slug is not null and q.developer = p.developer
      and exists (select 1 from units u where u.project_id = q.id and u.availability_status = 'available')
    order by q.name limit 3) x;
  faq := faq || jsonb_build_object('question', 'مين مطور ' || n || '؟',
    'answer', 'مطور ' || n || ' هو ' || p.developer || '.' || coalesce(' وله مشاريع تانية معروضة على Tycoons منها ' || others || '.', ''));

  return faq;
end $$;
