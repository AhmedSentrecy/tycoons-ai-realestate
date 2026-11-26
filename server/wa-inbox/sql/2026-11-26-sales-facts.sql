-- Sales facts: every selling point (offer, launch, price increase, EOI, track record, price history,
-- rental yield, comparison, customer story) as one row. Nothing is deleted: a fact that ends becomes
-- 'expired' and stays for articles/content. Sara's file is generated from the active rows.

create table if not exists public.sales_facts (
  id bigserial primary key,
  category text not null check (category in ('urgency','offer','eoi','track_record','price_history','rental','comparison','customer_story')),
  kind text,                                   -- launch / price_increase / payment_plan / construction / research ...
  project_id uuid references public.projects(id) on delete set null,
  project_name text,
  developer text,
  area_group text,
  statement_ar text not null check (length(statement_ar) between 3 and 1500),
  details text,
  numbers jsonb,
  source_type text not null default 'owner' check (source_type in ('whatsapp','web','inventory','owner','research')),
  source_label text,                           -- what Sara reads in brackets, e.g. "حسب المطور، 2026-11-23"
  source_urls text[] not null default '{}',
  source_date date,
  update_id bigint references public.wa_project_updates(id) on delete set null,
  valid_until date,
  status text not null default 'active' check (status in ('active','expired','needs_confirmation','rejected')),
  note text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_by uuid,
  reviewed_at timestamptz
);
create index if not exists sales_facts_status_idx on public.sales_facts (status, category);
create index if not exists sales_facts_project_idx on public.sales_facts (project_id);
create unique index if not exists sales_facts_update_uidx on public.sales_facts (update_id) where update_id is not null;
alter table public.sales_facts enable row level security;   -- service role only (admin goes through wa-inbox)

-- Developer link on projects (non-breaking: the old text column stays).
alter table public.projects add column if not exists developer_slug text;
update public.projects p set developer_slug = d.slug
from public.developers d
where p.developer_slug is null
  and (lower(d.name) = lower(p.developer) or lower(coalesce(d.name_ar,'')) = lower(p.developer)
       or exists (select 1 from unnest(coalesce(d.aliases,'{}')) a where lower(a) = lower(p.developer)));

-- A WhatsApp update the owner applies becomes a sales fact automatically.
create or replace function public.sales_facts_from_update() returns trigger
language plpgsql security definer set search_path = public as $$
declare cat text; knd text; stmt text; area text;
begin
  if new.status <> 'applied' or coalesce(old.status,'') = 'applied' then return new; end if;
  if new.update_type not in ('offer','launch','price_change','payment_plan','other') then return new; end if;
  cat := case new.update_type when 'offer' then 'offer' when 'payment_plan' then 'offer'
                              when 'other' then 'track_record' else 'urgency' end;
  knd := case new.update_type when 'price_change' then 'price_increase' when 'other' then 'construction' else new.update_type end;
  stmt := coalesce(nullif(new.summary_ar,''), nullif(new.headline_ar,''), new.details);
  if stmt is null or length(stmt) < 3 then return new; end if;
  -- the same fact typed in by hand already (same project, section, date) → don't duplicate
  if exists (select 1 from sales_facts f where f.status = 'active' and f.category = cat
               and f.project_id is not distinct from new.project_id and f.source_date = new.message_date::date) then
    return new;
  end if;
  select area_group into area from projects where id = new.project_id;
  insert into sales_facts (category, kind, project_id, project_name, developer, area_group, statement_ar, details,
                           numbers, source_type, source_label, source_date, update_id, valid_until, status, reviewed_by, reviewed_at)
  values (cat, knd, new.project_id, new.project_name, new.developer, area,
          new.project_name || coalesce(' (' || new.developer || ')', '') || ': ' || stmt, new.details,
          jsonb_strip_nulls(jsonb_build_object('down_payment', new.down_payment_text, 'installments', new.installments_text,
                                              'delivery', new.delivery_text, 'finishing', new.finishing)),
          'whatsapp', 'حسب المطور، ' || to_char(new.message_date at time zone 'Africa/Cairo', 'YYYY-MM-DD'),
          (new.message_date at time zone 'Africa/Cairo')::date, new.id,
          case when new.valid_until ~ '^\d{4}-\d{2}-\d{2}$' then new.valid_until::date end,
          case when nullif(new.summary_ar,'') is null and nullif(new.headline_ar,'') is null then 'needs_confirmation' else 'active' end,
          new.decided_by, now())
  on conflict do nothing;
  return new;
end $$;
drop trigger if exists wa_project_updates_to_sales_facts on public.wa_project_updates;
create trigger wa_project_updates_to_sales_facts after update of status on public.wa_project_updates
  for each row execute function public.sales_facts_from_update();

-- Facts whose end date passed stop being active (run daily just after midnight Cairo).
create or replace function public.sales_facts_expire() returns integer
language sql security definer set search_path = public as $$
  with x as (update sales_facts set status = 'expired', updated_at = now(),
                note = trim(coalesce(note,'') || ' انتهت تلقائي ' || to_char(now() at time zone 'Africa/Cairo','YYYY-MM-DD'))
             where status = 'active' and valid_until < (now() at time zone 'Africa/Cairo')::date returning 1)
  select count(*)::int from x;
$$;

