alter table public.audit_logs enable row level security;
drop policy if exists "audit tenant read" on public.audit_logs;
create policy "audit tenant read" on public.audit_logs for select using(public.has_permission(company_id,'audit.read'));
