-- ============================================================
-- PROCESA CLOUD · FASE 1A · BUNDLE: 055 + 060
-- RECONCILIACIÓN Y FORTALECIMIENTO DE INVENTARIO
-- Copiar y pegar completo en SQL Editor de Supabase
-- ============================================================

-- ========== supabase/migrations/055_fase1_ecosystem_operations.sql ==========
-- Migration 054: Fase 1 — Ecosystem Operations Foundation
-- Problema: Falta persistencia de estado de onboarding, jobs asíncronos persistentes con idempotencia, registro de emails/SMTP, feature flags, preferencias de notificaciones y preparación para billing/webhooks.
-- Solución: Crear tablas user_onboarding_states, system_jobs, sent_emails_log, feature_flags, notification_preferences, billing_customers, billing_webhook_events con RLS e índices.
-- Riesgo: Mínimo. No modifica tablas existentes; solo añade capacidades operativas del ecosistema.
-- Validación: Validado con suites dinámicas de onboarding, jobs, flags y billing.

-- 1. Estado de Onboarding
create table if not exists public.user_onboarding_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  current_step int not null default 1,
  status text not null default 'NOT_STARTED' check (status in ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED')),
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.user_onboarding_states enable row level security;

create policy "onboarding own read" on public.user_onboarding_states
for select using (user_id = auth.uid());

create policy "onboarding own insert" on public.user_onboarding_states
for insert with check (user_id = auth.uid());

create policy "onboarding own update" on public.user_onboarding_states
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create unique index if not exists onboarding_user_uq on public.user_onboarding_states(user_id);

-- 2. Async System Jobs
create table if not exists public.system_jobs (
  id uuid primary key default gen_random_uuid(),
  queue text not null default 'default',
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'PENDING' check (status in ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'RETRYABLE', 'DEAD')),
  attempts int not null default 0,
  max_attempts int not null default 5,
  next_run_at timestamptz not null default now(),
  last_error text,
  idempotency_key text,
  created_at timestamptz not null default now()
);

alter table public.system_jobs enable row level security;

create policy "platform admins read system jobs" on public.system_jobs
for select using (public.is_platform_admin());

create unique index if not exists system_jobs_idempotency_uq on public.system_jobs(idempotency_key) where idempotency_key is not null;
create index if not exists system_jobs_queue_status_idx on public.system_jobs(queue, status, next_run_at);

-- 3. Log de Emails Enviados
create table if not exists public.sent_emails_log (
  id uuid primary key default gen_random_uuid(),
  recipient text not null,
  template text not null,
  subject text not null,
  status text not null default 'SENT' check (status in ('SENT', 'FAILED', 'SIMULATED')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.sent_emails_log enable row level security;

create policy "platform admins read sent emails" on public.sent_emails_log
for select using (public.is_platform_admin());

create index if not exists sent_emails_recipient_idx on public.sent_emails_log(recipient, created_at desc);

-- 4. Feature Flags
create table if not exists public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  description text,
  scope text not null default 'GLOBAL' check (scope in ('GLOBAL', 'PLAN', 'COMPANY')),
  target_value text,
  is_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.feature_flags enable row level security;

create policy "feature flags read all" on public.feature_flags
for select using (true);

create policy "platform admins manage feature flags" on public.feature_flags
for all using (public.is_platform_admin()) with check (public.is_platform_admin());

-- Seed Initial Feature Flags
insert into public.feature_flags (key, description, scope, is_enabled) values
('new_dashboard', 'Dashboard empresarial interactivo v2', 'GLOBAL', true),
('beta_inventory', 'Módulo de inventario avanzado en beta', 'PLAN', false),
('beta_count', 'Integración experimental con PROCESA COUNT', 'COMPANY', false)
on conflict(key) do nothing;

-- 5. Preferencias de Notificaciones
create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  email_enabled boolean not null default true,
  security_alerts_enabled boolean not null default true,
  trial_alerts_enabled boolean not null default true,
  operational_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  unique(user_id, company_id)
);

alter table public.notification_preferences enable row level security;

create policy "preferences own read" on public.notification_preferences
for select using (user_id = auth.uid() and public.is_company_member(company_id));

create policy "preferences own write" on public.notification_preferences
for all using (user_id = auth.uid() and public.is_company_member(company_id))
with check (user_id = auth.uid() and public.is_company_member(company_id));

-- 6. Billing Readiness (Modelos de Preparación)
create table if not exists public.billing_customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade unique,
  provider text not null default 'manual',
  customer_ref text not null,
  created_at timestamptz not null default now()
);

