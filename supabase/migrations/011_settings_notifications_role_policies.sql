create policy "companies tenant update" on public.companies for update using(public.has_permission(id,'company.update')) with check(public.has_permission(id,'company.update'));
create policy "notifications own update" on public.notifications for update using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "role permissions tenant insert" on public.role_permissions for insert with check(exists(select 1 from public.roles r where r.id=role_id and public.has_permission(r.company_id,'roles.manage')));
create policy "role permissions tenant delete" on public.role_permissions for delete using(exists(select 1 from public.roles r where r.id=role_id and public.has_permission(r.company_id,'roles.manage')));
