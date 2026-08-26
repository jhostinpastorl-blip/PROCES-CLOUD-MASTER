-- Active memberships only grant tenant access.
create or replace function public.is_company_member(target_company uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.company_memberships cm
    where cm.company_id=target_company
      and cm.user_id=auth.uid()
      and cm.status='active'
  );
$$;
revoke all on function public.is_company_member(uuid) from public;
grant execute on function public.is_company_member(uuid) to authenticated;
