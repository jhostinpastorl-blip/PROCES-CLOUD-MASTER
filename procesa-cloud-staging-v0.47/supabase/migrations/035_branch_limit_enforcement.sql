create or replace function public.create_first_branch(p_company_id uuid,p_name text,p_code text)
returns uuid language plpgsql security definer set search_path=public as $$
declare bid uuid;
begin
 if not public.has_permission(p_company_id,'branches.manage') then raise exception 'forbidden';end if;
 perform public.assert_company_branch_capacity(p_company_id);
 insert into public.branches(company_id,name,code,is_active) values(p_company_id,p_name,p_code,true) returning id into bid;
 return bid;
end;$$;
revoke all on function public.create_first_branch(uuid,text,text) from public;
grant execute on function public.create_first_branch(uuid,text,text) to authenticated;
