-- PROCESA CLOUD - BUNDLE COMPLETO DE MIGRACIONES (001 a 049)
-- Generado para ejecucion controlada y verificacion en Supabase

-- ========================================================
-- MIGRACION: 001_core.sql
-- ========================================================
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text not null,
  trade_name text,
  status text not null default 'active' check (status in ('active','suspended','archived')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_memberships (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('invited','active','suspended')),
  created_at timestamptz not null default now(),
  unique(company_id,user_id)
);
create index if not exists idx_memberships_user on public.company_memberships(user_id, company_id);

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  code text,
  active boolean not null default true,
  is_active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  unique(company_id, code)
);
create index if not exists idx_branches_company on public.branches(company_id);

create table if not exists public.demo_requests (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_name text not null,
  email text not null,
  phone text,
  modules text[] not null default '{}',
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create table if not exists public.storage_objects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  provider text not null,
  provider_object_id text not null,
  logical_path text not null,
  original_name text not null,
  mime_type text,
  size_bytes bigint,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_storage_company on public.storage_objects(company_id, created_at desc);

-- ========================================================
-- MIGRACION: 002_rls.sql
-- ========================================================
create or replace function public.is_company_member(target_company uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.company_memberships m
    where m.company_id = target_company and m.user_id = auth.uid() and m.status = 'active'
  );
$$;

alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.company_memberships enable row level security;
alter table public.branches enable row level security;
alter table public.storage_objects enable row level security;

create policy profiles_self_select on public.profiles for select using (id = auth.uid());
create policy companies_member_select on public.companies for select using (public.is_company_member(id));
create policy memberships_member_select on public.company_memberships for select using (user_id = auth.uid() or public.is_company_member(company_id));
create policy branches_member_select on public.branches for select using (public.is_company_member(company_id));
create policy storage_member_select on public.storage_objects for select using (public.is_company_member(company_id));

-- ========================================================
-- MIGRACION: 003_roles_modules_audit.sql
-- ========================================================
create table if not exists public.roles(id uuid primary key default gen_random_uuid(),company_id uuid references public.companies(id) on delete cascade,name text not null,is_system boolean not null default false,created_at timestamptz not null default now(),unique(company_id,name));create table if not exists public.permissions(id uuid primary key default gen_random_uuid(),code text not null unique,description text);create table if not exists public.role_permissions(role_id uuid references public.roles(id) on delete cascade,permission_id uuid references public.permissions(id) on delete cascade,primary key(role_id,permission_id));create table if not exists public.modules(id uuid primary key default gen_random_uuid(),code text not null unique,name text not null,status text not null default 'planned');create table if not exists public.company_modules(company_id uuid references public.companies(id) on delete cascade,module_id uuid references public.modules(id) on delete cascade,enabled boolean not null default true,primary key(company_id,module_id));create table if not exists public.audit_logs(id uuid primary key default gen_random_uuid(),company_id uuid references public.companies(id) on delete set null,actor_user_id uuid references auth.users(id) on delete set null,action text not null,entity_type text,entity_id uuid,metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now());insert into public.modules(code,name,status) values('core','Core','available'),('pos','POS','development'),('rest','REST','planned'),('conta','CONTA','planned'),('flow','FLOW','planned'),('docs','DOCS','planned'),('viernes','VIERNES','planned') on conflict(code) do update set name=excluded.name,status=excluded.status;

-- ========================================================
-- MIGRACION: 004_membership_roles_context.sql
-- ========================================================
create table if not exists public.membership_roles(
 membership_id uuid references public.company_memberships(id) on delete cascade,
 role_id uuid references public.roles(id) on delete cascade,
 primary key(membership_id,role_id)
);
alter table public.membership_roles enable row level security;

create or replace function public.get_my_company_contexts()
returns table("membershipId" uuid,"companyId" uuid,"companyName" text,"roleCodes" text[],"permissions" text[])
language sql stable security definer set search_path=public as $$
 select cm.id, c.id, c.name,
 coalesce(array_agg(distinct r.name) filter(where r.id is not null),'{}'),
 coalesce(array_agg(distinct p.code) filter(where p.id is not null),'{}')
 from public.company_memberships cm
 join public.companies c on c.id=cm.company_id
 left join public.membership_roles mr on mr.membership_id=cm.id
 left join public.roles r on r.id=mr.role_id
 left join public.role_permissions rp on rp.role_id=r.id
 left join public.permissions p on p.id=rp.permission_id
 where cm.user_id=auth.uid() and cm.status='active'
 group by cm.id,c.id,c.name;
$$;
revoke all on function public.get_my_company_contexts() from public;
grant execute on function public.get_my_company_contexts() to authenticated;

insert into public.permissions(code,description) values
('company.read','Ver empresa'),('company.update','Editar empresa'),('branches.read','Ver sucursales'),
('branches.manage','Administrar sucursales'),('users.read','Ver usuarios'),('users.invite','Invitar usuarios'),
('roles.read','Ver roles'),('roles.manage','Administrar roles'),('modules.read','Ver módulos'),
('modules.manage','Administrar módulos'),('audit.read','Ver auditoría'),('subscription.read','Ver suscripción')
on conflict(code) do nothing;

-- ========================================================
-- MIGRACION: 005_plans_subscriptions_notifications.sql
-- ========================================================
create table if not exists public.plans(
 id uuid primary key default gen_random_uuid(),code text not null unique,name text not null,
 max_users int,max_branches int,features jsonb not null default '{}'::jsonb,is_active boolean not null default true
);
create table if not exists public.subscriptions(
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id) on delete cascade,
 plan_id uuid not null references public.plans(id),status text not null default 'trial',
 starts_at timestamptz not null default now(),ends_at timestamptz,created_at timestamptz not null default now()
);
create table if not exists public.notifications(
 id uuid primary key default gen_random_uuid(),company_id uuid references public.companies(id) on delete cascade,
 user_id uuid references auth.users(id) on delete cascade,title text not null,body text,read_at timestamptz,created_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;alter table public.notifications enable row level security;
create policy "subscription tenant read" on public.subscriptions for select using(public.is_company_member(company_id));
create policy "notification own read" on public.notifications for select using(user_id=auth.uid() and (company_id is null or public.is_company_member(company_id)));
insert into public.plans(code,name,max_users,max_branches) values
('free','Free',2,1),('lite','Lite',5,1),('pro','Pro',20,5),('business','Business',100,20),('enterprise','Enterprise',null,null)
on conflict(code) do update set name=excluded.name,max_users=excluded.max_users,max_branches=excluded.max_branches;

-- ========================================================
-- MIGRACION: 006_branch_constraints_platform_admin.sql
-- ========================================================
alter table public.branches add column if not exists code text;
alter table public.branches add column if not exists is_active boolean not null default true;
create unique index if not exists branches_company_code_uq on public.branches(company_id,code) where deleted_at is null;

create table if not exists public.platform_admins(
 user_id uuid primary key references auth.users(id) on delete cascade,
 level text not null default 'admin',
 is_active boolean not null default true,
 created_at timestamptz not null default now()
);
alter table public.platform_admins enable row level security;
create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.platform_admins pa where pa.user_id=auth.uid() and pa.is_active=true);
$$;
revoke all on function public.is_platform_admin() from public;
grant execute on function public.is_platform_admin() to authenticated;
create policy "platform admins self read" on public.platform_admins for select using(user_id=auth.uid());

