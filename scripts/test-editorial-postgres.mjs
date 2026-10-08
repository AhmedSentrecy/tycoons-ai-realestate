import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";

const psql = process.env.PG_TEST_PSQL;
if (!psql) throw new Error("PG_TEST_PSQL is required");
const cwd = path.resolve(import.meta.dirname, "..");
const env = { ...process.env, PGHOST: process.env.PGHOST || "127.0.0.1", PGPORT: process.env.PGPORT || "55432", PGUSER: process.env.PGUSER || "postgres", PGDATABASE: process.env.PGDATABASE || "editorial_test" };

function sql(text, { ok = true } = {}) {
  const result = spawnSync(psql, ["-X", "-v", "ON_ERROR_STOP=1", "-Atq"], { cwd, env, input: text, encoding: "utf8" });
  if (ok && result.status !== 0) throw new Error(result.stderr || result.stdout);
  if (!ok) assert.notEqual(result.status, 0, "statement unexpectedly succeeded");
  return result.stdout.trim();
}

function sqlAsync(text) {
  return new Promise((resolve, reject) => {
    const child = spawn(psql, ["-X", "-v", "ON_ERROR_STOP=1", "-Atq"], { cwd, env, stdio: ["pipe", "pipe", "pipe"] });
    let out = "", error = "";
    child.stdout.on("data", (chunk) => { out += chunk; });
    child.stderr.on("data", (chunk) => { error += chunk; });
    child.on("close", (code) => code === 0 ? resolve(out.trim()) : reject(new Error(error || out)));
    child.stdin.end(text);
  });
}

const owner = "10000000-0000-4000-8000-000000000001";
const project = "20000000-0000-4000-8000-000000000001";
const parse = (value) => JSON.parse(value.split(/\r?\n/).at(-1));
const create = (key, topic = key) => `select public.admin_create_editorial_job('${owner}','${key}','project','${project}',null,null,'${topic}',null);`;

// Independent connections: identical creation is exactly-once; different keys both survive.
const same = await Promise.all([sqlAsync(create("concurrent-same-key-0001")), sqlAsync(create("concurrent-same-key-0001"))]);
assert.deepEqual(same.map(parse).map((x) => x.state).sort(), ["created", "duplicate"]);
assert.equal(sql("select count(*) from public.editorial_jobs where idempotency_key='concurrent-same-key-0001';"), "1");
const different = await Promise.all([sqlAsync(create("concurrent-different-a")), sqlAsync(create("concurrent-different-b"))]);
assert.ok(different.map(parse).every((x) => x.state === "created"));

// Global capacity is shared across different jobs and enforced across connections.
const capacityIds = sql("select string_agg(id::text,',') from public.editorial_jobs where idempotency_key in ('concurrent-different-a','concurrent-different-b');").split(",");
const claims = await Promise.all(capacityIds.map((id) => sqlAsync(`select public.admin_claim_editorial_job('${id}','${owner}');`)));
assert.deepEqual(claims.map(parse).map((x) => x.state).sort(), ["capacity", "claimed"]);
const activeId = sql("select id from public.editorial_jobs where status='verifying' limit 1;");
assert.equal(parse(sql(`select public.admin_claim_editorial_job('${activeId}','${owner}');`)).state, "busy");

// Expired leases recover; future retries do not claim early.
sql(`update public.editorial_jobs set locked_until=now()-interval '1 second' where id='${activeId}';`);
assert.equal(parse(sql(`select public.admin_claim_editorial_job('${activeId}','${owner}');`)).state, "claimed");
sql(`update public.editorial_jobs set status='retry_wait',lock_token=null,locked_until=null,next_retry_at=now()+interval '1 hour' where id='${activeId}';`);
assert.equal(parse(sql(`select public.admin_claim_editorial_job('${activeId}','${owner}');`)).state, "not_due");
sql(`update public.editorial_jobs set next_retry_at=now()-interval '1 second' where id='${activeId}'; update public.editorial_jobs set locked_until=now()-interval '1 second' where status='verifying';`);
assert.equal(parse(sql(`select public.admin_claim_editorial_job('${activeId}','${owner}');`)).state, "claimed");

// Budget functions and tables are denied to browser roles.
for (const role of ["anon", "authenticated"]) {
  sql(`set role ${role}; select public.admin_reserve_editorial_budget(gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),'forbidden',1);`, { ok: false });
  sql(`set role ${role}; insert into public.editorial_budget_ledger(kind,operation_key,amount_cents) values('usage','forbidden-${role}',1);`, { ok: false });
}

// Complete a real paired bilingual draft; validation_results must remain an array.
sql("update public.editorial_jobs set locked_until=now()-interval '1 second' where status='verifying';");
const paired = parse(sql(create("paired-completion-0001", "Paired completion")));
const pairedId = paired.job.id;
const pairedClaim = parse(sql(`select public.admin_claim_editorial_job('${pairedId}','${owner}');`));
const hashA = "a".repeat(64), hashB = "b".repeat(64);
const draftAr = JSON.stringify({ language:"ar",title:"Arabic synthetic title",slug:"synthetic-ar",excerpt:"Synthetic excerpt",body_markdown:"Synthetic body",meta_title:"Synthetic Arabic",meta_description:"Synthetic Arabic description",content_hash:hashA });
const draftEn = JSON.stringify({ language:"en",title:"English synthetic title",slug:"synthetic-en",excerpt:"Synthetic excerpt",body_markdown:"Synthetic body",meta_title:"Synthetic English",meta_description:"Synthetic English description",content_hash:hashB });
const evidence = JSON.stringify([{ id:"official",url:"https://example.test/source" }]);
const completion = parse(sql(`select public.admin_complete_editorial_job('${pairedId}','${owner}','${pairedClaim.lock_token}','${evidence}'::jsonb,'[]'::jsonb,'[{"gate":"semantic_review","passed":false}]'::jsonb,'[]'::jsonb,'${draftAr}'::jsonb,'${draftEn}'::jsonb,'{}'::jsonb,0,'fixture-response');`));
assert.equal(completion.state, "completed");
assert.equal(sql(`select jsonb_typeof(validation_results)||':'||cardinality(published_article_ids) from public.editorial_jobs where id='${pairedId}';`), "array:2");
assert.equal(sql(`select count(*) from public.editorial_articles where id in (select unnest(published_article_ids) from public.editorial_jobs where id='${pairedId}');`), "2");

