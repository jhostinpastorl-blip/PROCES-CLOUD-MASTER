
-- Normal authenticated users may read audit only through tenant policy.
-- No INSERT/UPDATE/DELETE policy is granted to clients; server-side trusted paths own writes.
revoke insert, update, delete on public.audit_logs from authenticated;

create or replace function public.revoke_company_invitation(p_company_id uuid,p_invitation_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
 if not public.has_permission(p_company_id,'users.invite') then raise exception 'forbidden'; end if;
 update public.company_invitations
 set status='revoked'
 where id=p_invitation_id and company_id=p_company_id and status='pending';
 if not found then raise exception 'invitation not revocable'; end if;
end;$$;
revoke all on function public.revoke_company_invitation(uuid,uuid) from public;
grant execute on function public.revoke_company_invitation(uuid,uuid) to authenticated;
