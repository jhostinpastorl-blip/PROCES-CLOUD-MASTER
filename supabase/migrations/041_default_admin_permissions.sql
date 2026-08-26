create or replace function public.sync_system_admin_permissions(p_company_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare rid uuid;
begin
 if not public.has_permission(p_company_id,'roles.manage') and not exists(
   select 1 from public.company_memberships cm
   where cm.company_id=p_company_id and cm.user_id=auth.uid() and cm.status='active'
 ) then raise exception 'forbidden'; end if;
 select id into rid from public.roles where company_id=p_company_id and name='Administrador' and is_system=true limit 1;
 if rid is null then return; end if;
 insert into public.role_permissions(role_id,permission_id)
 select rid,p.id from public.permissions p
 on conflict do nothing;
end;$$;
revoke all on function public.sync_system_admin_permissions(uuid) from public;
grant execute on function public.sync_system_admin_permissions(uuid) to authenticated;
