-- ===================================================================
-- PROCESA CLOUD · FASE 1D · MIGRATION 065
-- Returns, Voids & Reversal Engine Schema (RLS, Constraints & Invariants)
-- ===================================================================

-- 1. Actualizar catálogo de movimientos y referencias en inventory_movements
alter table public.inventory_movements drop constraint if exists inventory_movements_movement_type_check;
alter table public.inventory_movements add constraint inventory_movements_movement_type_check
  check (movement_type in (
    'INITIAL_STOCK',
    'PURCHASE_IN',
    'SALE_OUT',
    'IN_ADJUSTMENT',
    'OUT_ADJUSTMENT',
    'TRANSFER_OUT',
    'TRANSFER_IN',
    'SALE_RETURN_IN',
    'PURCHASE_RETURN_OUT'
  ));

alter table public.inventory_movements drop constraint if exists inventory_movements_reference_type_check;
alter table public.inventory_movements add constraint inventory_movements_reference_type_check
  check (reference_type is null or reference_type in (
    'initial_stock',
    'sale',
    'purchase',
    'adjustment',
    'transfer',
    'sale_return',
    'purchase_return'
  ));

-- 2. Actualizar tipos de movimientos de caja para permitir reembolsos (SALE_REFUND)
alter table public.cash_movements drop constraint if exists cash_movements_movement_type_check;
alter table public.cash_movements add constraint cash_movements_movement_type_check
  check (movement_type in ('OPENING', 'SALE', 'INCOME', 'EXPENSE', 'CLOSING', 'SALE_REFUND'));

-- 3. Actualizar estados permitidos en ventas (sales)
alter table public.sales drop constraint if exists sales_status_check;
alter table public.sales add constraint sales_status_check
  check (status in ('completed', 'voided', 'partially_returned', 'fully_returned'));

-- 4. Entidad: Devoluciones y Anulaciones de Venta (sale_returns)
create table if not exists public.sale_returns (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  sale_id uuid not null references public.sales(id) on delete restrict,
  warehouse_id uuid not null references public.warehouses(id) on delete restrict,
  cash_session_id uuid references public.cash_sessions(id) on delete set null,
  document_number text not null,
  return_type text not null check (return_type in ('partial_return', 'full_return', 'void')),
  status text not null default 'completed' check (status in ('completed', 'cancelled')),
  reason text not null check (length(trim(reason)) > 0),
  refund_total numeric(12,2) not null default 0.00 check (refund_total >= 0),
  currency text not null default 'PEN',
  idempotency_key text,
  notes text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  completed_at timestamptz default now()
);

