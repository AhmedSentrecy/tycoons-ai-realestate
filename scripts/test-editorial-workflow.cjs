const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createJobInput, dryRunPilot, validatePackage, MONTHLY_BUDGET_CENTS, MAX_ATTEMPTS } = require("../netlify/functions/_editorial-workflow.cjs");

const job = createJobInput({ content_type: "comparison", primary_entity_id: "project-a", secondary_entity_id: "project-b", area_name: "New Cairo", topic: "Compare verified payment plans", source_input: "https://example.test/source" });
assert.match(job.idempotency_key, /^editorial:[a-f0-9]{64}$/);
assert.deepEqual(job.discovery_sources, ["Flat & Villa", "RealEstate.eg"]);
assert.equal(MONTHLY_BUDGET_CENTS, 5000);
assert.equal(MAX_ATTEMPTS, 3);

const pilot = dryRunPilot();
assert.equal(pilot.validation.status, "needs_review", "unknown media rights must block automatic publication");
assert.equal(pilot.validation.auto_publish_eligible, false);
assert.deepEqual(pilot.validation.exceptions.map((item) => item.code), ["media_rights_unknown"]);
assert.equal(pilot.package.claims_current_price, false, "pilot must not invent a current price");
assert.equal(pilot.package.claims_availability, false, "pilot must not invent availability");
assert.equal(pilot.proposed_budget.paid_execution_enabled, false);

const hostile = { ...pilot.package, media_assets: [], draft_ar: { ...pilot.package.draft_ar, body_markdown: '<script>fetch("/admin")</script>' } };
const hostileValidation = validatePackage(hostile, new Date("2026-10-08T00:00:00Z"));
assert.equal(hostileValidation.auto_publish_eligible, false);
assert.equal(hostileValidation.checks.find((check) => check.gate === "html_safety").passed, false, "source content cannot inject executable instructions");
const shapeOnly = validatePackage({ ...pilot.package, media_assets: [], review_kind: null }, new Date("2026-10-08T00:00:00Z"));
assert.equal(shapeOnly.auto_publish_eligible, false, "package-shape checks can never attest semantic facts or authorize publication");

const migration = fs.readFileSync(path.join(__dirname, "../supabase-migrations/2026-10-08-editorial-workflow.sql"), "utf8");
assert.match(migration, /schedule_enabled boolean not null default false/);
assert.match(migration, /monthly_budget_cents integer not null default 5000/);
assert.match(migration, /review_kind text check \(review_kind is null or review_kind in \('human','automated_validation'\)\)/);
assert.match(migration, /pg_advisory_xact_lock/);
assert.match(migration, /pg_advisory_xact_lock\(hashtextextended\('editorial_claim_capacity',0\)\)[\s\S]*pg_advisory_xact_lock\(hashtextextended\(p_job_id::text,0\)\)/, "different-job claims must serialize shared capacity before taking the job lock");
assert.match(migration, /admin_create_editorial_job/, "run and job creation must be transactional and idempotent");
assert.match(migration, /status=p_expected_status and revision=p_expected_revision/, "retry must conditionally match status and revision");
assert.match(migration, /unique\(operation_key,kind\)/, "budget reservation and settlement entries must be idempotent");
assert.match(migration, /billing_month=month_start/, "settlement must retain the reservation billing period across month rollover");
assert.doesNotMatch(migration, /p_actual_cents>reserved/, "actual provider spend must be recorded even when it exceeds the estimate");
assert.match(migration, /Financial truth is anchored to the prior reservation/, "settlement must survive an expired worker lease");
assert.match(migration, /article_pair_stale/, "rollback must reject independently edited, reviewed, or published paired articles");
assert.match(migration, /ar\.revision<>p_expected_ar_revision[\s\S]*en\.revision<>p_expected_en_revision[\s\S]*ar\.status<>'draft'/, "rollback must compare each article revision and retain draft-only scope");
assert.match(migration, /e\.claim_key=p_resolution->>'claim_key'[\s\S]*t\.source_entity_id in \(j\.primary_entity_id,j\.secondary_entity_id,j\.area_name\)/, "trusted evidence links must match the job entity and claim");
assert.match(migration, /result_status := 'needs_review'/, "provider output must never directly authorize ready_auto");
assert.match(migration, /grant execute on function public\.admin_reserve_editorial_budget[\s\S]*to service_role/);
assert.doesNotMatch(migration, /grant .* to anon|grant .* to authenticated/i);

const admin = fs.readFileSync(path.join(__dirname, "../server/tycoons-admin/index.ts"), "utf8");
assert.match(admin, /editorial_job_duplicate/);
assert.match(admin, /paid_execution_enabled: false/);
assert.match(admin, /EDITORIAL_RETRYABLE/);

console.log(JSON.stringify({
  example: "PRK Vie bilingual project guide",
  status: pilot.validation.status,
  evidence_sources: pilot.package.evidence.length,
  precise_gaps: pilot.validation.exceptions,
  paid_execution_enabled: false,
}, null, 2));
console.log("Editorial workflow dry-run, budget, validation, and privilege checks passed.");
