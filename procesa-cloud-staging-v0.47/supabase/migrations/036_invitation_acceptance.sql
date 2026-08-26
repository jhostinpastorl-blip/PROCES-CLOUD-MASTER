create or replace function public.accept_company_invitation(p_token_hash text)
returns uuid language plpgsql security definer set search_path=public as $$
declare inv public.company_invitations%rowtype; mid uuid; auth_email text;
begin
 if auth.uid() is null then raise exception 'unauthenticated';end if;
 select email into auth_email from auth.users where id=auth.uid();
 select * into inv from public.company_invitations where token_hash=p_token_hash and status='pending' and expires_at>now() for update;
 if inv.id is null then raise exception 'invalid invitation';end if;
 if lower(auth_email)<>lower(inv.email) then raise exception 'invitation email mismatch';end if;
 perform public.assert_company_user_capacity(inv.company_id);
 insert into public.company_memberships(company_id,user_id,status)
 values(inv.company_id,auth.uid(),'active')
 on conflict(company_id,user_id) do update set status='active'
 returning id into mid;
 if inv.role_id is not null then
   if not exists(select 1 from public.roles where id=inv.role_id and company_id=inv.company_id) then raise exception 'role cross tenant';end if;
   insert into public.membership_roles(membership_id,role_id) values(mid,inv.role_id) on conflict do nothing;
 end if;
 update public.company_invitations set status='accepted',accepted_at=now() where id=inv.id;
 return inv.company_id;
end;$$;
revoke all on function public.accept_company_invitation(text) from public;
grant execute on function public.accept_company_invitation(text) to authenticated;
