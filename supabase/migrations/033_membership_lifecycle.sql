create or replace function public.suspend_company_member(p_company_id uuid,p_membership_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
 if not public.has_permission(p_company_id,'users.invite') then raise exception 'forbidden';end if;
 update public.company_memberships set status='suspended'
 where id=p_membership_id and company_id=p_company_id and user_id<>auth.uid();
 if not found then raise exception 'membership not found';end if;
end;$$;
revoke all on function public.suspend_company_member(uuid,uuid) from public;
grant execute on function public.suspend_company_member(uuid,uuid) to authenticated;

create or replace function public.remove_company_member(p_company_id uuid,p_membership_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
 if not public.has_permission(p_company_id,'users.invite') then raise exception 'forbidden';end if;
 update public.company_memberships set status='removed'
 where id=p_membership_id and company_id=p_company_id and user_id<>auth.uid();
 if not found then raise exception 'membership not found';end if;
end;$$;
revoke all on function public.remove_company_member(uuid,uuid) from public;
grant execute on function public.remove_company_member(uuid,uuid) to authenticated;
