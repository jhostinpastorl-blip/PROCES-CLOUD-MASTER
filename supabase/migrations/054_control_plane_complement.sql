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
