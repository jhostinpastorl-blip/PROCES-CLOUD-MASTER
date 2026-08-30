-- PROCESA Cloud · CORE SaaS 1 · Activation Foundation
-- Forward-only, non-destructive and backward-compatible.
-- IMPORTANT: repository proposal only. Do not apply remotely without owner gate.

-- 1. Canonical onboarding: extend the table already used by the live routes.
alter table public.onboarding_states drop constraint if exists onboarding_step_ck;
alter table public.onboarding_states
  add column if not exists status text not null default 'IN_PROGRESS',
  add column if not exists last_completed_step text,
  add column if not exists workflow_version int not null default 1,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists started_at timestamptz not null default now(),
  add column if not exists blocked_reason text;

alter table public.onboarding_states
  add constraint onboarding_step_ck check(current_step in(
    'plan','modules', -- legacy compatibility
    'identity','profile','business','recommendation','offer','company','branch',
    'activation','solution_setup','go_live','complete'
  ));
alter table public.onboarding_states
  add constraint onboarding_status_ck check(status in('NOT_STARTED','IN_PROGRESS','COMPLETED','BLOCKED'));
alter table public.onboarding_states
  add constraint onboarding_metadata_object_ck check(jsonb_typeof(metadata) = 'object');
alter table public.onboarding_states
  add constraint onboarding_workflow_version_ck check(workflow_version > 0);

comment on table public.onboarding_states is
  'Canonical onboarding source for Activation Foundation V1.';
comment on table public.user_onboarding_states is
  'DEPRECATED COMPATIBILITY: do not write from the canonical Activation Foundation flow.';

create index if not exists idx_onboarding_status_step
  on public.onboarding_states(status,current_step,updated_at desc);

-- Optional profile fields supported by the existing profiles domain.
alter table public.profiles
  add column if not exists phone text,
  add column if not exists job_title text;

-- Team members with users.read may resolve a colleague name; auth email remains private.
drop policy if exists "profiles company colleague read" on public.profiles;
create policy "profiles company colleague read" on public.profiles for select to authenticated using (
  id = auth.uid() or exists (
    select 1
    from public.company_memberships mine
    join public.company_memberships theirs on theirs.company_id = mine.company_id
    where mine.user_id = auth.uid()
      and mine.status = 'active'
      and theirs.user_id = profiles.id
      and theirs.status = 'active'
      and public.has_permission(mine.company_id,'users.read')
  )
);

-- 2. Business discovery. It belongs to the user journey and can be linked to a
-- company after idempotent company creation.
create table if not exists public.business_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  industry_code text not null,
  branch_range text not null,
  employee_range text not null,
  primary_need_code text not null,
  selected_need_codes text[] not null default '{}',
  other_description text,
  recommended_solution_code text,
  selected_solution_code text,
  recommendation_reason text,
  selection_changed boolean not null default false,
  recommendation_version int not null default 1,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id),
  constraint business_profile_industry_ck check(industry_code in(
    'bodega','ferreteria','minimarket','panaderia','restaurante','gimnasio',
    'veterinaria','servicios','otro'
  )),
  constraint business_profile_branches_ck check(branch_range in('1','2-3','4-10','11+')),
  constraint business_profile_size_ck check(employee_range in('1','2-5','6-20','21-50','51+')),
  constraint business_profile_primary_need_ck check(primary_need_code in('sales','inventory','cash','purchases','employees','accounting','documents','collections')),
  constraint business_profile_needs_ck check(cardinality(selected_need_codes) between 1 and 8),
  constraint business_profile_ruleset_ck check(recommendation_version > 0)
);

alter table public.business_profiles enable row level security;
create policy "business profile own read" on public.business_profiles
  for select to authenticated using(user_id = (select auth.uid()));
create policy "business profile own insert" on public.business_profiles
  for insert to authenticated with check(user_id = (select auth.uid()));
create policy "business profile own update" on public.business_profiles
  for update to authenticated using(user_id = (select auth.uid())) with check(user_id = (select auth.uid()));
create index if not exists idx_business_profiles_company on public.business_profiles(company_id);
revoke all on table public.business_profiles from anon,authenticated;
grant select,insert,update on table public.business_profiles to authenticated;