-- ========================================================
-- MIGRACION: 007_core_role_seeds.sql
-- ========================================================
insert into public.permissions(code,description) values
('subscription.manage','Administrar suscripción'),('notifications.read','Ver notificaciones'),('notifications.manage','Administrar notificaciones'),('storage.read','Ver archivos'),('storage.manage','Administrar archivos')
on conflict(code) do nothing;
create or replace function public.bootstrap_company_roles(p_company_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
 if not public.is_company_member(p_company_id) then raise exception 'forbidden'; end if;
 insert into public.roles(company_id,name,is_system) values
 (p_company_id,'Administrador',true),(p_company_id,'Supervisor',true),(p_company_id,'Cajero',true),
 (p_company_id,'Vendedor',true),(p_company_id,'Almacén',true),(p_company_id,'Contador',true),(p_company_id,'Consulta',true)
 on conflict(company_id,name) do nothing;
end;$$;
revoke all on function public.bootstrap_company_roles(uuid) from public;
grant execute on function public.bootstrap_company_roles(uuid) to authenticated;

-- ========================================================
-- MIGRACION: 008_rls_hardening.sql
-- ========================================================
drop policy if exists "branches tenant read" on public.branches;
create policy "branches tenant read" on public.branches for select using(public.is_company_member(company_id));
drop policy if exists "memberships tenant read" on public.company_memberships;
create policy "memberships tenant read" on public.company_memberships for select using(user_id=auth.uid() or public.is_company_member(company_id));
create policy "roles tenant read v2" on public.roles for select using(public.is_company_member(company_id));
create policy "role permissions tenant read" on public.role_permissions for select using(exists(select 1 from public.roles r where r.id=role_id and public.is_company_member(r.company_id)));
create policy "membership roles tenant read" on public.membership_roles for select using(exists(select 1 from public.company_memberships cm where cm.id=membership_id and public.is_company_member(cm.company_id)));

-- ========================================================
-- MIGRACION: 009_company_settings_role_mutations.sql
-- ========================================================
alter table public.companies add column if not exists legal_name text;alter table public.companies add column if not exists tax_id text;alter table public.companies add column if not exists timezone text not null default 'America/Lima';alter table public.companies add column if not exists currency text not null default 'PEN';
create or replace function public.has_permission(p_company_id uuid,p_code text) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.company_memberships cm join public.membership_roles mr on mr.membership_id=cm.id join public.role_permissions rp on rp.role_id=mr.role_id join public.permissions p on p.id=rp.permission_id where cm.user_id=auth.uid() and cm.company_id=p_company_id and cm.status='active' and p.code=p_code);
$$;
revoke all on function public.has_permission(uuid,text) from public;grant execute on function public.has_permission(uuid,text) to authenticated;
create policy "roles tenant insert" on public.roles for insert with check(public.has_permission(company_id,'roles.manage'));
create policy "roles tenant update" on public.roles for update using(public.has_permission(company_id,'roles.manage')) with check(public.has_permission(company_id,'roles.manage'));

