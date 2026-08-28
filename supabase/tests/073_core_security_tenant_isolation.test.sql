begin;
create extension if not exists pgtap with schema extensions;

select extensions.plan(26);

select extensions.is(
  (select count(*)::bigint from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and has_function_privilege('anon',p.oid,'execute')),
  0::bigint, 'anon cannot execute public-schema functions'
);
select extensions.is(
  (select count(*)::bigint from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and has_function_privilege('public',p.oid,'execute')),
  0::bigint, 'PUBLIC cannot execute public-schema functions'
);
select extensions.is(
  (select count(*)::bigint from information_schema.role_table_grants
   where table_schema='public' and grantee='anon'),
  0::bigint, 'anon has no direct public-schema table privileges'
);
select extensions.is(
  (select count(*)::bigint from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public'
     and exists(select 1 from pg_trigger t where t.tgfoid=p.oid and not t.tgisinternal)
     and has_function_privilege('authenticated',p.oid,'execute')),
  0::bigint, 'trigger functions are not authenticated RPCs'
);
select extensions.is(
  (select count(*)::bigint from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.prosecdef
     and not exists(
       select 1 from unnest(coalesce(p.proconfig,array[]::text[])) c
       where c in ('search_path=pg_catalog, public','search_path=""')
     )),
  0::bigint, 'all SECURITY DEFINER functions have a safe explicit search_path'
);
select extensions.is(
  (select count(*)::bigint from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relkind in('r','p') and not c.relrowsecurity),
  0::bigint, 'every public table has RLS enabled'
);

insert into auth.users(
  instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at
) values
('00000000-0000-0000-0000-000000000000','10000000-0000-0000-0000-000000000001','authenticated','authenticated','p0-a@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','10000000-0000-0000-0000-000000000002','authenticated','authenticated','p0-b@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','10000000-0000-0000-0000-000000000003','authenticated','authenticated','p0-legacy@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','10000000-0000-0000-0000-000000000004','authenticated','authenticated','p0-all@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','10000000-0000-0000-0000-000000000005','authenticated','authenticated','p0-suspended@example.test','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','10000000-0000-0000-0000-000000000006','authenticated','authenticated','p0-outsider@example.test','',now(),'{}','{}',now(),now());

insert into public.companies(id,name,legal_name,status,created_by) values
('20000000-0000-0000-0000-000000000001','Tenant A','Tenant A SAC','active','10000000-0000-0000-0000-000000000001'),
('20000000-0000-0000-0000-000000000002','Tenant B','Tenant B SAC','active','10000000-0000-0000-0000-000000000002');

insert into public.company_memberships(id,company_id,user_id,status) values
('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','active'),
('30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','active'),
('30000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000003','active'),
('30000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000004','active'),
('30000000-0000-0000-0000-000000000005','20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000005','suspended');

insert into public.branches(id,company_id,name,code,is_active) values
('40000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','A Norte','AN',true),
('40000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','A Sur','AS',true),
('40000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000002','B Centro','BC',true);

insert into public.business_profiles(
  id,user_id,company_id,industry_code,branch_range,employee_range,
  primary_need_code,selected_need_codes
) values
('50000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','bodega','2-3','2-5','sales',array['sales']),
('50000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','bodega','1','2-5','sales',array['sales']);

insert into public.company_solution_activations(
  id,company_id,solution_id,package_id,status,activated_by
)
select '60000000-0000-0000-0000-000000000001'::uuid,
       '20000000-0000-0000-0000-000000000001'::uuid,sc.id,sp.id,'ACTIVE',
       '10000000-0000-0000-0000-000000000001'::uuid
from public.solution_catalog sc join public.solution_packages sp on sp.solution_id=sc.id
where sc.code='pos' and sp.code='pos-starter'
union all
select '60000000-0000-0000-0000-000000000002'::uuid,
       '20000000-0000-0000-0000-000000000002'::uuid,sc.id,sp.id,'ACTIVE',
       '10000000-0000-0000-0000-000000000002'::uuid
from public.solution_catalog sc join public.solution_packages sp on sp.solution_id=sc.id
where sc.code='pos' and sp.code='pos-starter';