-- 3. Versioned commercial catalog. Static labels remain in code; contractual
-- lifecycle and package composition are persisted and auditable.
create table if not exists public.solution_catalog (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  lifecycle_status text not null,
  is_activatable boolean not null default false,
  sort_order int not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint solution_lifecycle_ck check(lifecycle_status in('DRAFT','PILOT','AVAILABLE','ROADMAP','DEPRECATED','RETIRED'))
);

create table if not exists public.solution_packages (
  id uuid primary key default gen_random_uuid(),
  solution_id uuid not null references public.solution_catalog(id) on delete restrict,
  code text not null,
  version int not null,
  name text not null,
  module_codes text[] not null default '{}',
  capability_codes text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(solution_id,code,version),
  constraint solution_package_version_ck check(version > 0)
);

alter table public.solution_catalog enable row level security;
alter table public.solution_packages enable row level security;
create policy "solution catalog authenticated read" on public.solution_catalog
  for select to authenticated using((select auth.uid()) is not null);
create policy "solution packages authenticated read" on public.solution_packages
  for select to authenticated using((select auth.uid()) is not null);
revoke all on table public.solution_catalog from anon,authenticated;
revoke all on table public.solution_packages from anon,authenticated;
grant select on table public.solution_catalog to authenticated;
grant select on table public.solution_packages to authenticated;

insert into public.solution_catalog(code,name,lifecycle_status,is_activatable,sort_order) values
  ('pos','PROCESA POS','PILOT',true,10),
  ('rest','PROCESA REST','ROADMAP',false,20),
  ('conta','PROCESA CONTA','ROADMAP',false,30),
  ('gym','PROCESA GYM','ROADMAP',false,40),
  ('vet','PROCESA VET','ROADMAP',false,50)
on conflict(code) do update set
  name=excluded.name,
  lifecycle_status=excluded.lifecycle_status,
  is_activatable=excluded.is_activatable,
  sort_order=excluded.sort_order,
  updated_at=now();

insert into public.solution_packages(solution_id,code,version,name,module_codes,capability_codes,is_active)
select id,'pos-starter',1,'POS Starter',array['pos'],array[
  'pos.catalog','pos.products','pos.inventory','pos.cash','pos.terminal',
  'pos.sales','pos.purchases','pos.suppliers','pos.reports'
],true
from public.solution_catalog where code='pos'
on conflict(solution_id,code,version) do update set
  name=excluded.name,
  module_codes=excluded.module_codes,
  capability_codes=excluded.capability_codes,
  is_active=excluded.is_active;

-- 4. A company may activate multiple solutions. Technical enablement continues
-- to use company_modules; this table is the commercial activation record.
create table if not exists public.company_solution_activations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  solution_id uuid not null references public.solution_catalog(id) on delete restrict,
  package_id uuid not null references public.solution_packages(id) on delete restrict,
  status text not null default 'PENDING',
  entitlement_snapshot jsonb not null default '{}'::jsonb,
  activated_by uuid references auth.users(id) on delete set null,
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id,solution_id),
  constraint activation_status_ck check(status in('PENDING','CONFIGURING','ACTIVE','SUSPENDED','DEACTIVATED')),
  constraint activation_snapshot_ck check(jsonb_typeof(entitlement_snapshot) = 'object')
);

alter table public.company_solution_activations enable row level security;
create policy "company activations tenant read" on public.company_solution_activations
  for select to authenticated using(public.is_company_member(company_id));
create policy "platform admins manage company activations" on public.company_solution_activations
  for all to authenticated using(public.is_platform_admin()) with check(public.is_platform_admin());
create index if not exists idx_company_activations_status
  on public.company_solution_activations(company_id,status);
revoke all on table public.company_solution_activations from anon,authenticated;
grant select on table public.company_solution_activations to authenticated;

-- 5. Branch scope foundation. Absence of an explicit row means ALL_BRANCHES,
-- preserving legacy access until an administrator deliberately restricts it.
alter table public.company_memberships
  add constraint company_memberships_id_company_uq unique(id,company_id);
alter table public.branches
  add constraint branches_id_company_uq unique(id,company_id);

create table if not exists public.membership_branch_scopes (
  membership_id uuid primary key,
  company_id uuid not null,
  access_mode text not null default 'ALL_BRANCHES',
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  foreign key(membership_id,company_id)
    references public.company_memberships(id,company_id) on delete cascade,
  constraint membership_branch_scope_mode_ck check(access_mode in('ALL_BRANCHES','SPECIFIC_BRANCHES'))
);

