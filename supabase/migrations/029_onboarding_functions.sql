create or replace function public.create_company_with_owner(p_name text,p_legal_name text,p_tax_id text,p_currency text,p_timezone text)
returns uuid language plpgsql security definer set search_path=public as $$
declare cid uuid; mid uuid; rid uuid;
begin
 if auth.uid() is null then raise exception 'unauthenticated';end if;
 insert into public.companies(name,legal_name,tax_id,currency,timezone,status) values(p_name,p_legal_name,p_tax_id,p_currency,p_timezone,'active') returning id into cid;
 insert into public.company_memberships(company_id,user_id,status) values(cid,auth.uid(),'active') returning id into mid;
 insert into public.roles(company_id,name,is_system) values(cid,'Administrador',true) returning id into rid;
 insert into public.membership_roles(membership_id,role_id) values(mid,rid);
 insert into public.role_permissions(role_id,permission_id) select rid,id from public.permissions;
 return cid;
end;$$;
revoke all on function public.create_company_with_owner(text,text,text,text,text) from public;grant execute on function public.create_company_with_owner(text,text,text,text,text) to authenticated;

create or replace function public.create_first_branch(p_company_id uuid,p_name text,p_code text)
returns uuid language plpgsql security definer set search_path=public as $$
declare bid uuid;
begin
 if not public.has_permission(p_company_id,'branches.manage') then raise exception 'forbidden';end if;
 insert into public.branches(company_id,name,code,is_active) values(p_company_id,p_name,p_code,true) returning id into bid;
 return bid;
end;$$;
revoke all on function public.create_first_branch(uuid,text,text) from public;grant execute on function public.create_first_branch(uuid,text,text) to authenticated;
