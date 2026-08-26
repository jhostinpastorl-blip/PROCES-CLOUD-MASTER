-- ============================================================
-- PROCESA CLOUD · ETAPA 6 · BUNDLE: 053 + 054
-- Copiar y pegar completo en SQL Editor de Supabase
-- ============================================================

-- ========== MIGRATION 053 ==========
-- Migration 053: SaaS Control Plane & Core Completion
-- Problema: Falta estado 'suspended', resolución central de operabilidad, conteo de invitaciones en max_users, enforcement de entitlements de módulos en BD, protección del último platform admin y helpers de notificación.
-- Solución: Extender constraint de suscripciones, añadir can_company_operate, trigger check_company_module_entitlement, trigger protect_last_platform_admin, create_core_notification y políticas RLS de plataforma.
-- Riesgo: Mínimo. Operaciones de lectura y miembros existentes no se ven afectados.
-- Validación: Verificado con suites dinámicas PLAN-*, SUB-*, ENTITLEMENT-*, PLATFORM-*, NOTIFICATION-*.

-- 1. Ampliación de estados de suscripción
alter table public.subscriptions drop constraint if exists subscriptions_status_ck;
alter table public.subscriptions add constraint subscriptions_status_ck check(status in ('trial','active','past_due','suspended','cancelled','expired'));

-- 2. Resolución central de operabilidad de empresa
create or replace function public.can_company_operate(p_company_id uuid)
returns boolean language plpgsql stable security definer set search_path=public as $$
declare
  sub_record record;
begin
  select s.status, s.ends_at into sub_record
  from public.subscriptions s
  where s.company_id = p_company_id
  order by s.created_at desc limit 1;

  if sub_record is null then
    return false;
  end if;

  if sub_record.status = 'active' then
    return true;
  end if;

  if sub_record.status = 'trial' then
    if sub_record.ends_at is null or sub_record.ends_at >= now() then
      return true;
    else
      return false; -- Trial expirado
    end if;
  end if;

  return false; -- suspended, past_due, cancelled, expired
end;$$;

revoke all on function public.can_company_operate(uuid) from public;
grant execute on function public.can_company_operate(uuid) to authenticated;

