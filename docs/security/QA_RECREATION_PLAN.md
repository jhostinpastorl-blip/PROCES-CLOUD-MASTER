# PROCESA CLOUD QA — controlled recreation plan

Status: **QA CORRECTION EXECUTED; GO FOR STAGING VALIDATION**
Evidence: the parallel NEW QA project applied migrations 001–074 from zero,
passed pgTAP 26/26 for migration 073 and 5/5 for migration 074, and passed the
13 CORE tests, verify, typecheck and build. GitHub CI #24 passed all jobs.

This plan does not authorize production changes, a MAIN deployment, deletion of
the current QA project, or synthetic migration-history entries.

## Strategy

Create a parallel QA environment from the repository source of truth. Keep the
current drifted QA available as a read-only rollback reference until the new QA
passes every gate and the owner approves cutover.

## Execution sequence

1. Freeze application writes to current QA and record the freeze time.
2. Capture read-only inventories: migration ledger, schema fingerprint,
   extensions, row counts, Storage configuration, Auth settings, Edge Function
   configuration and environment-variable names. Never export or commit secrets.
3. Identify records that are true reusable QA fixtures. Export only approved,
   non-production test data; never treat the drifted schema as source of truth.
4. Provision a separate QA target. Do not delete, reset or repurpose current QA.
5. Apply migrations 001–073 from commit `0dad2a0` in order using PostgreSQL 17.
6. Require `supabase test db` 26/26 PASS, static suite, `npm ci`, typecheck,
   verify and build.
7. Run Supabase security and performance advisors. Any critical tenant/RPC/RLS
   finding blocks cutover.
8. Load approved fixtures through supported APIs or an audited seed.
9. Run persistent application smoke tests for Auth, onboarding, company,
   branches, POS, inventory, CPE and SuperAdmin, including Tenant A → B denial.
10. Verify that the new ledger contains exactly 001–073 in order and compare its
    schema fingerprint with the clean CI database.
11. Update QA/staging environment references only after owner approval. Never
    change production variables in this operation.
12. Observe the new QA through an agreed validation window. On critical failure,
    restore the old QA references; no destructive database reset is required.
13. Retire old QA only under separate approval after the rollback window.

## Cutover gate

- Migration ledger 001–073 complete and ordered.
- pgTAP 26/26 and Tenant A → B matrix PASS.
- RLS enabled on every exposed public table.
- No `anon` table privileges or public-schema function EXECUTE.
- Static, typecheck, verify and build PASS.
- Security advisors reviewed and rollback references confirmed.

## Decision

QA correction: **GO — completed by parallel recreation**.
In-place baseline fabrication: **NO-GO; no migration rows were fabricated**.
Production/Main synchronization: **NO-GO; neither was modified**.
CORE SaaS 2: **NOT STARTED; its separate readiness decision follows staging
owner acceptance**.

## Parallel recreation closure — 2026-08-29 (America/Lima)

- OLD QA `mejdlosvafeklzqqdudh` was paused, not deleted. Its last verified
  fingerprint remains `2ae49b4c1a60ffd49d94d64ebfae3342`; it is the
  reversible rollback reference.
- NEW QA `zanjfifwtuujvmajyobb` (`PROCESA CLOUD QA CLEAN`) was created in
  `us-west-1` on PostgreSQL `17.6.1.166`, Free plan, with no paid add-ons.
- The canonical migration ledger contains exactly 74 ordered entries; its last
  version is `20260829020059`. Migrations 001–073 were applied from zero and
  migration 074 then restricted the remaining internal helper RPC exposure.
- PostgreSQL validation passed: migration 073 pgTAP 26/26 and migration 074
  pgTAP 5/5. Repository validation passed: 13/13 CORE tests, verify, typecheck
  and production build.
- Persistent fixtures created two isolated companies. Tenant A has
  `ALL_BRANCHES`; Tenant B has `SPECIFIC_BRANCHES` with only its primary branch.
  Both A → B and B → A table/RPC matrices returned zero rows or false.
- Persistent application smoke passed Auth, onboarding, company, branches,
  modules, users, roles, settings, POS, products, inventory, cash registers,
  cash sessions and terminal. A normal tenant user was denied
  `/procesa-admin`; the platform administrator loaded it successfully.
- Security advisors reported no critical finding after 074: 49 security
  findings (48 warnings, one informational) and 234 performance findings
  (85 warnings, 149 informational) were inventoried for later remediation.
- NEW QA Auth Site URL and allowlist contain only the staging origin and its
  callback/password-reset routes. A remote signup reached the confirmation-mail
  path; subsequent provider rate limiting was observed and not bypassed.
- The Cloudflare staging Worker received the NEW QA service-role key only as an
  encrypted server-side secret. It was not printed, committed or written to a
  repository file.

Rollback remains non-destructive: restore staging references to OLD QA only if
an owner-accepted rollback is required, then resume OLD QA. Do not delete either
project or fabricate ledger history.

## Execution checkpoint — 2026-08-28 (America/Lima)

Read-only discovery completed without changing QA, MAIN, production or staging:

- OLD QA `mejdlosvafeklzqqdudh` is active and healthy on PostgreSQL
  `17.6.1.165`; it still reports zero migrations and has no database branches.
