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