create or replace function public.assert_company_can_operate(p_company_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.can_company_operate(p_company_id) then
    raise exception 'SUBSCRIPTION_RESTRICTED';
  end if;
end;$$;

revoke all on function public.assert_company_can_operate(uuid) from public;
grant execute on function public.assert_company_can_operate(uuid) to authenticated;

-- 3. Refuerzo de límite de usuarios considerando miembros activos e invitaciones pendientes
create or replace function public.assert_company_user_capacity(p_company_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare
  maxu int;
  current_active int;
  pending_invites int;
begin
  perform public.assert_company_can_operate(p_company_id);

  select p.max_users into maxu
  from public.subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.company_id = p_company_id
  order by s.created_at desc limit 1;

  if maxu is null then
    return; -- Ilimitado
  end if;

  select count(*) into current_active
  from public.company_memberships
  where company_id = p_company_id and status = 'active';

  select count(*) into pending_invites
  from public.company_invitations
  where company_id = p_company_id and status = 'pending' and expires_at > now();

  if (current_active + pending_invites) >= maxu then
    raise exception 'PLAN_USER_LIMIT';
  end if;
end;$$;

revoke all on function public.assert_company_user_capacity(uuid) from public;
grant execute on function public.assert_company_user_capacity(uuid) to authenticated;

-- 4. Refuerzo de límite de sucursales con operabilidad
create or replace function public.assert_company_branch_capacity(p_company_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare
  maxb int;
  currentb int;
begin
  perform public.assert_company_can_operate(p_company_id);

  select p.max_branches into maxb
  from public.subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.company_id = p_company_id
  order by s.created_at desc limit 1;

  if maxb is null then
    return; -- Ilimitado
  end if;

  select count(*) into currentb
  from public.branches
  where company_id = p_company_id and is_active = true and deleted_at is null;

  if currentb >= maxb then
    raise exception 'PLAN_BRANCH_LIMIT';
  end if;
end;$$;

revoke all on function public.assert_company_branch_capacity(uuid) from public;
grant execute on function public.assert_company_branch_capacity(uuid) to authenticated;

-- 5. Trigger para forzar entitlements de módulos a nivel de base de datos
create or replace function public.check_company_module_entitlement()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  mod_code text;
  allowed text[];
  is_admin boolean;
begin
  if new.enabled = false then
    return new;
  end if;

  select code into mod_code from public.modules where id = new.module_id;
  if mod_code is null then
    raise exception 'MODULE_NOT_FOUND';
  end if;

  if mod_code = 'core' then
    return new;
  end if;

  select exists(select 1 from public.platform_admins where user_id = auth.uid() and is_active = true) into is_admin;
  if is_admin then
    return new;
  end if;

  select p.module_codes into allowed
  from public.subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.company_id = new.company_id and s.status in ('trial','active')
  order by s.created_at desc limit 1;

  if allowed is null or not (mod_code = any(allowed)) then
    raise exception 'MODULE_NOT_ENTITLED';
  end if;

  return new;
end;$$;

drop trigger if exists trg_check_company_module_entitlement on public.company_modules;
create trigger trg_check_company_module_entitlement
before insert or update on public.company_modules
for each row execute function public.check_company_module_entitlement();

-- 6. Protección del último Platform Admin
create or replace function public.protect_last_platform_admin()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  active_count int;
begin
  if (TG_OP = 'DELETE') or (TG_OP = 'UPDATE' and new.is_active = false and old.is_active = true) then
    select count(*) into active_count from public.platform_admins where is_active = true and user_id <> old.user_id;
    if active_count < 1 then
      raise exception 'LAST_PLATFORM_ADMIN_PROTECTED';
    end if;
  end if;
  return coalesce(new, old);
end;$$;

drop trigger if exists trg_protect_last_platform_admin on public.platform_admins;
create trigger trg_protect_last_platform_admin
before update or delete on public.platform_admins
for each row execute function public.protect_last_platform_admin();

-- 7. Helper de creación de notificaciones Core
create or replace function public.create_core_notification(
  p_company_id uuid,
  p_user_id uuid,
  p_title text,
  p_body text,
  p_type text default 'info'
) returns uuid language plpgsql security definer set search_path=public as $$
declare
  nid uuid;
begin
  insert into public.notifications(company_id, user_id, title, body, type)
  values(p_company_id, p_user_id, p_title, p_body, coalesce(p_type, 'info'))
  returning id into nid;
  return nid;
end;$$;

revoke all on function public.create_core_notification(uuid, uuid, text, text, text) from public;
grant execute on function public.create_core_notification(uuid, uuid, text, text, text) to authenticated;

-- 8. Helper para marcar todas las notificaciones como leídas
create or replace function public.mark_all_notifications_read(p_company_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_company_member(p_company_id) then
    raise exception 'forbidden';
  end if;
  update public.notifications
  set read_at = now()
  where company_id = p_company_id
    and (user_id is null or user_id = auth.uid())
    and read_at is null;
end;$$;

revoke all on function public.mark_all_notifications_read(uuid) from public;
grant execute on function public.mark_all_notifications_read(uuid) to authenticated;

-- 9. Políticas RLS para Control Plane (Platform Admins)
drop policy if exists "platform admins subscriptions read" on public.subscriptions;
create policy "platform admins subscriptions read" on public.subscriptions
for select using (public.is_platform_admin());

drop policy if exists "platform admins subscriptions update" on public.subscriptions;
create policy "platform admins subscriptions update" on public.subscriptions
for update using (public.is_platform_admin()) with check (public.is_platform_admin());

drop policy if exists "platform admins plans update" on public.plans;
create policy "platform admins plans update" on public.plans
for update using (public.is_platform_admin()) with check (public.is_platform_admin());

drop policy if exists "platform admins companies read" on public.companies;
create policy "platform admins companies read" on public.companies
for select using (public.is_platform_admin());

drop policy if exists "platform admins companies update" on public.companies;
create policy "platform admins companies update" on public.companies
for update using (public.is_platform_admin()) with check (public.is_platform_admin());


-- ========== MIGRATION 054 ==========
-- ===================================================================
-- PROCESA CLOUD · ETAPA 6 · MIGRATION 054
-- Complemento: sort_order, link, get_company_plan, mark_notification_read
-- Depende de: 053_saas_control_plane.sql (ya aplicada o por aplicar)
-- Riesgo: bajo — solo ADD COLUMN y CREATE FUNCTION
-- ===================================================================

-- 1. Plans: sort_order column
alter table public.plans add column if not exists sort_order int;
update public.plans set sort_order = case code
  when 'free'       then 1
  when 'lite'       then 2
  when 'pro'        then 3
  when 'business'   then 4
  when 'enterprise' then 5
  else 99 end
where sort_order is null;

-- 2. Notifications: link column
alter table public.notifications add column if not exists link text;

-- 3. get_company_plan — unified resolver for subscription + plan data
create or replace function public.get_company_plan(p_company_id uuid)
returns table (
  subscription_id   uuid,
  status            text,
  plan_code         text,
  plan_name         text,
  max_users         int,
  max_branches      int,
  module_codes      text[],
  starts_at         timestamptz,
  ends_at           timestamptz,
  is_operative      boolean
)
language sql stable security definer set search_path = public as $$
  select
    s.id              as subscription_id,
    s.status::text     as status,
    p.code            as plan_code,
    p.name            as plan_name,
    p.max_users       as max_users,
    p.max_branches    as max_branches,
    p.module_codes    as module_codes,
    s.starts_at       as starts_at,
    s.ends_at         as ends_at,
    (s.status in ('trial','active'))::boolean as is_operative
  from public.subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.company_id = p_company_id
  order by s.created_at desc
  limit 1;
$$;
revoke all on function public.get_company_plan(uuid) from public;
grant execute on function public.get_company_plan(uuid) to authenticated;

-- 4. mark_notification_read — mark a single notification read
create or replace function public.mark_notification_read(p_notification_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  notif_user uuid;
  notif_comp uuid;
begin
  select user_id, company_id into notif_user, notif_comp
  from public.notifications where id = p_notification_id;

  if notif_user is not null and notif_user <> auth.uid() then
    raise exception 'forbidden';
  end if;
  if notif_comp is not null and not public.is_company_member(notif_comp) then
    raise exception 'forbidden';
  end if;

  update public.notifications set read_at = now()
  where id = p_notification_id and read_at is null;
end;$$;
revoke all on function public.mark_notification_read(uuid) from public;
grant execute on function public.mark_notification_read(uuid) to authenticated;

-- 5. check_module_entitlement — callable RPC version (complements the trigger)
create or replace function public.check_module_entitlement(p_company_id uuid, p_module_code text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  allowed_codes text[];
begin
  if p_module_code = 'core' then return; end if;

  select p.module_codes into allowed_codes
  from public.subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.company_id = p_company_id
    and s.status in ('trial','active')
  order by s.created_at desc limit 1;

  if allowed_codes is null or not (p_module_code = any(allowed_codes)) then
    raise exception 'MODULE_NOT_ENTITLED';
  end if;
end;$$;
revoke all on function public.check_module_entitlement(uuid, text) from public;
grant execute on function public.check_module_entitlement(uuid, text) to authenticated;

-- 6. Index for unread notification count performance
create index if not exists idx_notifications_user_unread
  on public.notifications(user_id, company_id)
  where read_at is null;
