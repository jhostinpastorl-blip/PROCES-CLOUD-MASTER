create table if not exists public.platform_audit_logs(id uuid primary key default gen_random_uuid(),actor_user_id uuid references auth.users(id),action text not null,entity_type text,entity_id text,metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now());
alter table public.platform_audit_logs enable row level security;
create policy "platform admins read platform audit" on public.platform_audit_logs for select using(public.is_platform_admin());
revoke insert,update,delete on public.platform_audit_logs from authenticated;
create index if not exists platform_audit_created_idx on public.platform_audit_logs(created_at desc);
