create policy "branches tenant delete" on public.branches for delete using(public.has_permission(company_id,'branches.manage'));
-- audit_logs remains append-only from trusted server paths; tenant clients get no mutation policy.
create index if not exists companies_created_idx on public.companies(created_at desc);
