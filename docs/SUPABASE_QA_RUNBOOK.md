# Supabase QA Runbook
1. Create a separate Supabase QA project.
2. Configure env locally; never commit keys.
3. Apply migrations in numeric order.
4. Create QA users through Auth.
5. Create Company A and Company B through application flows.
6. Execute RLS matrix in tests/security/rls-matrix-v0.24.md.
7. Record PASS/FAIL with evidence.
8. Fix all isolation failures before production.
9. Only after QA passes, prepare production project and deployment.
Required manual input from owner when we reach this stage: Supabase project connection/configuration or connected Supabase capability.
