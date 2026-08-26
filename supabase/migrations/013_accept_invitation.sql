create or replace function public.accept_company_invitation(p_token_hash text)
returns uuid language plpgsql security definer set search_path=public as $$
declare inv public.company_invitations%rowtype; mid uuid;
begin
 if auth.uid() is null then raise exception 'unauthenticated'; end if;
 select * into inv from public.company_invitations where token_hash=p_token_hash and status='pending' for update;
 if inv.id is null then raise exception 'invalid invitation'; end if;
 if inv.expires_at<=now() then update public.company_invitations set status='expired' where id=inv.id;raise exception 'expired invitation';end if;
 if lower(coalesce(auth.jwt()->>'email',''))<>lower(inv.email) then raise exception 'email mismatch';end if;
 insert into public.company_memberships(company_id,user_id,status) values(inv.company_id,auth.uid(),'active')
 on conflict(company_id,user_id) do update set status='active' returning id into mid;
 if inv.role_id is not null then insert into public.membership_roles(membership_id,role_id) values(mid,inv.role_id) on conflict do nothing;end if;
 update public.company_invitations set status='accepted',accepted_by=auth.uid(),accepted_at=now() where id=inv.id;
 return inv.company_id;
end;$$;
revoke all on function public.accept_company_invitation(text) from public;grant execute on function public.accept_company_invitation(text) to authenticated;