create unique index if not exists sale_returns_idempotency_uq
  on public.sale_returns (company_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists sale_returns_company_created_idx
  on public.sale_returns (company_id, created_at desc);

create index if not exists sale_returns_sale_idx
  on public.sale_returns (sale_id);

alter table public.sale_returns enable row level security;

drop policy if exists "sale_returns_select" on public.sale_returns;
create policy "sale_returns_select" on public.sale_returns
  for select using (public.is_company_member(company_id));

drop policy if exists "sale_returns_insert" on public.sale_returns;
create policy "sale_returns_insert" on public.sale_returns
  for insert with check (public.is_company_member(company_id));

-- Trigger de Inmutabilidad sobre sale_returns
create or replace function public.trg_prevent_completed_sale_return_mutation()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'UPDATE' then
    raise exception 'CANNOT_MUTATE_COMPLETED_SALE_RETURN';
  elsif TG_OP = 'DELETE' then
    raise exception 'CANNOT_DELETE_COMPLETED_SALE_RETURN';
  end if;
  return NEW;
end;$$;

drop trigger if exists sale_returns_immutability_trg on public.sale_returns;
create trigger sale_returns_immutability_trg
  before update or delete on public.sale_returns
  for each row execute function public.trg_prevent_completed_sale_return_mutation();

-- 4. Detalle de Devolución de Venta (sale_return_items)
create table if not exists public.sale_return_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  sale_return_id uuid not null references public.sale_returns(id) on delete cascade,
  sale_item_id uuid not null references public.sale_items(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  name_snapshot text not null,
  quantity numeric(14,4) not null check (quantity > 0),
  unit_price_snapshot numeric(12,4) not null check (unit_price_snapshot >= 0),
  unit_cost_snapshot numeric(12,4) not null default 0.0000 check (unit_cost_snapshot >= 0),
  tax_type text not null default 'igv_18',
  tax_rate numeric(5,4) not null default 0.1800,
  tax_amount numeric(12,2) not null default 0.00 check (tax_amount >= 0),
  line_refund_total numeric(12,2) not null check (line_refund_total >= 0),
  created_at timestamptz not null default now()
);

create index if not exists sale_return_items_return_idx on public.sale_return_items(sale_return_id);
create index if not exists sale_return_items_sale_item_idx on public.sale_return_items(sale_item_id);

alter table public.sale_return_items enable row level security;

drop policy if exists "sale_return_items_select" on public.sale_return_items;
create policy "sale_return_items_select" on public.sale_return_items
  for select using (public.is_company_member(company_id));

drop policy if exists "sale_return_items_insert" on public.sale_return_items;
create policy "sale_return_items_insert" on public.sale_return_items
  for insert with check (public.is_company_member(company_id));

-- Trigger de Inmutabilidad sobre sale_return_items
create or replace function public.trg_prevent_sale_return_item_mutation()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'UPDATE' then
    raise exception 'CANNOT_MUTATE_COMPLETED_SALE_RETURN_ITEM';
  elsif TG_OP = 'DELETE' then
    raise exception 'CANNOT_DELETE_COMPLETED_SALE_RETURN_ITEM';
  end if;
  return NEW;
end;$$;

drop trigger if exists sale_return_items_immutability_trg on public.sale_return_items;
create trigger sale_return_items_immutability_trg
  before update or delete on public.sale_return_items
  for each row execute function public.trg_prevent_sale_return_item_mutation();

-- 5. Reembolsos asociados a Devoluciones (sale_refunds)
create table if not exists public.sale_refunds (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  sale_return_id uuid not null references public.sale_returns(id) on delete cascade,
  cash_session_id uuid references public.cash_sessions(id) on delete set null,
  payment_method text not null check (payment_method in ('cash', 'card', 'transfer', 'digital')),
  amount numeric(12,2) not null check (amount > 0),
  status text not null default 'completed' check (status in ('completed', 'recorded', 'cancelled')),
  reference_notes text,
  created_at timestamptz not null default now()
);

create index if not exists sale_refunds_return_idx on public.sale_refunds(sale_return_id);

alter table public.sale_refunds enable row level security;

drop policy if exists "sale_refunds_select" on public.sale_refunds;
create policy "sale_refunds_select" on public.sale_refunds
  for select using (public.is_company_member(company_id));

drop policy if exists "sale_refunds_insert" on public.sale_refunds;
create policy "sale_refunds_insert" on public.sale_refunds
  for insert with check (public.is_company_member(company_id));

-- 6. Devoluciones a Proveedores (purchase_returns)
create table if not exists public.purchase_returns (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  purchase_id uuid not null references public.purchases(id) on delete restrict,
  warehouse_id uuid not null references public.warehouses(id) on delete restrict,
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  document_number text not null,
  status text not null default 'completed' check (status in ('completed', 'cancelled')),
  reason text not null check (length(trim(reason)) > 0),
  refund_expected numeric(12,2) not null default 0.00 check (refund_expected >= 0),
  currency text not null default 'PEN',
  idempotency_key text,
  notes text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  completed_at timestamptz default now()
);

create unique index if not exists purchase_returns_idempotency_uq
  on public.purchase_returns (company_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists purchase_returns_company_created_idx
  on public.purchase_returns (company_id, created_at desc);

create index if not exists purchase_returns_purchase_idx
  on public.purchase_returns (purchase_id);

alter table public.purchase_returns enable row level security;

drop policy if exists "purchase_returns_select" on public.purchase_returns;
create policy "purchase_returns_select" on public.purchase_returns
  for select using (public.is_company_member(company_id));

drop policy if exists "purchase_returns_insert" on public.purchase_returns;
create policy "purchase_returns_insert" on public.purchase_returns
  for insert with check (public.is_company_member(company_id));

-- Trigger de Inmutabilidad sobre purchase_returns
create or replace function public.trg_prevent_completed_purchase_return_mutation()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'UPDATE' then
    raise exception 'CANNOT_MUTATE_COMPLETED_PURCHASE_RETURN';
  elsif TG_OP = 'DELETE' then
    raise exception 'CANNOT_DELETE_COMPLETED_PURCHASE_RETURN';
  end if;
  return NEW;
end;$$;

drop trigger if exists purchase_returns_immutability_trg on public.purchase_returns;
create trigger purchase_returns_immutability_trg
  before update or delete on public.purchase_returns
  for each row execute function public.trg_prevent_completed_purchase_return_mutation();

-- 7. Detalle de Devolución a Proveedores (purchase_return_items)
create table if not exists public.purchase_return_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  purchase_return_id uuid not null references public.purchase_returns(id) on delete cascade,
  purchase_item_id uuid not null references public.purchase_items(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  name_snapshot text not null,
  quantity numeric(14,4) not null check (quantity > 0),
  unit_cost_snapshot numeric(12,4) not null check (unit_cost_snapshot >= 0),
  line_total numeric(12,2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

create index if not exists purchase_return_items_return_idx on public.purchase_return_items(purchase_return_id);
create index if not exists purchase_return_items_purchase_item_idx on public.purchase_return_items(purchase_item_id);

alter table public.purchase_return_items enable row level security;

drop policy if exists "purchase_return_items_select" on public.purchase_return_items;
create policy "purchase_return_items_select" on public.purchase_return_items
  for select using (public.is_company_member(company_id));

drop policy if exists "purchase_return_items_insert" on public.purchase_return_items;
create policy "purchase_return_items_insert" on public.purchase_return_items
  for insert with check (public.is_company_member(company_id));

-- Trigger de Inmutabilidad sobre purchase_return_items
create or replace function public.trg_prevent_purchase_return_item_mutation()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'UPDATE' then
    raise exception 'CANNOT_MUTATE_COMPLETED_PURCHASE_RETURN_ITEM';
  elsif TG_OP = 'DELETE' then
    raise exception 'CANNOT_DELETE_COMPLETED_PURCHASE_RETURN_ITEM';
  end if;
  return NEW;
end;$$;

drop trigger if exists purchase_return_items_immutability_trg on public.purchase_return_items;
create trigger purchase_return_items_immutability_trg
  before update or delete on public.purchase_return_items
  for each row execute function public.trg_prevent_purchase_return_item_mutation();
