-- Claude drafts run in a background function and can take several minutes: keep the
-- generation lock 10 minutes (was 180 seconds) so a waiting admin never buys a second draft.
create or replace function public.admin_claim_article_generation(
  p_user_id uuid, p_session_hash text, p_idempotency_key text, p_payload_fingerprint text
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare r public.article_generation_requests; quota_count integer; next_lock uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  delete from public.article_generation_requests where expires_at < now() - interval '1 hour';
  select * into r from public.article_generation_requests
    where session_hash = p_session_hash and idempotency_key = p_idempotency_key for update;
  if found then
    if r.user_id <> p_user_id or r.payload_fingerprint <> p_payload_fingerprint then
      return jsonb_build_object('state','conflict');
    end if;
    if r.status = 'completed' and r.expires_at > now() then
      return jsonb_build_object('state','replay','response',r.response_json);
    end if;
    if r.status = 'in_progress' and r.locked_until > now() then
      return jsonb_build_object('state','busy','retry_after_seconds',greatest(1,ceil(extract(epoch from (r.locked_until-now())))::integer));
    end if;
    if r.attempts >= 3 then return jsonb_build_object('state','exhausted'); end if;
    next_lock := gen_random_uuid();
    update public.article_generation_requests set status='in_progress', lock_token=next_lock,
      locked_until=now()+interval '600 seconds', attempts=attempts+1, updated_at=now(), last_error=null
      where id=r.id;
    return jsonb_build_object('state','claimed','lock_token',next_lock,'attempt',r.attempts+1);
  end if;
  select count(*) into quota_count from public.article_generation_requests
    where user_id=p_user_id and created_at >= now()-interval '10 minutes';
  if quota_count >= 6 then return jsonb_build_object('state','rate_limited'); end if;
  next_lock := gen_random_uuid();
  insert into public.article_generation_requests(user_id,session_hash,idempotency_key,payload_fingerprint,status,lock_token,locked_until)
    values(p_user_id,p_session_hash,p_idempotency_key,p_payload_fingerprint,'in_progress',next_lock,now()+interval '600 seconds');
  return jsonb_build_object('state','claimed','lock_token',next_lock,'attempt',1);
end; $$;