insert into public.membership_branch_scopes(membership_id,company_id,access_mode) values
('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','SPECIFIC_BRANCHES'),
('30000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000001','ALL_BRANCHES');
insert into public.membership_branch_access(membership_id,company_id,branch_id) values
('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001');

insert into public.roles(id,company_id,name,is_system) values
('70000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','P0 Admin',false);
insert into public.membership_roles(membership_id,role_id) values
('30000000-0000-0000-0000-000000000001','70000000-0000-0000-0000-000000000001');
insert into public.role_permissions(role_id,permission_id)
select '70000000-0000-0000-0000-000000000001',id from public.permissions
where code in('roles.manage','modules.manage');
insert into public.subscriptions(company_id,plan_id,status,starts_at,ends_at)
select '20000000-0000-0000-0000-000000000001',id,'trial',now(),now()+interval '1 day'
from public.plans where code='pro';
insert into public.company_modules(company_id,module_id,enabled)
select '20000000-0000-0000-0000-000000000001',id,true from public.modules where code='pos';

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',true);

select extensions.ok(public.is_company_member('20000000-0000-0000-0000-000000000001'),'tenant A membership resolves');
select extensions.is(public.is_company_member('20000000-0000-0000-0000-000000000002'),false,'tenant B membership is denied');
select extensions.is((select count(*) from public.branches where company_id='20000000-0000-0000-0000-000000000001'),1::bigint,'specific scope exposes one tenant A branch');
select extensions.is((select count(*) from public.branches where company_id='20000000-0000-0000-0000-000000000002'),0::bigint,'tenant B branches are invisible');
select extensions.is((select count(*) from public.business_profiles where company_id='20000000-0000-0000-0000-000000000002'),0::bigint,'tenant B business profile is invisible');
select extensions.is((select count(*) from public.company_solution_activations where company_id='20000000-0000-0000-0000-000000000002'),0::bigint,'tenant B activations are invisible');
select extensions.is((select count(*) from public.membership_branch_scopes where company_id='20000000-0000-0000-0000-000000000002'),0::bigint,'tenant B scopes are invisible');
select extensions.ok(public.membership_can_access_branch('20000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001'),'specific allowed branch passes');
select extensions.is(public.membership_can_access_branch('20000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000002'),false,'specific non-allowed branch fails');
select extensions.throws_ok(
  $$select public.activate_solution_package('20000000-0000-0000-0000-000000000002','pos-starter')$$,
  'P0001','FORBIDDEN_PERMISSION','cross-tenant activation RPC is rejected'
);
select extensions.throws_ok(
  $$select public.set_membership_branch_scope('20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','SPECIFIC_BRANCHES',array['40000000-0000-0000-0000-000000000003']::uuid[])$$,
  'P0001','BRANCH_NOT_IN_COMPANY','cross-company branch scope is rejected'
);
select extensions.ok(public.has_permission('20000000-0000-0000-0000-000000000001','roles.manage'),'tenant A RBAC permission resolves');
select extensions.is(public.has_permission('20000000-0000-0000-0000-000000000002','roles.manage'),false,'tenant B RBAC is not disclosed');
select extensions.ok(public.company_has_module('20000000-0000-0000-0000-000000000001','pos'),'tenant A module entitlement resolves');
select extensions.is(public.company_has_module('20000000-0000-0000-0000-000000000002','pos'),false,'tenant B module entitlement is not disclosed');

select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated"}',true);
select extensions.ok(public.membership_can_access_branch('20000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001'),'legacy membership defaults to all branches');
select extensions.ok(public.membership_can_access_branch('20000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000002'),'legacy membership reaches multiple branches');

select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000004","role":"authenticated"}',true);
select extensions.ok(public.membership_can_access_branch('20000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000002'),'ALL_BRANCHES scope reaches all tenant branches');

select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000005","role":"authenticated"}',true);
select extensions.is(public.membership_can_access_branch('20000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001'),false,'suspended membership is denied');

select set_config('request.jwt.claims','{"sub":"10000000-0000-0000-0000-000000000006","role":"authenticated"}',true);
select extensions.is(public.membership_can_access_branch('20000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001'),false,'outsider is denied');

reset role;
select * from extensions.finish();
rollback;