create table if not exists public.membership_branch_access (
  membership_id uuid not null,
  company_id uuid not null,
  branch_id uuid not null,
  created_at timestamptz not null default now(),
  primary key(membership_id,branch_id),
  foreign key(membership_id,company_id)
    references public.company_memberships(id,company_id) on delete cascade,
  foreign key(branch_id,company_id)
    references public.branches(id,company_id) on delete cascade
);

alter table public.membership_branch_scopes enable row level security;
alter table public.membership_branch_access enable row level security;
create policy "membership branch scopes tenant read" on public.membership_branch_scopes
  for select to authenticated using(public.is_company_member(company_id));
create policy "membership branch access tenant read" on public.membership_branch_access
  for select to authenticated using(public.is_company_member(company_id));
create policy "membership branch scopes tenant manage" on public.membership_branch_scopes
  for all to authenticated using(public.has_permission(company_id,'roles.manage'))
  with check(public.has_permission(company_id,'roles.manage'));
create policy "membership branch access tenant manage" on public.membership_branch_access
  for all to authenticated using(public.has_permission(company_id,'roles.manage'))
  with check(public.has_permission(company_id,'roles.manage'));
create index if not exists idx_membership_branch_scopes_company
  on public.membership_branch_scopes(company_id,access_mode);
create index if not exists idx_membership_branch_access_company_branch
  on public.membership_branch_access(company_id,branch_id);
revoke all on table public.membership_branch_scopes from anon,authenticated;
revoke all on table public.membership_branch_access from anon,authenticated;
grant select on table public.membership_branch_scopes to authenticated;
grant select on table public.membership_branch_access to authenticated;

create or replace function public.membership_can_access_branch(p_company_id uuid,p_branch_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1
    from public.company_memberships cm
    left join public.membership_branch_scopes mbs on mbs.membership_id=cm.id
    where cm.company_id=p_company_id
      and cm.user_id=auth.uid()
      and cm.status='active'
      and exists(select 1 from public.branches b where b.id=p_branch_id and b.company_id=p_company_id and b.is_active=true)
      and (
        mbs.membership_id is null -- legacy: unrestricted
        or mbs.access_mode='ALL_BRANCHES'
        or exists(
          select 1 from public.membership_branch_access mba
          where mba.membership_id=cm.id and mba.company_id=p_company_id and mba.branch_id=p_branch_id
        )
      )
  );
$$;
revoke all on function public.membership_can_access_branch(uuid,uuid) from public;
grant execute on function public.membership_can_access_branch(uuid,uuid) to authenticated;

-- Replace permissive branch reads so an explicit membership scope becomes
-- authorization, while memberships without a scope row keep legacy access.
drop policy if exists branches_member_select on public.branches;
drop policy if exists "branches tenant read" on public.branches;
create policy "branches membership scope read" on public.branches
  for select to authenticated
  using(public.membership_can_access_branch(company_id,id));

create or replace function public.set_membership_branch_scope(
  p_company_id uuid,
  p_membership_id uuid,
  p_access_mode text,
  p_branch_ids uuid[] default '{}'
) returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.has_permission(p_company_id,'roles.manage') then raise exception 'FORBIDDEN_PERMISSION'; end if;
  if p_access_mode not in('ALL_BRANCHES','SPECIFIC_BRANCHES') then raise exception 'INVALID_BRANCH_SCOPE'; end if;
  if not exists(select 1 from public.company_memberships where id=p_membership_id and company_id=p_company_id and status='active') then
    raise exception 'MEMBERSHIP_NOT_FOUND';
  end if;
  if p_access_mode='SPECIFIC_BRANCHES' and cardinality(p_branch_ids)=0 then raise exception 'BRANCH_SCOPE_EMPTY'; end if;
  if exists(select 1 from unnest(p_branch_ids) x where not exists(
    select 1 from public.branches b where b.id=x and b.company_id=p_company_id and b.is_active=true
  )) then raise exception 'BRANCH_NOT_IN_COMPANY'; end if;

  insert into public.membership_branch_scopes(membership_id,company_id,access_mode,updated_by,updated_at)
  values(p_membership_id,p_company_id,p_access_mode,auth.uid(),now())
  on conflict(membership_id) do update set
    access_mode=excluded.access_mode,updated_by=auth.uid(),updated_at=now();

  delete from public.membership_branch_access where membership_id=p_membership_id;
  if p_access_mode='SPECIFIC_BRANCHES' then
    insert into public.membership_branch_access(membership_id,company_id,branch_id)
    select p_membership_id,p_company_id,x from unnest(p_branch_ids) x;
  end if;

  insert into public.audit_logs(company_id,actor_user_id,action,entity_type,entity_id,metadata)
  values(p_company_id,auth.uid(),'membership.branch_scope.updated','membership',p_membership_id,
    jsonb_build_object('access_mode',p_access_mode,'branch_count',cardinality(p_branch_ids)));
