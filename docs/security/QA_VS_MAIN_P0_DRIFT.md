# QA vs MAIN — P0 read-only drift report

Observed 2026-08-28 through authorized Supabase metadata access. No write was
performed against either environment.

| Metric | PROCESA CLOUD QA | PROCESA CLOUD MAIN | Classification |
|---|---:|---:|---|
| Recorded migrations | 0 | 6 (`001_core`–`006_branch_constraints_platform_admin`) | `SCHEMA_DRIFT` |
| Public tables | 58 | 17 | `MISSING_IN_MAIN` after migration 006; QA history missing |
| Columns | 608 | 97 | `MISSING_IN_MAIN` / `SCHEMA_DRIFT` |
| Constraints | 323 | 47 | `MISSING_IN_MAIN` / `SCHEMA_DRIFT` |
| Indexes | 180 | 27 | `MISSING_IN_MAIN` / `SCHEMA_DRIFT` |
| RLS-enabled tables | 58/58 | 9/17 | MAIN has eight public tables without RLS; requires release-chain review |
| Policies | 146 | 8 | `MISSING_IN_MAIN` |
| Functions | 68 | 3 | `MISSING_IN_MAIN` |
| SECURITY DEFINER | 66 | 3 | `EXPECTED` for legacy design, but grants require 073 |
| Triggers | 18 | 0 | `MISSING_IN_MAIN` |
| `anon` function EXECUTE | 68 | 3 | `SECURITY_DRIFT` in both |
| `anon` table grants | 402 | 119 | `SECURITY_DRIFT` in both |

MAIN contains only the objects expected from the early CORE foundation:
`audit_logs`, `branches`, `companies`, `company_memberships`,
`company_modules`, `demo_requests`, `membership_roles`, `modules`,
`notifications`, `permissions`, `plans`, `platform_admins`, `profiles`,
`role_permissions`, `roles`, `storage_objects`, and `subscriptions`.

QA additionally contains the later control-plane, onboarding, billing, POS,
inventory, returns, reporting and CPE domains through the repository's pre-072
shape. Migration 071 is itself partial: its weighted-cost RPC body is present,
but its supporting company/product index is missing. Those objects are not safe
evidence of an applied migration chain because QA has no migration ledger.

## Classification

- `EXPECTED`: MAIN being behind is consistent with its recorded 001–006 release
  state; it is not permission to synchronize it.
- `MISSING_IN_MAIN`: repository migrations 007–073 and their objects are not
  represented in MAIN.
- `MISSING_IN_QA`: the four new post-072 functions and six 072 tables are absent
  persistently; they only passed transaction validation.
- `SECURITY_DRIFT`: both hosted environments retain legacy automatic grants to
  `anon`; QA also exposes trigger functions as RPC before 073.
- `SCHEMA_DRIFT`: QA has extensive schema/data with no migration history.

## Safe disposition

Do not copy QA into MAIN, do not insert synthetic migration ledger rows, and do
not apply only the tail. Rebuild a disposable/local database from 001–073 in CI,
then choose an explicit QA remediation: recreate QA from the verified chain or
produce a signed baseline from catalog-level schema diff and checksums. MAIN
remains untouched until that gate passes and a separately approved deployment
plan exists.