// Reservation replay, ambiguous retained reservation, overrun truth, and original billing month.
sql("update public.editorial_jobs set locked_until=now()-interval '1 second' where status='verifying';");
const budgetJob = parse(sql(create("budget-job-0001", "Budget test")));
const budgetId = budgetJob.job.id;
const budgetRun = budgetJob.run_id;
const budgetClaim = parse(sql(`select public.admin_claim_editorial_job('${budgetId}','${owner}');`));
assert.equal(sql(`select public.admin_reserve_editorial_budget('${budgetRun}','${budgetId}','${budgetClaim.lock_token}','budget-overrun-op',100);`), "t");
assert.equal(sql(`select public.admin_reserve_editorial_budget('${budgetRun}','${budgetId}','${budgetClaim.lock_token}','budget-overrun-op',100);`), "t");
assert.equal(sql(`select count(*) from public.editorial_budget_ledger where operation_key='budget-overrun-op' and kind='reservation';`), "1");
sql("update public.editorial_budget_ledger set billing_month=(date_trunc('month',now())-interval '1 month')::date where operation_key='budget-overrun-op';");
sql(`update public.editorial_jobs set locked_until=now()-interval '1 second' where id='${budgetId}';`);
assert.equal(sql(`select public.admin_settle_editorial_budget('${budgetId}','budget-overrun-op',275,'{"input_tokens":10}'::jsonb,'resp-overrun');`), "t");
assert.equal(sql(`select public.admin_settle_editorial_budget('${budgetId}','budget-overrun-op',275,'{}'::jsonb,'resp-overrun');`), "t");
assert.equal(sql(`select public.admin_settle_editorial_budget('${budgetId}','budget-overrun-op',276,'{}'::jsonb,'resp-overrun');`), "f");
assert.equal(sql("select count(distinct billing_month)||':'||sum(case when kind='usage' then amount_cents else 0 end) from public.editorial_budget_ledger where operation_key='budget-overrun-op';"), "1:275");
assert.equal(sql(`select cost_reserved_cents||':'||cost_used_cents||':'||provider_response_id from public.editorial_jobs where id='${budgetId}';`), "0:275:resp-overrun");
const ambiguous = parse(sql(create("budget-ambiguous-0001", "Ambiguous cost")));
sql("update public.editorial_jobs set locked_until=now()-interval '1 second' where status='verifying';");
const ambiguousClaim = parse(sql(`select public.admin_claim_editorial_job('${ambiguous.job.id}','${owner}');`));
assert.equal(sql(`select public.admin_reserve_editorial_budget('${ambiguous.run_id}','${ambiguous.job.id}','${ambiguousClaim.lock_token}','budget-ambiguous-op',150);`), "t");
assert.equal(sql("select count(*) from public.editorial_budget_ledger where operation_key='budget-ambiguous-op' and kind='reservation';"), "1");
assert.equal(sql("select count(*) from public.editorial_budget_ledger where operation_key='budget-ambiguous-op' and kind in ('release','usage');"), "0");

// Rollback refuses an independently edited article and changes neither job nor its peer.
const versionId = sql(`select id from public.editorial_job_versions where job_id='${pairedId}' order by created_at limit 1;`);
const beforeJobRevision = Number(sql(`select revision from public.editorial_jobs where id='${pairedId}';`));
const articleRows = JSON.parse(sql(`select json_agg(x order by language) from (select id,language,status,revision,content_hash from public.editorial_articles where id in (select unnest(published_article_ids) from public.editorial_jobs where id='${pairedId}')) x;`));
const ar = articleRows.find((x) => x.language === "ar"), en = articleRows.find((x) => x.language === "en");
sql(`update public.editorial_articles set revision=revision+1,title='Independent edit' where id='${ar.id}';`);
const stale = parse(sql(`select public.admin_control_editorial_job('${pairedId}','${owner}','rollback',${beforeJobRevision},'${versionId}',null,${ar.revision},'${ar.content_hash}','draft',${en.revision},'${en.content_hash}','draft');`));
assert.equal(stale.state, "article_pair_stale");
assert.equal(Number(sql(`select revision from public.editorial_jobs where id='${pairedId}';`)), beforeJobRevision);
assert.equal(sql(`select revision from public.editorial_articles where id='${en.id}';`), String(en.revision));
sql(`update public.editorial_articles set status='published',reviewed_by='${owner}',reviewed_by_name='Synthetic owner',reviewed_at=now(),published_at=now() where id='${en.id}';`);
const publishedStale = parse(sql(`select public.admin_control_editorial_job('${pairedId}','${owner}','rollback',${beforeJobRevision},'${versionId}',null,${ar.revision+1},'${ar.content_hash}','draft',${en.revision},'${en.content_hash}','draft');`));
assert.equal(publishedStale.state, "article_pair_stale");

console.log("PostgreSQL runtime tests passed: migrations, idempotency, global capacity, leases/retries, ACLs, paired drafts, accounting, and atomic rollback rejection.");
