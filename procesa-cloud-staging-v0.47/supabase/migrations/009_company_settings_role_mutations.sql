alter table public.companies add column if not exists legal_name text;alter table public.companies add column if not exists tax_id text;alter table public.companies add column if not exists timezone text not null default 'America/Lima';alter table public.companies add column if not exists currency text not null default 'PEN';
create or replace function public.has_permission(p_company_id uuid,p_code text) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.company_memberships cm join public.membership_roles mr on mr.membership_id=cm.id join public.role_permissions rp on rp.role_id=mr.role_id join public.permissions p on p.id=rp.permission_id where cm.user_id=auth.uid() and cm.company_id=p_company_id and cm.status='active' and p.code=p_code);
$$;
revoke all on function public.has_permission(uuid,text) from public;grant execute on function public.has_permission(uuid,text) to authenticated;
create policy "roles tenant insert" on public.roles for insert with check(public.has_permission(company_id,'roles.manage'));
create policy "roles tenant update" on public.roles for update using(public.has_permission(company_id,'roles.manage')) with check(public.has_permission(company_id,'roles.manage'));
