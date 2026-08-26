# Threat model Core RC0
## Assets
Tenant data, auth sessions, company membership, permissions, invitations, documents, audit records, platform admin access.
## Main threats
Cross-tenant IDOR; forged company_id; privilege escalation through role assignment; leaked service role; invitation token theft/reuse; public demo spam; XSS/CSRF/session abuse; Drive object URL treated as authorization; destructive admin action without audit.
## Controls
Server authorization + PostgreSQL RLS; tenant-bound mutations; hashed invitation tokens; service role server-only; HTTP-only context cookies; immutable audit from normal client; module/plan entitlements; validation; rate limiting layer; provider IDs never authorize.
## Must prove in QA
Tenant A cannot read/write B through UI, direct query, RPC or forged IDs. Normal tenant users cannot become platform admins. Invitation cannot be accepted by another email or reused.
