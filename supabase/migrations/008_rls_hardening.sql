drop policy if exists "branches tenant read" on public.branches;
create policy "branches tenant read" on public.branches for select using(public.is_company_member(company_id));
drop policy if exists "memberships tenant read" on public.company_memberships;
create policy "memberships tenant read" on public.company_memberships for select using(user_id=auth.uid() or public.is_company_member(company_id));
create policy "roles tenant read v2" on public.roles for select using(public.is_company_member(company_id));
create policy "role permissions tenant read" on public.role_permissions for select using(exists(select 1 from public.roles r where r.id=role_id and public.is_company_member(r.company_id)));
create policy "membership roles tenant read" on public.membership_roles for select using(exists(select 1 from public.company_memberships cm where cm.id=membership_id and public.is_company_member(cm.company_id)));
