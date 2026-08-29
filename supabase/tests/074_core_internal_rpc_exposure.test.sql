begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(5);

select extensions.is(
  has_function_privilege('authenticated', 'public.assert_company_branch_capacity(uuid)', 'EXECUTE'),
  false,
  'authenticated cannot execute internal branch-capacity helper'
);

select extensions.is(
  has_function_privilege('authenticated', 'public.assert_company_can_operate(uuid)', 'EXECUTE'),
  false,
  'authenticated cannot execute internal operability helper'
);

select extensions.is(
  has_function_privilege('authenticated', 'public.assert_company_user_capacity(uuid)', 'EXECUTE'),
  false,
  'authenticated cannot execute internal user-capacity helper'
);

select extensions.is(
  has_function_privilege('authenticated', 'public.assert_not_last_admin(uuid,uuid)', 'EXECUTE'),
  false,
  'authenticated cannot execute internal last-admin helper'
);

select extensions.ok(
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'touch_onboarding_updated_at'
      and p.proconfig @> array['search_path=pg_catalog, public']::text[]
  ),
  'trigger-only onboarding helper has an explicit safe search_path'
);

select * from extensions.finish();

rollback;
