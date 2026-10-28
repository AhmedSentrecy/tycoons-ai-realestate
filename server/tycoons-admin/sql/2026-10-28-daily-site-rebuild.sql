-- Daily site update (28 Oct 2026). Applied in Supabase on 28 Oct 2026.
--
-- Every Netlify production deploy costs credits. The admin used to deploy after each edit
-- (3 minutes apart at most), which used the whole monthly allowance: 194 deploys = 2,910 of
-- 3,000 credits in Oct 2026.
--
-- How it works now:
--   media_admin_settings
--     netlify_build_hook      -> the rebuild-gate edge function (…/functions/v1/rebuild-gate/<secret>)
--     netlify_build_hook_real -> the real Netlify build hook
--     rebuild_gate_secret     -> the <secret> part of the gate URL
--     rebuild_pending_since   -> set by the gate when an edit asked for an automatic rebuild
--     last_site_deploy_at     -> last deploy started by the gate (manual button) or by this job
--   Manual "حدّث الموقع" presses go through the gate straight to Netlify.
--   Everything else waits for this job: once a day at 02:00 UTC (04:00 Cairo in winter,
--   05:00 in summer time) it deploys if anything changed since the last deploy.
--
-- Setup values (run once by hand, not stored in the repo):
--   insert into media_admin_settings(key,value,updated_at) select 'netlify_build_hook_real', value, now() from media_admin_settings where key='netlify_build_hook';
--   insert into media_admin_settings(key,value,updated_at) values ('rebuild_gate_secret', encode(extensions.gen_random_bytes(18),'hex'), now());
--   update media_admin_settings set value = 'https://coqnjymekrkoausiiytm.supabase.co/functions/v1/rebuild-gate/' || <secret> where key='netlify_build_hook';

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

create or replace function public.site_daily_rebuild()
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  hook text;
  last_deploy timestamptz;
  changed boolean;
begin
  select value into hook from public.media_admin_settings where key = 'netlify_build_hook_real';
  if coalesce(hook, '') !~ '^https://api\.netlify\.com/build_hooks/[a-zA-Z0-9]{10,}$' then
    return 'no_build_hook';
  end if;

  select nullif(value, '')::timestamptz into last_deploy from public.media_admin_settings where key = 'last_site_deploy_at';
  last_deploy := coalesce(last_deploy, '2000-01-01'::timestamptz);

  changed :=
    exists (select 1 from public.media_admin_settings where key = 'rebuild_pending_since' and value <> '')
    or exists (select 1 from public.units where last_updated_at > last_deploy or created_at > last_deploy)
    or exists (select 1 from public.projects where last_updated_at > last_deploy or created_at > last_deploy)
    or exists (select 1 from public.editorial_articles where updated_at > last_deploy or published_at > last_deploy)
    or exists (select 1 from public.developers where updated_at > last_deploy)
    or exists (select 1 from public.admin_change_requests where created_at > last_deploy or reviewed_at > last_deploy);
  if not changed then
    return 'nothing_changed';
  end if;

  perform net.http_post(
    url := hook || '?trigger_title=Daily%20site%20update',
    body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json')
  );

  delete from public.media_admin_settings where key = 'rebuild_pending_since';
  insert into public.media_admin_settings (key, value, updated_at)
  values ('last_site_deploy_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), now())
  on conflict (key) do update set value = excluded.value, updated_at = excluded.updated_at;
  return 'triggered';
end;
$$;

revoke all on function public.site_daily_rebuild() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'daily-site-rebuild';
select cron.schedule('daily-site-rebuild', '0 2 * * *', 'select public.site_daily_rebuild();');
