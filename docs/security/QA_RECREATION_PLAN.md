# PROCESA CLOUD QA — controlled recreation plan

Status: **GO FOR QA CORRECTION PLANNING**  
Evidence: Core CI #18 applied migrations 001–073 from zero and passed pgTAP
26/26, static checks, lockfile validation, typecheck and build.

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

QA correction: **GO**, using parallel recreation only.  
In-place baseline fabrication: **NO-GO**.  
Production/Main synchronization: **NO-GO**.  
CORE SaaS 2: **NO-GO until recreated QA passes the persistent cutover gate**.

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
| A — repository, commits and docs | `YA_HECHO_VERIFICADO` | HEAD `c3e4d8d`; clean synchronized branch; authoritative documents reviewed. |
| B — P0 Security | `YA_HECHO_VERIFICADO` | Migration 073, RPC/RLS inventory and CI pgTAP 26/26. |
| C — clean DB 001–073 | `YA_HECHO_VERIFICADO` | Core CI #18 and #19 passed the isolated database, static and build jobs. |
| D — QA parallel recreation | `PENDIENTE` | OLD QA inventory completed; NEW QA does not exist and provisioning is paused before cost confirmation. |
| E — QA persistent security and smoke gate | `BLOQUEADO` | Requires NEW QA created from 001–073. |
| F — QA cutover | `BLOQUEADO` | Requires phase E PASS and rollback readiness. |
| G — staging deployment | `BLOQUEADO` | Current staging predates CORE SaaS 1 commits; deployment waits for canonical QA PASS. |
| H — staging smoke and owner acceptance | `BLOQUEADO` | Requires phase G. |
| I — tenant resolver/subdomains | `PENDIENTE` | First-entry resolver exists; hostname/subdomain tenant resolution was not found. Do not start before H. |
| J — entitlements | `YA_HECHO_REQUIERE_VALIDACION` | `getEffectiveEntitlements` exists, but commercial features, add-ons and usage limits are not yet resolved by it. |
| K — billing foundation | `YA_HECHO_REQUIERE_VALIDACION` | Customer/webhook tables and provider boundary exist; adapters and signature verification remain mocks. |
| L — Culqi preparation | `PENDIENTE` | Only a mock adapter exists; no real credentials, checkout or verified webhook flow is implemented. |
| M — shared capabilities | `YA_HECHO_REQUIERE_VALIDACION` | Shared Sales, Inventory and CPE/SUNAT foundations exist; no new vertical formalization is authorized in this phase. |