- Its current catalog fingerprint is `2ae49b4c1a60ffd49d94d64ebfae3342`
  for 58 public tables and 68 public functions. Aggregate inventory reports 253
  Auth users, no Storage buckets and approximately 16,016 public-table rows.
  No row contents or secrets were read or exported.
- OLD QA has no deployed Edge Functions. The security advisor reports 149
  findings (148 warnings and one informational finding), consistent with the
  documented pre-073 grant and function drift. This environment is not a
  cutover candidate.
- The Supabase account exposes only the existing `PROCESA CLOUD` and
  `PROCESA CLOUD QA` projects. No NEW QA project or database branch exists.
- The only visible organization is `Procesa Cloud`, currently on the Free plan.
  Provisioning a separate target is paused until that organization is selected
  explicitly and its project cost/capacity is confirmed. OLD QA remains intact.
- Cloudflare staging is reachable, but its active Worker version 13 was deployed
  at `2026-08-28T15:37:18Z`, before commits `25c5abe` through `c3e4d8d`. The
  deployed Worker exposes only the `ASSETS` binding, has no listed secrets and
  does not publish a verifiable Supabase project reference. Staging is therefore
  not verified against current HEAD or a canonical QA.

## Current phase classification

| Phase | Status | Evidence / dependency |
|---|---|---|
| A — repository, commits and docs | `YA_HECHO_VERIFICADO` | Branch synchronized; authoritative documents and CI #24 reviewed. |
| B — P0 Security | `YA_HECHO_VERIFICADO` | Migration 073, RPC/RLS inventory and CI pgTAP 26/26. |
| C — clean DB 001–073 | `YA_HECHO_VERIFICADO` | Core CI #18 and #19 passed the isolated database, static and build jobs. |
| D — QA parallel recreation | `YA_HECHO_VERIFICADO` | OLD QA paused and preserved; NEW QA `zanjfifwtuujvmajyobb` recreated from the canonical chain. |
| E — QA persistent security and smoke gate | `YA_HECHO_VERIFICADO` | Ledger 001–074, pgTAP 26/26 + 5/5, persistent tenant matrix and application smokes PASS. |
| F — QA cutover | `YA_HECHO_VERIFICADO` | Staging Auth and Worker references moved to NEW QA; OLD QA remains the rollback target. |
| G — staging deployment | `EN_EJECUCION` | Final documented commit must be built and deployed with a verifiable SHA. |
| H — staging smoke and owner acceptance | `PENDIENTE` | Public smoke follows the final deployment; owner acceptance remains external. |
| I — tenant resolver/subdomains | `PENDIENTE` | First-entry resolver exists; hostname/subdomain tenant resolution was not found. Do not start before H. |
| J — entitlements | `YA_HECHO_REQUIERE_VALIDACION` | `getEffectiveEntitlements` exists, but commercial features, add-ons and usage limits are not yet resolved by it. |
| K — billing foundation | `YA_HECHO_REQUIERE_VALIDACION` | Customer/webhook tables and provider boundary exist; adapters and signature verification remain mocks. |
| L — Culqi preparation | `PENDIENTE` | Only a mock adapter exists; no real credentials, checkout or verified webhook flow is implemented. |
| M — shared capabilities | `YA_HECHO_REQUIERE_VALIDACION` | Shared Sales, Inventory and CPE/SUNAT foundations exist; no new vertical formalization is authorized in this phase. |

## Supabase NEW QA capacity check — 2026-08-28

Organization: `Procesa Cloud` (`ntpwyzvjbuzbxwaosfpg`)

Observed plan: `Free`

Active projects: 2 (`PROCESA CLOUD`, `PROCESA CLOUD QA`)

- The Supabase management cost check returned `USD 0` monthly for a project.
  This does not create capacity: the Free plan permits only two active free
  projects across organizations where the user is Owner or Administrator, and
  both slots are already occupied.
- Therefore a third active managed project cannot be provisioned under the
  current zero-cost conditions while preserving both existing projects.
- Pausing or deleting either current project would free a slot, but neither
  operation is authorized and both conflict with the preservation requirements.
- Creating another Free organization is not a workaround because the two-project
  limit is account-wide for Owner/Administrator memberships.
- A Supabase preview branch is not a free substitute. The management cost check
  returned `USD 0.01344` hourly, and official documentation states branch usage
  is billed separately and is not protected by the Spend Cap.
- The official Supabase billing example for a Pro organization with three
  default Micro projects is `USD 45` monthly total (`USD 25` plan + `USD 30`
  compute - `USD 10` compute credits). Actual usage or different compute sizes
  can increase that amount.
- A disposable local/CI database remains free, but it does not satisfy the
  persistent hosted NEW QA and Cloudflare staging cutover requirement.

Capacity decision at this checkpoint was superseded by explicit owner
authorization to pause OLD QA. Pausing it freed one Free-plan slot, so NEW QA
was provisioned at the confirmed `USD 0` project cost. No plan upgrade, paid
branch or add-on was purchased.

Official references:

- https://supabase.com/docs/guides/platform/billing-on-supabase
- https://supabase.com/docs/guides/platform/billing-faq
- https://supabase.com/docs/guides/platform/manage-your-usage/branching
