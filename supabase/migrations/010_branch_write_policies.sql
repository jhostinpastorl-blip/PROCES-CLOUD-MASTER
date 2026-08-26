create policy "branches tenant insert" on public.branches for insert with check(public.has_permission(company_id,'branches.manage'));
create policy "branches tenant update" on public.branches for update using(public.has_permission(company_id,'branches.manage')) with check(public.has_permission(company_id,'branches.manage'));