end;$$;
revoke all on function public.set_membership_branch_scope(uuid,uuid,text,uuid[]) from public;
grant execute on function public.set_membership_branch_scope(uuid,uuid,text,uuid[]) to authenticated;

-- 6. Idempotent company creation using the canonical onboarding state.
create or replace function public.create_company_with_trial(
  p_name text,p_legal_name text,p_tax_id text,p_currency text,p_timezone text,p_plan_code text
) returns uuid language plpgsql security definer set search_path='' as $$
declare cid uuid;mid uuid;rid uuid;pid uuid;existing_company uuid;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;

  select os.company_id into existing_company
  from public.onboarding_states os where os.user_id=auth.uid() for update;
  if existing_company is not null and exists(
    select 1 from public.company_memberships cm
    where cm.company_id=existing_company and cm.user_id=auth.uid() and cm.status='active'
  ) then return existing_company; end if;

  select id into pid from public.plans where code=p_plan_code and is_active=true;
  if pid is null then raise exception 'INVALID_PLAN'; end if;

  insert into public.companies(name,legal_name,tax_id,currency,timezone,status)
  values(trim(p_name),trim(p_legal_name),nullif(trim(p_tax_id),''),upper(p_currency),p_timezone,'active')
  returning id into cid;
  insert into public.company_memberships(company_id,user_id,status)
  values(cid,auth.uid(),'active') returning id into mid;
  insert into public.roles(company_id,name,is_system)
  values(cid,'Administrador',true) returning id into rid;
  insert into public.membership_roles(membership_id,role_id) values(mid,rid);
  insert into public.role_permissions(role_id,permission_id) select rid,id from public.permissions;
  insert into public.subscriptions(company_id,plan_id,status,starts_at,ends_at)
  values(cid,pid,'trial',now(),now()+interval '14 days');

  update public.business_profiles set company_id=cid,updated_at=now() where user_id=auth.uid();
  update public.onboarding_states set company_id=cid,current_step='branch',last_completed_step='company',
    status='IN_PROGRESS',updated_at=now() where user_id=auth.uid();
  insert into public.audit_logs(company_id,actor_user_id,action,entity_type,entity_id,metadata)
  values(cid,auth.uid(),'company.created.onboarding','company',cid,jsonb_build_object('plan_code',p_plan_code));
  return cid;
end;$$;
revoke all on function public.create_company_with_trial(text,text,text,text,text,text) from public;
grant execute on function public.create_company_with_trial(text,text,text,text,text,text) to authenticated;

-- 7. Idempotent first branch. Same company/code returns the existing branch.
create or replace function public.create_first_branch(p_company_id uuid,p_name text,p_code text)
returns uuid language plpgsql security definer set search_path='' as $$
declare bid uuid;
begin
  if not public.has_permission(p_company_id,'branches.manage') then raise exception 'FORBIDDEN_PERMISSION'; end if;
  select id into bid from public.branches
    where company_id=p_company_id and upper(code)=upper(trim(p_code)) and deleted_at is null limit 1;
  if bid is not null then return bid; end if;
  perform public.assert_company_branch_capacity(p_company_id);
  insert into public.branches(company_id,name,code,is_active)
  values(p_company_id,trim(p_name),upper(trim(p_code)),true) returning id into bid;
  update public.onboarding_states set current_step='activation',last_completed_step='branch',updated_at=now()
    where user_id=auth.uid() and company_id=p_company_id;
  insert into public.audit_logs(company_id,actor_user_id,action,entity_type,entity_id,metadata)
  values(p_company_id,auth.uid(),'branch.created.onboarding','branch',bid,jsonb_build_object('code',upper(trim(p_code))));
  return bid;
end;$$;
revoke all on function public.create_first_branch(uuid,text,text) from public;
grant execute on function public.create_first_branch(uuid,text,text) to authenticated;