-- Sara's file, generated from active facts + live price-per-meter comparisons from inventory
-- (per area / sub-area, outliers beyond 2.5x the area median dropped, "Other" skipped).
create or replace function public.sales_essentials_md() returns text
language plpgsql stable security definer set search_path = public as $$
declare
  out text; today date := (now() at time zone 'Africa/Cairo')::date;
  sec record; line text; cmp text := '';
  area_ar jsonb := '{"New Cairo":"القاهرة الجديدة","Mostakbal City":"مستقبل سيتي","New Capital":"العاصمة الإدارية","North Coast":"الساحل الشمالي","Sheikh Zayed":"الشيخ زايد","October":"أكتوبر","Ain Sokhna":"العين السخنة","Shorouk":"الشروق"}';
  grp record;
  sub_ar jsonb := '{"5th Settlement":"التجمع الخامس","6th Settlement":"التجمع السادس","El Shorouk":"الشروق","Golden Square":"الجولدن سكوير","Ras El Hekma":"رأس الحكمة","Sidi Abdel Rahman":"سيدي عبد الرحمن","El Dabaa":"الضبعة","New Zayed":"زايد الجديدة","South Investors":"جنوب الأكاديمية","North Investors":"شمال المستثمرين","90th Street":"شارع التسعين","North 90th Street":"شمال التسعين","South New Cairo":"جنوب القاهرة الجديدة","Financial District":"الحي المالي","El Lotus":"اللوتس"}';
begin
  out := '// Sales Essentials for Sara - sales_essentials_for_sara.md' || E'\n'
      || '// الملف ده بيتولّد لوحده من «معلومات البيع» في الأدمن (' || to_char(now() at time zone 'Africa/Cairo','YYYY-MM-DD HH24:MI') || ').' || E'\n'
      || '// أي حاجة مكتوبة هنا سارة بتقولها بثقة. اللي مش مكتوب هنا (ولا في المخزون) سارة مش بتخترعه.' || E'\n'
      || '// العروض اللي معادها عدّى بتختفي لوحدها، بس بتفضل محفوظة في الأدمن للمقالات.' || E'\n';
  for sec in select * from (values
      (1,'urgency','الندرة والاستعجال (وحدات باقية، لونشات، آخر يوم للأوفر، زيادة أسعار جاية)'),
      (2,'offer','خصومات وأوفرز خاصة (بشروطها بالظبط)'),
      (3,'eoi','أولوية الحجز و EOI'),
      (4,'track_record','سابقة أعمال المطورين (سلّم إيه وإمتى)'),
      (5,'price_history','حركة الأسعار في الماضي (حقايق حصلت، مش وعود)'),
      (6,'rental','الإيجار والعائد (بمصدره)'),
      (7,'comparison','مقارنات بالأرقام'),
      (8,'customer_story','قصص عملاء حقيقية (من غير أسماء)')) s(ord, cat, title) order by ord
  loop
    out := out || E'\n## ' || sec.title || E'\n';
    for line in
      select '- ' || f.statement_ar || coalesce(' (' || nullif(f.source_label,'') || ')', '')
      from sales_facts f
      where f.category = sec.cat and f.status = 'active' and (f.valid_until is null or f.valid_until >= today)
      order by f.valid_until nulls last, f.project_name nulls last, f.source_date desc nulls last, f.id
    loop
      out := out || line || E'\n';
    end loop;
    if sec.cat = 'comparison' then
      cmp := '';
      for grp in
        with per as (
          select p.area_group, coalesce(p.sub_area, '') sub, p.name,
                 round(percentile_cont(0.5) within group (order by u.starting_price / nullif(u.area_sqm,0)) / 1000) k,
                 count(*) n
          from units u join projects p on p.id = u.project_id
          where u.availability_status = 'available' and u.area_sqm >= 40 and u.starting_price > 100000
            and u.unit_type ilike any (array['%apartment%','%شقة%']) and p.area_group is not null and p.area_group <> 'Other'
          group by 1,2,3 having count(*) >= 3),
        med as (select area_group, sub, percentile_cont(0.5) within group (order by k) m, count(*) c from per group by 1,2),
        clean as (select per.* from per join med using (area_group, sub)
                  where med.c >= 2 and per.k between med.m / 2.5 and med.m * 2.5),
        top as (select *, row_number() over (partition by area_group, sub order by n desc, name) r from clean),
        pick as (select *, row_number() over (partition by area_group, sub order by k, name) o from top where r <= 6)
        select area_group, sub, (o - 1) / 3 g, count(*) cnt,
               string_agg(name || ' حوالي ' || to_char(k, 'FM999,999') || ' ألف جنيه', '، وفي ' order by o) txt
        from pick group by 1, 2, 3 having count(*) >= 2 order by 1, 2, 3
      loop
        cmp := cmp || '- في ' || coalesce(area_ar ->> grp.area_group, grp.area_group)
            || case when grp.sub <> '' then ' (' || coalesce(sub_ar ->> grp.sub, grp.sub) || ')' else '' end
            || ': سعر متر الشقق في ' || grp.txt
            || ' (من المخزون المتاح على الموقع، ' || to_char(today,'YYYY-MM-DD') || ')' || E'\n';
      end loop;
      out := out || cmp;
    end if;
  end loop;
  return out;
end $$;

-- Counts for the admin tab.
create or replace function public.sales_facts_counts() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'status', coalesce((select jsonb_object_agg(status, n) from (select status, count(*) n from sales_facts group by 1) s), '{}'::jsonb),
    'category_active', coalesce((select jsonb_object_agg(category, n) from (select category, count(*) n from sales_facts where status = 'active' group by 1) c), '{}'::jsonb));
$$;
revoke all on function public.sales_essentials_md() from public, anon, authenticated;
revoke all on function public.sales_facts_expire() from public, anon, authenticated;
revoke all on function public.sales_facts_counts() from public, anon, authenticated;
grant execute on function public.sales_facts_counts(), public.sales_essentials_md(), public.sales_facts_expire() to service_role;

-- Daily at 00:05 Cairo: end the facts whose last day passed.
select cron.schedule('sales-facts-expire', '5 22 * * *', $$select public.sales_facts_expire()$$);