alter table public.billing_customers enable row level security;

create policy "platform admins manage billing customers" on public.billing_customers
for all using (public.is_platform_admin()) with check (public.is_platform_admin());

create table if not exists public.billing_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'PENDING' check (status in ('PENDING', 'PROCESSED', 'FAILED')),
  idempotency_key text unique,
  created_at timestamptz not null default now()
);

alter table public.billing_webhook_events enable row level security;

create policy "platform admins read webhook events" on public.billing_webhook_events
for select using (public.is_platform_admin());


-- ========== supabase/migrations/060_guard_initial_stock_once.sql ==========
-- ===================================================================
-- PROCESA CLOUD · FASE 1A · MIGRATION 060
-- Guard Initial Stock Once (Strict Idempotency & Initial Balance Lock)
-- ===================================================================

-- 1. Permitir cantidad cero en inventory_movements para inicialización en cero (INVENTORY-08)
alter table public.inventory_movements drop constraint if exists inventory_movements_quantity_check;
alter table public.inventory_movements add constraint inventory_movements_quantity_check check (quantity >= 0);

-- 2. Fortalecer RPC set_initial_stock para permitir solo 1 inicialización por combinación (company, warehouse, product)
create or replace function public.set_initial_stock(
  p_company_id uuid,
  p_warehouse_id uuid,
  p_product_id uuid,
  p_quantity numeric,
  p_unit_cost numeric default 0.0000,
  p_notes text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  prod_company uuid;
  prod_allows_inv boolean;
  wh_company uuid;
begin
  if not public.is_company_member(p_company_id) then
    raise exception 'forbidden';
  end if;

  if p_quantity < 0 then
    raise exception 'INVALID_QUANTITY';
  end if;

  -- Validar producto pertenece a la empresa y permite inventario
  select company_id, allows_inventory into prod_company, prod_allows_inv
  from public.products
  where id = p_product_id and deleted_at is null;

  if prod_company is null or prod_company <> p_company_id then
    raise exception 'PRODUCT_NOT_FOUND';
  end if;

  if not prod_allows_inv then
    raise exception 'PRODUCT_DOES_NOT_ALLOW_INVENTORY';
  end if;

  -- Validar almacén pertenece a la empresa
  select company_id into wh_company
  from public.warehouses
  where id = p_warehouse_id and deleted_at is null;

  if wh_company is null or wh_company <> p_company_id then
    raise exception 'WAREHOUSE_NOT_FOUND';
  end if;

  -- Protección de idempotencia y concurrencia:
  -- Rechazar si ya existe un balance previo o si ya se ejecutó INITIAL_STOCK para esta combinación
  if exists (
    select 1 from public.inventory_balances
    where company_id = p_company_id and warehouse_id = p_warehouse_id and product_id = p_product_id
  ) or exists (
    select 1 from public.inventory_movements
    where company_id = p_company_id and warehouse_id = p_warehouse_id and product_id = p_product_id
      and movement_type = 'INITIAL_STOCK'
  ) then
    raise exception 'INITIAL_STOCK_ALREADY_EXISTS';
  end if;

  -- Insertar balance inicial
  insert into public.inventory_balances (company_id, warehouse_id, product_id, quantity, updated_at)
  values (p_company_id, p_warehouse_id, p_product_id, p_quantity, now());

  -- Registrar movimiento inicial auditable
  insert into public.inventory_movements (
    company_id,
    warehouse_id,
    product_id,
    movement_type,
    quantity,
    unit_cost,
    notes,
    created_by
  ) values (
    p_company_id,
    p_warehouse_id,
    p_product_id,
    'INITIAL_STOCK',
    p_quantity,
    coalesce(p_unit_cost, 0),
    coalesce(p_notes, 'Stock inicial'),
    auth.uid()
  );
end;$$;

revoke all on function public.set_initial_stock(uuid, uuid, uuid, numeric, numeric, text) from public;
grant execute on function public.set_initial_stock(uuid, uuid, uuid, numeric, numeric, text) to authenticated;