-- ========================================================
-- MIGRACION: 010_branch_write_policies.sql
-- ========================================================
create policy "branches tenant insert" on public.branches for insert with check(public.has_permission(company_id,'branches.manage'));
create policy "branches tenant update" on public.branches for update using(public.has_permission(company_id,'branches.manage')) with check(public.has_permission(company_id,'branches.manage'));

-- ========================================================
-- MIGRACION: 011_settings_notifications_role_policies.sql
-- ========================================================
create policy "companies tenant update" on public.companies for update using(public.has_permission(id,'company.update')) with check(public.has_permission(id,'company.update'));
create policy "notifications own update" on public.notifications for update using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "role permissions tenant insert" on public.role_permissions for insert with check(exists(select 1 from public.roles r where r.id=role_id and public.has_permission(r.company_id,'roles.manage')));
create policy "role permissions tenant delete" on public.role_permissions for delete using(exists(select 1 from public.roles r where r.id=role_id and public.has_permission(r.company_id,'roles.manage')));

-- ========================================================
-- MIGRACION: 012_company_invitations.sql
-- ========================================================
create table if not exists public.company_invitations(
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id) on delete cascade,
 email text not null,role_id uuid references public.roles(id) on delete set null,status text not null default 'pending',
 token_hash text not null unique,expires_at timestamptz not null,invited_by uuid references auth.users(id) on delete set null,
 accepted_by uuid references auth.users(id) on delete set null,accepted_at timestamptz,created_at timestamptz not null default now(),
 constraint invitation_status_ck check(status in('pending','accepted','revoked','expired'))
);
create unique index if not exists company_invite_pending_email_uq on public.company_invitations(company_id,lower(email)) where status='pending';
alter table public.company_invitations enable row level security;
create policy "invites tenant read" on public.company_invitations for select using(public.has_permission(company_id,'users.read') or public.has_permission(company_id,'users.invite'));
create policy "invites tenant insert" on public.company_invitations for insert with check(public.has_permission(company_id,'users.invite'));
create policy "invites tenant update" on public.company_invitations for update using(public.has_permission(company_id,'users.invite'));

-- ========================================================
-- MIGRACION: 013_accept_invitation.sql
-- ========================================================
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

-- ========================================================
-- MIGRACION: 014_audit_and_indexes.sql
-- ========================================================
create index if not exists memberships_company_status_idx on public.company_memberships(company_id,status);
create index if not exists invitations_company_status_idx on public.company_invitations(company_id,status,created_at desc);
create index if not exists notifications_user_read_idx on public.notifications(user_id,read_at,created_at desc);
create index if not exists branches_company_active_idx on public.branches(company_id,is_active);
create index if not exists storage_company_created_idx on public.storage_objects(company_id,created_at desc);

