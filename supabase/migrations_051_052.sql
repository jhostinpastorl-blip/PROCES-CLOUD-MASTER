-- ===================================================================
-- PROCESA CLOUD - ETAPA 5 FORWARD MIGRATIONS (051 & 052)
-- ===================================================================

-- Migration 051: Last Admin Protection & Role Assignment
create or replace function public.assert_not_last_admin(p_company_id uuid, p_target_user_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare
  admin_count int;
  is_target_admin boolean;
begin
  select exists (
    select 1
    from public.company_memberships cm
    join public.membership_roles mr on mr.membership_id = cm.id
    join public.roles r on r.id = mr.role_id
    where cm.company_id = p_company_id
      and cm.user_id = p_target_user_id
      and cm.status = 'active'
      and r.name = 'Administrador'
  ) into is_target_admin;

  if is_target_admin then
    select count(distinct cm.user_id)
    into admin_count
    from public.company_memberships cm
    join public.membership_roles mr on mr.membership_id = cm.id
    join public.roles r on r.id = mr.role_id
    where cm.company_id = p_company_id
      and cm.status = 'active'
      and r.name = 'Administrador';

    if admin_count <= 1 then
      raise exception 'CANNOT_REMOVE_LAST_ADMIN';
    end if;
  end if;
end;$$;
revoke all on function public.assert_not_last_admin(uuid, uuid) from public;
grant execute on function public.assert_not_last_admin(uuid, uuid) to authenticated;

create or replace function public.suspend_company_member(p_company_id uuid, p_membership_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare
  target_user uuid;
begin
  if not public.has_permission(p_company_id, 'users.invite') then raise exception 'forbidden'; end if;
  select user_id into target_user from public.company_memberships where id = p_membership_id and company_id = p_company_id;
  if target_user is null then raise exception 'membership not found'; end if;
  if target_user = auth.uid() then raise exception 'cannot suspend self'; end if;
  perform public.assert_not_last_admin(p_company_id, target_user);
  update public.company_memberships set status = 'suspended'
  where id = p_membership_id and company_id = p_company_id;
end;$$;

create or replace function public.remove_company_member(p_company_id uuid, p_membership_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare
  target_user uuid;
begin
  if not public.has_permission(p_company_id, 'users.invite') then raise exception 'forbidden'; end if;
  select user_id into target_user from public.company_memberships where id = p_membership_id and company_id = p_company_id;
  if target_user is null then raise exception 'membership not found'; end if;
  if target_user = auth.uid() then raise exception 'cannot remove self'; end if;
  perform public.assert_not_last_admin(p_company_id, target_user);
  update public.company_memberships set status = 'removed'
  where id = p_membership_id and company_id = p_company_id;
end;$$;

create or replace function public.assign_role_to_member(p_company_id uuid, p_membership_id uuid, p_role_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare
  role_comp uuid;
  member_comp uuid;
begin
  if not public.has_permission(p_company_id, 'roles.manage') then raise exception 'forbidden'; end if;
  select company_id into role_comp from public.roles where id = p_role_id;
  select company_id into member_comp from public.company_memberships where id = p_membership_id;
  if role_comp is null or member_comp is null or role_comp <> p_company_id or member_comp <> p_company_id then
    raise exception 'ROLE_CROSS_TENANT';
  end if;
  insert into public.membership_roles(membership_id, role_id)
  values (p_membership_id, p_role_id)
  on conflict do nothing;
end;$$;
revoke all on function public.assign_role_to_member(uuid, uuid, uuid) from public;
grant execute on function public.assign_role_to_member(uuid, uuid, uuid) to authenticated;

-- Migration 052: Enable catalog read policies for modules, plans, and permissions, plus user self profile management
alter table if exists public.modules enable row level security;
alter table if exists public.plans enable row level security;
alter table if exists public.permissions enable row level security;
alter table if exists public.profiles enable row level security;

drop policy if exists "modules catalog read" on public.modules;
create policy "modules catalog read" on public.modules for select using (true);

drop policy if exists "plans catalog read" on public.plans;
create policy "plans catalog read" on public.plans for select using (true);

drop policy if exists "permissions catalog read" on public.permissions;
create policy "permissions catalog read" on public.permissions for select using (true);

drop policy if exists "profiles own insert" on public.profiles;
create policy "profiles own insert" on public.profiles for insert with check (id = auth.uid());

drop policy if exists "profiles own update" on public.profiles;
create policy "profiles own update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
