insert into public.permissions(code,description) values
('subscription.manage','Administrar suscripción'),('notifications.read','Ver notificaciones'),('notifications.manage','Administrar notificaciones'),('storage.read','Ver archivos'),('storage.manage','Administrar archivos')
on conflict(code) do nothing;
create or replace function public.bootstrap_company_roles(p_company_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
 if not public.is_company_member(p_company_id) then raise exception 'forbidden'; end if;
 insert into public.roles(company_id,name,is_system) values
 (p_company_id,'Administrador',true),(p_company_id,'Supervisor',true),(p_company_id,'Cajero',true),
 (p_company_id,'Vendedor',true),(p_company_id,'Almacén',true),(p_company_id,'Contador',true),(p_company_id,'Consulta',true)
 on conflict(company_id,name) do nothing;
end;$$;
revoke all on function public.bootstrap_company_roles(uuid) from public;
grant execute on function public.bootstrap_company_roles(uuid) to authenticated;