-- ========================================================
-- MIGRACION: 015_entitlements.sql
-- ========================================================
alter table public.plans add column if not exists module_codes text[] not null default array['core']::text[];
update public.plans set module_codes=array['core'] where code='free';
update public.plans set module_codes=array['core','pos'] where code='lite';
update public.plans set module_codes=array['core','pos','inventory'] where code='pro';
update public.plans set module_codes=array['core','pos','inventory','rest','docs','cobros'] where code='business';
update public.plans set module_codes=array['core','pos','inventory','rest','docs','cobros','conta','flow','rrhh','tickets','forms','viernes'] where code='enterprise';
create or replace function public.company_has_module(p_company_id uuid,p_code text) returns boolean language sql stable security definer set search_path=public as $$
 select public.is_company_member(p_company_id) and (
 exists(select 1 from public.company_modules cm join public.modules m on m.id=cm.module_id where cm.company_id=p_company_id and cm.enabled=true and m.code=p_code)
 or exists(select 1 from public.subscriptions s join public.plans p on p.id=s.plan_id where s.company_id=p_company_id and s.status in('trial','active') and p_code=any(p.module_codes))
 );
$$;
revoke all on function public.company_has_module(uuid,text) from public;grant execute on function public.company_has_module(uuid,text) to authenticated;

-- ========================================================
-- MIGRACION: 016_storage_rls.sql
-- ========================================================
alter table public.storage_objects enable row level security;
create policy "storage tenant read" on public.storage_objects for select using(public.has_permission(company_id,'storage.read'));
create policy "storage tenant insert" on public.storage_objects for insert with check(public.has_permission(company_id,'storage.manage'));
create policy "storage tenant update" on public.storage_objects for update using(public.has_permission(company_id,'storage.manage')) with check(public.has_permission(company_id,'storage.manage'));

-- ========================================================
-- MIGRACION: 017_audit_immutability_and_invite_hardening.sql
-- ========================================================
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

-- ========================================================
-- MIGRACION: 018_company_module_management.sql
-- ========================================================
create policy "company modules tenant insert" on public.company_modules
for insert with check(public.has_permission(company_id,'modules.manage'));
create policy "company modules tenant update" on public.company_modules
for update using(public.has_permission(company_id,'modules.manage'))
with check(public.has_permission(company_id,'modules.manage'));
create policy "company modules tenant delete" on public.company_modules
for delete using(public.has_permission(company_id,'modules.manage'));

-- ========================================================
-- MIGRACION: 019_constraints_hardening.sql
-- ========================================================
alter table public.company_memberships add constraint memberships_status_ck check(status in('invited','active','suspended','removed')) not valid;
alter table public.subscriptions add constraint subscriptions_status_ck check(status in('trial','active','past_due','cancelled','expired')) not valid;
alter table public.modules add constraint modules_status_ck check(status in('available','development','planned','disabled')) not valid;
alter table public.storage_objects add constraint storage_size_ck check(size_bytes is null or size_bytes>=0) not valid;
create index if not exists company_modules_enabled_idx on public.company_modules(company_id,enabled);
create index if not exists audit_actor_created_idx on public.audit_logs(actor_user_id,created_at desc);

-- ========================================================
-- MIGRACION: 020_demo_security.sql
-- ========================================================
alter table public.demo_requests enable row level security;
-- Public/anon submission is intentionally not granted directly.
-- Production demo intake should run through a trusted server endpoint/function with rate limiting.
revoke insert,update,delete,select on public.demo_requests from anon;

-- ========================================================
-- MIGRACION: 021_rls_delete_and_audit.sql
-- ========================================================
create policy "branches tenant delete" on public.branches for delete using(public.has_permission(company_id,'branches.manage'));
-- audit_logs remains append-only from trusted server paths; tenant clients get no mutation policy.
create index if not exists companies_created_idx on public.companies(created_at desc);

