# Editorial PostgreSQL 17 runtime report

Date: 2026-10-08  
Branch base under test: `7e5d6ecc254cb6bd007990fa01520ead4c809e04`

## Isolated runtime

- PostgreSQL `17.11`, Windows x64 binary archive linked by the PostgreSQL Windows download page and hosted by EDB.
- Archive: `postgresql-17.11-1-windows-x64-binaries.zip`
- Archive SHA-256: `6EABDF00D2893713B75DB4336A23C3FDF505F056E217EC6E2E95D901750CFEA3`
- Extracted under the task workspace only; no installer, Windows service, system `PATH`, firewall, or security-setting change.
- Disposable cluster used trust authentication and listened only on `127.0.0.1:55432`.
- Database `editorial_test` contained only synthetic fixture roles and records. No production connection, dump, credentials, or private records were used.

The EDB archive was retrieved through the official PostgreSQL download page's advanced-user binary link. The extracted `postgres.exe` has no Authenticode signature, so verification evidence is the official HTTPS source chain, reported PostgreSQL version, archive size, and recorded SHA-256.

## Applied SQL

1. `scripts/editorial-postgres-fixture.sql`
2. `supabase-migrations/2026-10-08-editorial-articles.sql`
3. `supabase-migrations/2026-10-08-editorial-workflow.sql`
4. `scripts/test-editorial-postgres.mjs`

The Node harness requires `PG_TEST_PSQL` to point to `psql.exe` and standard `PGHOST`, `PGPORT`, `PGUSER`, and `PGDATABASE` variables. It opens independent `psql` processes for concurrency scenarios.

## Passed runtime scenarios

- Concurrent same-key job creation produced exactly one row (`created` plus `duplicate`).
- Concurrent different-key creation produced both jobs.
- Independent-connection claims honored one shared global capacity slot.
- Active same-job claim returned `busy`; expired lease recovered; future retry returned `not_due`; due retry claimed.
- `anon` and `authenticated` were denied budget-function execution and direct ledger writes.
- Completion inserted exactly two bilingual draft articles and persisted `validation_results` as a JSON array.
- Reservation replay stayed idempotent; ambiguous cost retained its reservation.
- Actual cost above the estimate was recorded, replayed idempotently, and retained the reservation's original billing month.
- Rollback after an independent article edit returned `article_pair_stale` without changing the job or peer article.
- Rollback against a published peer also returned `article_pair_stale` atomically.

## Remaining boundary

This proves behavior on PostgreSQL 17.11 with synthetic Supabase-like roles. It does not prove the deployed Supabase API/auth integration, production data compatibility, or real provider billing. A Supabase staging migration and API-level owner/editor test remain release gates. Paid and scheduled paths remain disabled.
