-- Migration 074: align INTERNAL_ONLY helper grants with the documented RPC contract.
-- These helpers are invoked by owner-executed SECURITY DEFINER APIs and must not
-- be directly callable from the browser-facing authenticated role.

revoke execute on function public.assert_company_branch_capacity(uuid)
  from public, anon, authenticated;
revoke execute on function public.assert_company_can_operate(uuid)
  from public, anon, authenticated;
revoke execute on function public.assert_company_user_capacity(uuid)
  from public, anon, authenticated;
revoke execute on function public.assert_not_last_admin(uuid, uuid)
  from public, anon, authenticated;

-- Trigger-only and already unavailable to API roles. Set an explicit path so
-- the managed security advisor and the database contract agree.
alter function public.touch_onboarding_updated_at()
  set search_path = pg_catalog, public;
