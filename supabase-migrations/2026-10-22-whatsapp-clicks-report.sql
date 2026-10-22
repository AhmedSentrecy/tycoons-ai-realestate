-- Admin report for WhatsApp clicks (tab "دوسات الواتساب" in /admin).
--
-- Callable with the public key, but it only answers a logged-in, active OWNER:
-- the caller passes their /admin session token, which is checked exactly like the
-- tycoons-admin Edge Function does (SHA-256 hash in media_admin_sessions, not expired,
-- user active). Rows themselves stay unreadable with the public key.
-- Read-only: aggregates public.whatsapp_clicks, changes nothing.

create or replace function public.admin_whatsapp_clicks_report(p_token text, p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_role text;
  v_days integer;
  v_since timestamptz;
  v_today date;
  v_result jsonb;
begin
  if p_token is null or char_length(p_token) < 32 or char_length(p_token) > 200 then
    raise exception 'login_required' using errcode = '28000';
  end if;

  select u.role into v_role
  from public.media_admin_sessions s
  join public.admin_users u on u.id = s.user_id
  where s.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and s.expires_at > now()
    and u.active;

  if v_role is null then
    raise exception 'login_required' using errcode = '28000';
  end if;
  if v_role <> 'owner' then
    raise exception 'owner_only' using errcode = '42501';
  end if;

  v_days := case when p_days in (7, 30, 90) then p_days else 30 end;
  v_since := now() - make_interval(days => v_days);
  v_today := (now() at time zone 'Africa/Cairo')::date;

  with rows as (
    select *
    from public.whatsapp_clicks
    where created_at >= v_since
    order by created_at desc
    limit 20000
  ),
  named as (
    select
      r.*,
      coalesce(nullif(btrim(r.traffic_source), ''), 'غير معروف') as k_source,
      nullif(btrim(coalesce(r.project_name, r.project_slug)), '') as k_project,
      coalesce(nullif(btrim(r.page_path), ''), 'غير معروف') as k_page,
      coalesce(nullif(btrim(r.source), ''), 'غير معروف') as k_button,
      coalesce(nullif(btrim(r.device), ''), 'غير معروف') as k_device,
      -- 'tycoons_lead' is the column default, not a real campaign.
      nullif(nullif(btrim(r.utm_campaign), ''), 'tycoons_lead') as k_campaign
    from rows r
  )
  select jsonb_build_object(
    'days', v_days,
    'total', (select count(*) from named),
    'truncated', (select count(*) from named) >= 20000,
    'by_day', (
      select coalesce(jsonb_agg(jsonb_build_object('day', to_char(d.day, 'YYYY-MM-DD'), 'clicks', coalesce(c.clicks, 0)) order by d.day), '[]'::jsonb)
      from generate_series(v_today - (v_days - 1), v_today, interval '1 day') as d(day)
      left join (
        select (created_at at time zone 'Africa/Cairo')::date as day, count(*) as clicks
        from named group by 1
      ) c on c.day = d.day::date
    ),
    'by_traffic_source', (select coalesce(jsonb_agg(jsonb_build_object('name', name, 'clicks', clicks) order by clicks desc, name), '[]'::jsonb)
      from (select k_source as name, count(*) as clicks from named group by 1 order by 2 desc, 1 limit 10) x),
    'by_project', (select coalesce(jsonb_agg(jsonb_build_object('name', name, 'clicks', clicks) order by clicks desc, name), '[]'::jsonb)
      from (select k_project as name, count(*) as clicks from named where k_project is not null group by 1 order by 2 desc, 1 limit 10) x),
    'by_page', (select coalesce(jsonb_agg(jsonb_build_object('name', name, 'clicks', clicks) order by clicks desc, name), '[]'::jsonb)
      from (select k_page as name, count(*) as clicks from named group by 1 order by 2 desc, 1 limit 10) x),
    'by_button', (select coalesce(jsonb_agg(jsonb_build_object('name', name, 'clicks', clicks) order by clicks desc, name), '[]'::jsonb)
      from (select k_button as name, count(*) as clicks from named group by 1 order by 2 desc, 1 limit 10) x),
    'by_device', (select coalesce(jsonb_agg(jsonb_build_object('name', name, 'clicks', clicks) order by clicks desc, name), '[]'::jsonb)
      from (select k_device as name, count(*) as clicks from named group by 1 order by 2 desc, 1 limit 10) x),
    'by_campaign', (select coalesce(jsonb_agg(jsonb_build_object('name', name, 'clicks', clicks) order by clicks desc, name), '[]'::jsonb)
      from (select k_campaign as name, count(*) as clicks from named where k_campaign is not null group by 1 order by 2 desc, 1 limit 10) x),
    'recent', (select coalesce(jsonb_agg(jsonb_build_object(
        'created_at', created_at,
        'code', tracking_id,
        'page_path', page_path,
        'project', k_project,
        'button', coalesce(nullif(btrim(button_label), ''), source),
        'traffic_source', traffic_source,
        'device', device
      ) order by created_at desc), '[]'::jsonb)
      from (select * from named order by created_at desc limit 30) x)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.admin_whatsapp_clicks_report(text, integer) from public;
grant execute on function public.admin_whatsapp_clicks_report(text, integer) to anon, authenticated;