-- ========================================================
-- MIGRACION: 022_system_settings.sql
-- ========================================================
create table if not exists public.system_settings(
 key text primary key,value jsonb not null default '{}'::jsonb,is_public boolean not null default false,updated_at timestamptz not null default now()
);
alter table public.system_settings enable row level security;
create policy "public settings read" on public.system_settings for select using(is_public=true or public.is_platform_admin());
insert into public.system_settings(key,value,is_public) values
('brand','{"name":"PROCESA Cloud","company":"PROCESA CORP","primaryColor":"#1b2c54","slogan":"El futuro se procesa hoy."}'::jsonb,true),
('maintenance','{"enabled":false}'::jsonb,true)
on conflict(key) do nothing;

-- ========================================================
-- MIGRACION: 023_audit_read_policy.sql
-- ========================================================
alter table public.audit_logs enable row level security;
drop policy if exists "audit tenant read" on public.audit_logs;
create policy "audit tenant read" on public.audit_logs for select using(public.has_permission(company_id,'audit.read'));

-- ========================================================
-- MIGRACION: 024_notification_integrity.sql
-- ========================================================
alter table public.notifications add column if not exists type text not null default 'info';
alter table public.notifications add constraint notifications_type_ck check(type in('info','success','warning','error','action')) not valid;
create index if not exists notifications_company_created_idx on public.notifications(company_id,created_at desc);

-- ========================================================
-- MIGRACION: 025_subscription_uniqueness.sql
-- ========================================================
create unique index if not exists subscriptions_one_current_per_company on public.subscriptions(company_id) where status in('trial','active','past_due');create index if not exists subscriptions_company_status_idx on public.subscriptions(company_id,status,created_at desc);

-- ========================================================
-- MIGRACION: 026_membership_uniqueness.sql
-- ========================================================
create unique index if not exists memberships_company_user_uq on public.company_memberships(company_id,user_id);create index if not exists membership_roles_role_idx on public.membership_roles(role_id,membership_id);

-- ========================================================
-- MIGRACION: 027_platform_admin_hardening.sql
-- ========================================================
create table if not exists public.platform_admins(user_id uuid primary key references auth.users(id) on delete cascade,is_active boolean not null default true,created_at timestamptz not null default now());
alter table public.platform_admins enable row level security;
create or replace function public.is_platform_admin() returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from public.platform_admins p where p.user_id=auth.uid() and p.is_active=true)$$;
revoke all on function public.is_platform_admin() from public;grant execute on function public.is_platform_admin() to authenticated;
create policy "platform admin self read" on public.platform_admins for select using(user_id=auth.uid() and is_active=true);

-- ========================================================
-- MIGRACION: 028_platform_audit.sql
-- ========================================================
create table if not exists public.platform_audit_logs(id uuid primary key default gen_random_uuid(),actor_user_id uuid references auth.users(id),action text not null,entity_type text,entity_id text,metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now());
alter table public.platform_audit_logs enable row level security;
create policy "platform admins read platform audit" on public.platform_audit_logs for select using(public.is_platform_admin());
revoke insert,update,delete on public.platform_audit_logs from authenticated;
create index if not exists platform_audit_created_idx on public.platform_audit_logs(created_at desc);

-- ========================================================
-- MIGRACION: 029_onboarding_functions.sql
-- ========================================================
create or replace function public.create_company_with_owner(p_name text,p_legal_name text,p_tax_id text,p_currency text,p_timezone text)
returns uuid language plpgsql security definer set search_path=public as $$
declare cid uuid; mid uuid; rid uuid;
begin
 if auth.uid() is null then raise exception 'unauthenticated';end if;
 insert into public.companies(name,legal_name,tax_id,currency,timezone,status) values(p_name,p_legal_name,p_tax_id,p_currency,p_timezone,'active') returning id into cid;
 insert into public.company_memberships(company_id,user_id,status) values(cid,auth.uid(),'active') returning id into mid;
 insert into public.roles(company_id,name,is_system) values(cid,'Administrador',true) returning id into rid;
 insert into public.membership_roles(membership_id,role_id) values(mid,rid);
 insert into public.role_permissions(role_id,permission_id) select rid,id from public.permissions;
 return cid;
end;$$;
revoke all on function public.create_company_with_owner(text,text,text,text,text) from public;grant execute on function public.create_company_with_owner(text,text,text,text,text) to authenticated;

create or replace function public.create_first_branch(p_company_id uuid,p_name text,p_code text)
returns uuid language plpgsql security definer set search_path=public as $$
declare bid uuid;
begin
 if not public.has_permission(p_company_id,'branches.manage') then raise exception 'forbidden';end if;
 insert into public.branches(company_id,name,code,is_active) values(p_company_id,p_name,p_code,true) returning id into bid;
 return bid;
