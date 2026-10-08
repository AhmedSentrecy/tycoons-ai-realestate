# Editorial workflow review and release notes

Base: `e5db8a28da3b776eadaa4fb38d90c53b817cd96f` (`origin/main` at integration start)

This branch is source for independent review. It has not been deployed, migrated, scheduled, or used for paid generation.

## Implemented locally

- Existing reviewed article CMS: draft editing, source references, safe rendering, review acknowledgement, owner-only publication, optimistic revision/hash concurrency, and published-only public view.
- Durable generation request claims, bounded retries, locks, per-user quota, and idempotent replay scaffolding around the existing OpenAI draft endpoint.
- Property hierarchy navigation from verified navigation commit `38647533c0ad7c2c5fb3231da2c1176e3359e5a8`.
- Admin workflow creation form and list dashboard with status, current step, evidence/exception counts, cost reservation/usage, errors, and safe retry action.
- Additive schema for durable runs, jobs, configuration, budget ledger, locks, attempts, validation state, bilingual draft fields, publication references, and automated-vs-human review identity.
- Local validation engine for evidence/package gates and a deterministic PRK Vie fixture that demonstrates exception handling.
- Voice/search race guards, monotonic instrumentation, raw-page pagination fix, inventory freshness metadata, prepared text reuse, and bounded derived-result cache.
- Disabled-by-default authenticated worker and coordinator entry points, with injectable provider, Responses web-search request contract, strict output validation, durable claim/failure handling, atomic paired-draft storage, and deterministic zero-cost end-to-end tests.
- Job detail view with persisted evidence, claim ledger, exceptions, Arabic/English preview, attempts, cost and retry state.
- Audited pause/resume and exception-acknowledgement controls, immutable draft versions, and revision-checked rollback that restores both the job package and its paired draft article rows.
- Rollback also requires the exact current revision, content hash, and `draft` status of both paired articles; an independent CMS edit, review, or publication makes the operation stale instead of being overwritten.
- Narrow trusted-entity and trusted-evidence tables with provenance, verifier, revision, freshness, and rights metadata. Linking trusted evidence records an audit resolution but does not itself attest or publish a draft.

## Mocked or scaffolded — not operational

- The PRK Vie run is a deterministic fixture. It is not a live research run, factual verification, or proof that cited pages remain current.
- The live provider code is implemented but has not been invoked. It can perform OpenAI Responses `web_search` and structured bilingual generation only when worker, paid execution, pricing configuration, budget reservation, runtime credential, migration and deployment are all explicitly enabled.
- Official-source verification is requested and provenance is structurally validated, but semantic truth cannot be deterministically certified by provider output. Completed pairs therefore remain `needs_review`; no current code promotes them to `ready_auto`.
- No unit or media import worker is connected. Media-rights validation exists, but rights records and asset ingestion are not operational.
- `ready_auto` and the automated-validation identity exist in schema, but provider output cannot set them and no automatic publisher consumes them.
- The coordinator entry point is intentionally inert until a dedicated non-human worker identity and platform-authenticated scheduled invocation exist. It refuses human admin-token automation; no Monday/Africa-Cairo schedule is registered.
- The dashboard exposes audit/version history, pause/resume, rollback, and acknowledgement-without-verification. Creating or editing trusted evidence is deliberately not exposed through this first control surface.
- The live worker has a server-only Supabase RPC adapter for idempotent reservation/settlement around paid work. It requires the existing `SUPABASE_SERVICE_ROLE_KEY` server runtime convention; the value is never exposed through the human/editor admin API. These paths remain disabled and have deterministic contract coverage only.
- Known provider response ID, usage, and actual cost are settled before content validation. Settlement is tied to the durable reservation rather than an expiring worker lease, and records over-budget actuals so subsequent reservations stop; ambiguous unknown-cost attempts retain their reservation for later reconciliation.
- Safe hosting preflight on 2026-10-08 confirmed that Netlify already lists `SUPABASE_SERVICE_ROLE_KEY` as a secret scoped to Builds, Functions, and Runtime, with values configured in four deploy contexts. No value was opened, copied, exported, or changed. This presence check does not authorize paid execution or deployment.
- Reservation-based budget control is a guardrail, not an absolute provider-spend guarantee: an individual request can exceed its estimate, and ambiguous or overrun charges require ledger reconciliation. Paid and scheduled paths remain disabled pending staging database tests and explicit release approval.
- Both additive migrations and the workflow transaction paths were exercised on an isolated, loopback-only PostgreSQL 17.11 cluster with synthetic Supabase-like roles and records. Independent connections covered creation idempotency, shared claim capacity, lease recovery, retry timing, ACL denials, paired completion, budget replay/overrun/month retention, and atomic stale rollback rejection. See `docs/editorial-postgres-test-report.md`.
- The local runtime test materially strengthens the SQL evidence, but it is not a substitute for a migrated Supabase staging test with the deployed API/auth stack. Production migration and paid/scheduled execution remain disabled.
- GSC and keyword CSV are labels/boundaries only; no importer is connected. WhatsApp is explicitly unconnected.

## Required implementation before enabling execution

1. Add trusted deterministic source/date/entity/freshness validators backed by persisted records; provider output alone must stay `needs_review`.
2. Add authenticated trusted-record administration and a deterministic validator that can consume those records; acknowledgement alone must never verify a claim.
3. Add media/unit import after rights and inventory-source contracts are approved.
4. Add a narrow publisher only after deterministic gates exist. Automated publication must set `review_kind=automated_validation`; only an authenticated human action may set `review_kind=human`.
5. Exercise claims, retries, reservations, settlement, paired inserts and stale locks against migrated staging under concurrency.
6. Register a disabled-by-default schedule only after the manual no-publish and rollback paths pass in staging.

## Release order

1. Review this source bundle and migration privileges independently.
2. Create a database backup/restore point and apply the article migration, then the workflow migration, in staging.
3. Deploy the authenticated admin backend, then Netlify functions, then the frontend preview.
4. Verify RLS/public-view behavior, owner/editor authorization, generation locks, budget reservation, concurrency, navigation, sitemap, Arabic/English metadata, and rollback.
5. Run one fully mocked job and one no-publish staging job. Confirm that unknown availability, price, source conflicts, and image rights become exceptions.
6. Only after explicit approval, enable the worker for a narrowly scoped manual run. Keep the weekly schedule disabled.
7. After measured costs and rollback testing, obtain explicit approval for the monthly ceiling and exact Monday Cairo time before enabling scheduling.

Action-time security approval is required for production migrations, deployment credentials, durable worker privileges, schedule enablement, and any new permanent external-source access. Existing `OPENAI_API_KEY` remains server-side and must not be copied or logged.
