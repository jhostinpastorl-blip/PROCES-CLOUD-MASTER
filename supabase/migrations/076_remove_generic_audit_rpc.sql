-- The narrow product RPC is the accepted transaction boundary. A generic
-- browser-callable audit appender would allow members to manufacture events.
drop function if exists public.append_tenant_audit_event(uuid, text, text, uuid, jsonb);