-- 8. Commercial activation and existing technical module enablement are one transaction.
create or replace function public.activate_solution_package(p_company_id uuid,p_package_code text)
returns uuid language plpgsql security definer set search_path='' as $$
declare sid uuid;pid uuid;aid uuid;mods text[];caps text[];allowed text[];solution_code text;
begin
  if not public.has_permission(p_company_id,'modules.manage') then raise exception 'FORBIDDEN_PERMISSION'; end if;
  perform public.assert_company_can_operate(p_company_id);

  select sc.id,sp.id,sp.module_codes,sp.capability_codes,sc.code
    into sid,pid,mods,caps,solution_code
  from public.solution_packages sp
  join public.solution_catalog sc on sc.id=sp.solution_id
  where sp.code=p_package_code and sp.is_active=true and sc.is_activatable=true
    and sc.lifecycle_status in('PILOT','AVAILABLE')
  order by sp.version desc limit 1;
  if pid is null then raise exception 'SOLUTION_NOT_ACTIVATABLE'; end if;

  select p.module_codes into allowed
  from public.subscriptions s join public.plans p on p.id=s.plan_id
  where s.company_id=p_company_id and s.status in('trial','active')
  order by s.created_at desc limit 1;
  if allowed is null or exists(select 1 from unnest(mods) x where not(x=any(allowed))) then
    raise exception 'PACKAGE_NOT_ENTITLED';
  end if;

  insert into public.company_solution_activations(
    company_id,solution_id,package_id,status,entitlement_snapshot,activated_by,activated_at,updated_at
  ) values(
    p_company_id,sid,pid,'CONFIGURING',
    jsonb_build_object('package_code',p_package_code,'module_codes',mods,'capability_codes',caps),
    auth.uid(),now(),now()
  ) on conflict(company_id,solution_id) do update set
    package_id=excluded.package_id,status='CONFIGURING',
    entitlement_snapshot=excluded.entitlement_snapshot,activated_by=auth.uid(),activated_at=now(),updated_at=now()
  returning id into aid;

  insert into public.company_modules(company_id,module_id,enabled)
  select p_company_id,m.id,true from public.modules m where m.code=any(mods)
  on conflict(company_id,module_id) do update set enabled=true;

  update public.onboarding_states set current_step='solution_setup',last_completed_step='activation',updated_at=now()
    where user_id=auth.uid() and company_id=p_company_id;
  insert into public.audit_logs(company_id,actor_user_id,action,entity_type,entity_id,metadata)
  values(p_company_id,auth.uid(),'solution.activated','solution_activation',aid,
    jsonb_build_object('solution_code',solution_code,'package_code',p_package_code));
  return aid;
end;$$;
revoke all on function public.activate_solution_package(uuid,text) from public;
grant execute on function public.activate_solution_package(uuid,text) to authenticated;

create or replace function public.complete_activation_foundation(p_company_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.is_company_member(p_company_id) then raise exception 'FORBIDDEN_COMPANY'; end if;
  update public.company_solution_activations set status='CONFIGURING',updated_at=now()
    where company_id=p_company_id and status in('PENDING','CONFIGURING');
  update public.onboarding_states set current_step='complete',last_completed_step='solution_setup',
    status='COMPLETED',completed_at=coalesce(completed_at,now()),updated_at=now()
    where user_id=auth.uid() and company_id=p_company_id;
  insert into public.audit_logs(company_id,actor_user_id,action,entity_type,entity_id,metadata)
  values(p_company_id,auth.uid(),'onboarding.activation_foundation.completed','company',p_company_id,'{}'::jsonb);
end;$$;
revoke all on function public.complete_activation_foundation(uuid) from public;
grant execute on function public.complete_activation_foundation(uuid) to authenticated;

-- Feature flag allows legacy users to continue without forced discovery.
insert into public.feature_flags(key,description,scope,is_enabled)
values('activation_foundation','Core SaaS 1 canonical activation journey','GLOBAL',true)
on conflict(key) do update set description=excluded.description;

-- Invitation delivery state is distinct from invitation creation.
alter table public.company_invitations
  add column if not exists delivery_status text not null default 'PENDING',
  add column if not exists delivery_error_code text,
  add column if not exists last_sent_at timestamptz;
alter table public.company_invitations
  add constraint company_invitation_delivery_ck check(delivery_status in('PENDING','SENT','FAILED','SIMULATED'));