end;$$;
revoke all on function public.create_first_branch(uuid,text,text) from public;grant execute on function public.create_first_branch(uuid,text,text) to authenticated;

-- ========================================================
-- MIGRACION: 030_trial_onboarding.sql
-- ========================================================
create or replace function public.create_company_with_trial(p_name text,p_legal_name text,p_tax_id text,p_currency text,p_timezone text,p_plan_code text)
returns uuid language plpgsql security definer set search_path=public as $$
declare cid uuid;mid uuid;rid uuid;pid uuid;
begin
 if auth.uid() is null then raise exception 'unauthenticated';end if;
 select id into pid from public.plans where code=p_plan_code and is_active=true;
 if pid is null then raise exception 'invalid plan';end if;
 insert into public.companies(name,legal_name,tax_id,currency,timezone,status) values(p_name,p_legal_name,p_tax_id,p_currency,p_timezone,'active') returning id into cid;
 insert into public.company_memberships(company_id,user_id,status) values(cid,auth.uid(),'active') returning id into mid;
 insert into public.roles(company_id,name,is_system) values(cid,'Administrador',true) returning id into rid;
 insert into public.membership_roles(membership_id,role_id) values(mid,rid);
 insert into public.role_permissions(role_id,permission_id) select rid,id from public.permissions;
 insert into public.subscriptions(company_id,plan_id,status,starts_at,ends_at) values(cid,pid,'trial',now(),now()+interval '14 days');
 return cid;
end;$$;
revoke all on function public.create_company_with_trial(text,text,text,text,text,text) from public;grant execute on function public.create_company_with_trial(text,text,text,text,text,text) to authenticated;

create or replace function public.set_initial_company_modules(p_company_id uuid,p_codes text[])
returns void language plpgsql security definer set search_path=public as $$
declare allowed text[];
begin
 if not public.has_permission(p_company_id,'modules.manage') then raise exception 'forbidden';end if;
 select p.module_codes into allowed from public.subscriptions s join public.plans p on p.id=s.plan_id where s.company_id=p_company_id and s.status in('trial','active') order by s.created_at desc limit 1;
 if allowed is null then raise exception 'no active plan';end if;
 if exists(select 1 from unnest(p_codes) x where not(x=any(allowed))) then raise exception 'module not entitled';end if;
 insert into public.company_modules(company_id,module_id,enabled)
 select p_company_id,m.id,true from public.modules m where m.code=any(p_codes)
 on conflict(company_id,module_id) do update set enabled=true;
end;$$;
revoke all on function public.set_initial_company_modules(uuid,text[]) from public;grant execute on function public.set_initial_company_modules(uuid,text[]) to authenticated;

-- ========================================================
-- MIGRACION: 031_onboarding_state.sql
-- ========================================================
create table if not exists public.onboarding_states(
 user_id uuid primary key references auth.users(id) on delete cascade,
 current_step text not null default 'plan',
 selected_plan_code text,
 company_id uuid references public.companies(id) on delete set null,
 selected_module_codes text[] not null default '{}',
 completed_at timestamptz,
 updated_at timestamptz not null default now(),
 constraint onboarding_step_ck check(current_step in('plan','company','modules','branch','complete'))
);
alter table public.onboarding_states enable row level security;
create policy "own onboarding read" on public.onboarding_states for select using(user_id=auth.uid());
create policy "own onboarding insert" on public.onboarding_states for insert with check(user_id=auth.uid());
create policy "own onboarding update" on public.onboarding_states for update using(user_id=auth.uid()) with check(user_id=auth.uid());

