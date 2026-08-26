
create policy "company modules tenant insert" on public.company_modules
for insert with check(public.has_permission(company_id,'modules.manage'));
create policy "company modules tenant update" on public.company_modules
for update using(public.has_permission(company_id,'modules.manage'))
with check(public.has_permission(company_id,'modules.manage'));
create policy "company modules tenant delete" on public.company_modules
for delete using(public.has_permission(company_id,'modules.manage'));
