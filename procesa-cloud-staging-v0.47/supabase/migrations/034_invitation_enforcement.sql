create or replace function public.create_company_invitation(
 p_company_id uuid,p_email text,p_role_id uuid,p_token_hash text,p_expires_at timestamptz
) returns uuid language plpgsql security definer set search_path=public as $$
declare iid uuid;
begin
 if not public.has_permission(p_company_id,'users.invite') then raise exception 'forbidden';end if;
 perform public.assert_company_user_capacity(p_company_id);
 if p_role_id is not null and not exists(select 1 from public.roles where id=p_role_id and company_id=p_company_id) then raise exception 'role cross tenant';end if;
 insert into public.company_invitations(company_id,email,role_id,status,token_hash,expires_at,invited_by)
 values(p_company_id,lower(p_email),p_role_id,'pending',p_token_hash,p_expires_at,auth.uid()) returning id into iid;
 return iid;
end;$$;
revoke all on function public.create_company_invitation(uuid,text,uuid,text,timestamptz) from public;
grant execute on function public.create_company_invitation(uuid,text,uuid,text,timestamptz) to authenticated;
