# RC0 execution order
1. Connect GitHub and import latest staging.
2. Run npm install to materialize lockfile; commit lockfile.
3. CI: typecheck + build.
4. Create Supabase QA and apply migrations sequentially.
5. Seed two companies and test users.
6. Execute tenant/RLS matrices.
7. Exercise auth, reset, invitations, roles, branches, limits, modules, audit.
8. Fix all schema/runtime mismatches.
9. Connect DriveProvider and test file metadata lifecycle.
10. Put staging behind Cloudflare and replace local limiter with distributed rate limiting.
11. Responsive/security regression.
12. Tag Core RC0 only if gates pass.