-- ========================================================
-- MIGRACION: 032_plan_enforcement.sql
-- ========================================================
create or replace function public.assert_company_user_capacity(p_company_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare maxu int; currentu int;
begin
 select p.max_users into maxu
 from public.subscriptions s join public.plans p on p.id=s.plan_id
 where s.company_id=p_company_id and s.status in('trial','active')
 order by s.created_at desc limit 1;
 if maxu is null then return; end if;
 select count(*) into currentu from public.company_memberships where company_id=p_company_id and status='active';
 if currentu>=maxu then raise exception 'PLAN_USER_LIMIT';end if;
end;$$;
revoke all on function public.assert_company_user_capacity(uuid) from public;
grant execute on function public.assert_company_user_capacity(uuid) to authenticated;

create or replace function public.assert_company_branch_capacity(p_company_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare maxb int; currentb int;
begin
 select p.max_branches into maxb
 from public.subscriptions s join public.plans p on p.id=s.plan_id
 where s.company_id=p_company_id and s.status in('trial','active')
 order by s.created_at desc limit 1;
 if maxb is null then return; end if;
 select count(*) into currentb from public.branches where company_id=p_company_id and is_active=true;
 if currentb>=maxb then raise exception 'PLAN_BRANCH_LIMIT';end if;
end;$$;
revoke all on function public.assert_company_branch_capacity(uuid) from public;
grant execute on function public.assert_company_branch_capacity(uuid) to authenticated;

-- ========================================================
-- MIGRACION: 033_membership_lifecycle.sql
-- ========================================================
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

-- ========================================================
-- MIGRACION: 034_invitation_enforcement.sql
-- ========================================================
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

-- ========================================================
-- MIGRACION: 035_branch_limit_enforcement.sql
-- ========================================================
create or replace function public.create_first_branch(p_company_id uuid,p_name text,p_code text)
returns uuid language plpgsql security definer set search_path=public as $$
declare bid uuid;
begin
 if not public.has_permission(p_company_id,'branches.manage') then raise exception 'forbidden';end if;
 perform public.assert_company_branch_capacity(p_company_id);
 insert into public.branches(company_id,name,code,is_active) values(p_company_id,p_name,p_code,true) returning id into bid;
 return bid;
end;$$;
revoke all on function public.create_first_branch(uuid,text,text) from public;
grant execute on function public.create_first_branch(uuid,text,text) to authenticated;

-- ========================================================
-- MIGRACION: 036_invitation_acceptance.sql
-- ========================================================
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

-- ========================================================
-- MIGRACION: 037_audit_immutability.sql
-- ========================================================
-- Tenant audit records are append-only for authenticated client roles.
revoke update,delete on table public.audit_logs from authenticated;
-- Platform audit records are also append-only from client sessions.
revoke update,delete on table public.platform_audit_logs from authenticated;

-- ========================================================
-- MIGRACION: 038_invitation_indexes.sql
-- ========================================================
create index if not exists idx_company_invitations_company_status on public.company_invitations(company_id,status);
create index if not exists idx_company_invitations_email_status on public.company_invitations(lower(email),status);
create unique index if not exists uq_company_invitation_token_hash on public.company_invitations(token_hash) where token_hash is not null;
create index if not exists idx_memberships_company_status on public.company_memberships(company_id,status);
create index if not exists idx_branches_company_active on public.branches(company_id,is_active);
create index if not exists idx_subscriptions_company_status_created on public.subscriptions(company_id,status,created_at desc);

-- ========================================================
-- MIGRACION: 039_onboarding_updated_at.sql
-- ========================================================
create or replace function public.touch_onboarding_updated_at() returns trigger language plpgsql as $$begin new.updated_at=now();return new;end;$$;
drop trigger if exists trg_onboarding_updated_at on public.onboarding_states;
create trigger trg_onboarding_updated_at before update on public.onboarding_states for each row execute function public.touch_onboarding_updated_at();

-- ========================================================
-- MIGRACION: 040_permission_catalog_hardening.sql
-- ========================================================
-- Catálogo mínimo Core, extensible y sin depender de nombres de roles.
insert into public.permissions(code,description) values
('branches.read','Ver sucursales'),
('branches.manage','Administrar sucursales'),
('users.read','Ver usuarios y membresías'),
('users.invite','Invitar, suspender o retirar usuarios'),
('roles.read','Ver roles y permisos'),
('roles.manage','Administrar roles y permisos'),
('modules.read','Ver módulos'),
('modules.manage','Administrar módulos'),
('company.read','Ver configuración de empresa'),
('company.update','Actualizar configuración de empresa'),
('subscription.read','Ver plan y capacidad'),
('subscription.manage','Administrar cambios de suscripción'),
('storage.read','Ver archivos'),
('storage.manage','Administrar archivos'),
('audit.read','Ver auditoría'),
('notifications.read','Ver notificaciones')
on conflict(code) do update set description=excluded.description;

-- ========================================================
-- MIGRACION: 041_default_admin_permissions.sql
-- ========================================================
create or replace function public.sync_system_admin_permissions(p_company_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare rid uuid;
begin
 if not public.has_permission(p_company_id,'roles.manage') and not exists(
   select 1 from public.company_memberships cm
   where cm.company_id=p_company_id and cm.user_id=auth.uid() and cm.status='active'
 ) then raise exception 'forbidden'; end if;
 select id into rid from public.roles where company_id=p_company_id and name='Administrador' and is_system=true limit 1;
 if rid is null then return; end if;
 insert into public.role_permissions(role_id,permission_id)
 select rid,p.id from public.permissions p
 on conflict do nothing;
end;$$;
revoke all on function public.sync_system_admin_permissions(uuid) from public;
grant execute on function public.sync_system_admin_permissions(uuid) to authenticated;

-- ========================================================
-- MIGRACION: 042_notification_rls.sql
-- ========================================================
alter table public.notifications enable row level security;
drop policy if exists "notifications tenant read" on public.notifications;
create policy "notifications tenant read" on public.notifications
for select using(
  public.is_company_member(company_id)
  and (user_id is null or user_id=auth.uid())
);
drop policy if exists "notifications own update" on public.notifications;
create policy "notifications own update" on public.notifications
for update using(
  public.is_company_member(company_id)
  and (user_id is null or user_id=auth.uid())
) with check(
  public.is_company_member(company_id)
  and (user_id is null or user_id=auth.uid())
);

-- ========================================================
-- MIGRACION: 043_company_modules_read_rls.sql
-- ========================================================
alter table public.company_modules enable row level security;
drop policy if exists "company modules tenant read" on public.company_modules;
create policy "company modules tenant read" on public.company_modules
for select using(public.is_company_member(company_id));

-- ========================================================
-- MIGRACION: 044_membership_role_integrity.sql
-- ========================================================
-- Prevent cross-tenant role assignment at database level.
create or replace function public.assert_membership_role_same_company()
returns trigger language plpgsql set search_path=public as $$
declare membership_company uuid; role_company uuid;
begin
 select company_id into membership_company from public.company_memberships where id=new.membership_id;
 select company_id into role_company from public.roles where id=new.role_id;
 if membership_company is null or role_company is null or membership_company<>role_company then
   raise exception 'CROSS_TENANT_ROLE_ASSIGNMENT';
 end if;
 return new;
end;$$;

drop trigger if exists trg_membership_role_same_company on public.membership_roles;
create trigger trg_membership_role_same_company
before insert or update on public.membership_roles
for each row execute function public.assert_membership_role_same_company();

-- ========================================================
-- MIGRACION: 045_role_permission_integrity.sql
-- ========================================================
-- role_permissions is global permission catalog + tenant role.
-- Ensure referenced permission exists and role is valid; FK remains primary guard.
create index if not exists idx_role_permissions_role on public.role_permissions(role_id);
create index if not exists idx_role_permissions_permission on public.role_permissions(permission_id);
create index if not exists idx_roles_company_system on public.roles(company_id,is_system);

-- ========================================================
-- MIGRACION: 046_membership_status_rls.sql
-- ========================================================
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

-- ========================================================
-- MIGRACION: 047_membership_uniqueness.sql
-- ========================================================
-- One logical membership per user/company.
create unique index if not exists uq_company_memberships_company_user
on public.company_memberships(company_id,user_id);

-- Avoid duplicate role bindings.
create unique index if not exists uq_membership_roles_pair
on public.membership_roles(membership_id,role_id);

-- Avoid duplicate role permissions.
create unique index if not exists uq_role_permissions_pair
on public.role_permissions(role_id,permission_id);

-- ========================================================
-- MIGRACION: 048_branch_code_uniqueness.sql
-- ========================================================
-- Branch code must be unique inside a tenant, not globally.
create unique index if not exists uq_branches_company_code
on public.branches(company_id,upper(code))
where is_active=true;

-- ========================================================
-- MIGRACION: 049_role_name_uniqueness.sql
-- ========================================================
-- Prevent duplicate active role names within the same tenant.
create unique index if not exists uq_roles_company_name
on public.roles(company_id,lower(name));


-- ========================================================
-- SUPER ADMIN PROCESA CLOUD (UID VINCULADO)
-- ========================================================
insert into public.platform_admins (user_id, is_active)
values ('07f8098f-bf6d-408f-abaa-8305714cea6b'::uuid, true)
on conflict (user_id) do update set is_active = true;
