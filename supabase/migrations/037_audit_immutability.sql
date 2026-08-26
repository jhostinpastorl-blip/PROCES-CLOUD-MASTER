-- Tenant audit records are append-only for authenticated client roles.
revoke update,delete on table public.audit_logs from authenticated;
-- Platform audit records are also append-only from client sessions.
revoke update,delete on table public.platform_audit_logs from authenticated;
