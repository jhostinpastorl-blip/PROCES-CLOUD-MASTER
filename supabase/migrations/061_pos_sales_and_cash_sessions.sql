-- ===================================================================
-- PROCESA CLOUD · FASE 1B · MIGRATION 061
-- POS Sales & Cash Sessions Schema (RLS, Constraints & Indexes)
-- ===================================================================

-- 1. Permitir 'SALE_OUT' en inventory_movements
alter table public.inventory_movements drop constraint if exists inventory_movements_movement_type_check;
alter table public.inventory_movements add constraint inventory_movements_movement_type_check
  check (movement_type in ('INITIAL_STOCK', 'IN_ADJUSTMENT', 'OUT_ADJUSTMENT', 'TRANSFER_IN', 'TRANSFER_OUT', 'SALE_OUT'));

-- 2. Tablas de Turnos y Movimientos de Caja
create table if not exists public.cash_sessions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  cash_register_id uuid not null references public.cash_registers(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'open' check (status in ('open', 'closed')),
  opening_amount numeric(12,2) not null default 0.00 check (opening_amount >= 0),
  expected_cash numeric(12,2) not null default 0.00 check (expected_cash >= 0),
  declared_cash numeric(12,2) check (declared_cash is null or declared_cash >= 0),
  difference numeric(12,2),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create unique index if not exists cash_sessions_active_uq
  on public.cash_sessions (company_id, cash_register_id)
  where status = 'open';

create index if not exists cash_sessions_company_branch_idx
  on public.cash_sessions (company_id, branch_id, opened_at desc);

alter table public.cash_sessions enable row level security;

drop policy if exists "cash_sessions_select" on public.cash_sessions;
create policy "cash_sessions_select" on public.cash_sessions
  for select using (public.is_company_member(company_id));

drop policy if exists "cash_sessions_insert" on public.cash_sessions;
create policy "cash_sessions_insert" on public.cash_sessions
  for insert with check (public.is_company_member(company_id));

drop policy if exists "cash_sessions_update" on public.cash_sessions;
create policy "cash_sessions_update" on public.cash_sessions
  for update using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));

-- Movimientos de caja
create table if not exists public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  cash_session_id uuid not null references public.cash_sessions(id) on delete cascade,
  movement_type text not null check (movement_type in ('OPENING', 'SALE', 'INCOME', 'EXPENSE', 'CLOSING')),
  amount numeric(12,2) not null check (amount >= 0),
  payment_method text not null default 'cash' check (payment_method in ('cash', 'card', 'transfer', 'digital')),
  reference_id uuid,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists cash_movements_session_idx
  on public.cash_movements (cash_session_id, created_at asc);

alter table public.cash_movements enable row level security;

drop policy if exists "cash_movements_select" on public.cash_movements;
create policy "cash_movements_select" on public.cash_movements
  for select using (public.is_company_member(company_id));

drop policy if exists "cash_movements_insert" on public.cash_movements;
create policy "cash_movements_insert" on public.cash_movements
  for insert with check (public.is_company_member(company_id));

-- 3. Secuencias correlativas por sucursal
create table if not exists public.branch_sequences (
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  document_type text not null default 'TICKET',
  prefix text not null default 'T001',
  current_number bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (company_id, branch_id, document_type)
);

alter table public.branch_sequences enable row level security;

drop policy if exists "branch_sequences_select" on public.branch_sequences;
create policy "branch_sequences_select" on public.branch_sequences
  for select using (public.is_company_member(company_id));

drop policy if exists "branch_sequences_all" on public.branch_sequences;
create policy "branch_sequences_all" on public.branch_sequences
  for all using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));

-- 4. Ventas (Sales Header)
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  warehouse_id uuid not null references public.warehouses(id) on delete restrict,
  cash_register_id uuid not null references public.cash_registers(id) on delete restrict,
  cash_session_id uuid not null references public.cash_sessions(id) on delete restrict,
  customer_id uuid references public.customers(id) on delete set null,
  document_type text not null default 'TICKET',
  document_number text not null,
  status text not null default 'completed' check (status in ('completed', 'voided')),
  currency text not null default 'PEN',
  subtotal numeric(12,2) not null check (subtotal >= 0),
  discount_total numeric(12,2) not null default 0.00 check (discount_total >= 0),
  tax_total numeric(12,2) not null default 0.00 check (tax_total >= 0),
  total numeric(12,2) not null check (total >= 0),
  paid_amount numeric(12,2) not null check (paid_amount >= total),
  change_amount numeric(12,2) not null default 0.00 check (change_amount >= 0),
  idempotency_key text,
  notes text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists sales_idempotency_uq
  on public.sales (company_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists sales_company_branch_created_idx
  on public.sales (company_id, branch_id, created_at desc);

create index if not exists sales_doc_number_idx
  on public.sales (company_id, document_number);

alter table public.sales enable row level security;

drop policy if exists "sales_select" on public.sales;
create policy "sales_select" on public.sales
  for select using (public.is_company_member(company_id));

drop policy if exists "sales_insert" on public.sales;
create policy "sales_insert" on public.sales
  for insert with check (public.is_company_member(company_id));

-- 5. Detalle de Venta (Sale Items Snapshot)
create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  name_snapshot text not null,
  sku_snapshot text,
  unit_snapshot text not null default 'NIU',
  quantity numeric(14,4) not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  unit_cost numeric(12,4) not null default 0.0000 check (unit_cost >= 0),
  discount numeric(12,2) not null default 0.00 check (discount >= 0),
  tax_type text not null default 'igv_18',
  tax_rate numeric(5,4) not null default 0.1800,
  tax_amount numeric(12,2) not null default 0.00 check (tax_amount >= 0),
  line_subtotal numeric(12,2) not null check (line_subtotal >= 0),
  line_total numeric(12,2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

create index if not exists sale_items_sale_idx on public.sale_items(sale_id);

alter table public.sale_items enable row level security;

drop policy if exists "sale_items_select" on public.sale_items;
create policy "sale_items_select" on public.sale_items
  for select using (
    exists (
      select 1 from public.sales s
      where s.id = sale_items.sale_id and public.is_company_member(s.company_id)
    )
  );

drop policy if exists "sale_items_insert" on public.sale_items;
create policy "sale_items_insert" on public.sale_items
  for insert with check (
    exists (
      select 1 from public.sales s
      where s.id = sale_items.sale_id and public.is_company_member(s.company_id)
    )
  );

-- 6. Pagos de Venta (Sale Payments)
create table if not exists public.sale_payments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  payment_method text not null check (payment_method in ('cash', 'card', 'transfer', 'digital')),
  amount numeric(12,2) not null check (amount > 0),
  received_amount numeric(12,2) not null check (received_amount >= amount),
  change_amount numeric(12,2) not null default 0.00 check (change_amount >= 0),
  reference text,
  created_at timestamptz not null default now()
);

create index if not exists sale_payments_sale_idx on public.sale_payments(sale_id);

alter table public.sale_payments enable row level security;

drop policy if exists "sale_payments_select" on public.sale_payments;
create policy "sale_payments_select" on public.sale_payments
  for select using (
    exists (
      select 1 from public.sales s
      where s.id = sale_payments.sale_id and public.is_company_member(s.company_id)
    )
  );

drop policy if exists "sale_payments_insert" on public.sale_payments;
create policy "sale_payments_insert" on public.sale_payments
  for insert with check (
    exists (
      select 1 from public.sales s
      where s.id = sale_payments.sale_id and public.is_company_member(s.company_id)
    )
  );

-- 7. Trigger de Inmutabilidad de Ventas Completadas
create or replace function public.trg_prevent_completed_sale_mutation()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'UPDATE' then
    if OLD.status = 'completed' and (
      NEW.total <> OLD.total or
      NEW.subtotal <> OLD.subtotal or
      NEW.tax_total <> OLD.tax_total or
      NEW.paid_amount <> OLD.paid_amount or
      NEW.company_id <> OLD.company_id or
      NEW.branch_id <> OLD.branch_id
    ) then
      raise exception 'CANNOT_MUTATE_COMPLETED_SALE';
    end if;
  elsif TG_OP = 'DELETE' then
    if OLD.status = 'completed' then
      raise exception 'CANNOT_DELETE_COMPLETED_SALE';
    end if;
  end if;
  return NEW;
end;$$;

drop trigger if exists sales_immutability_trg on public.sales;
create trigger sales_immutability_trg
  before update or delete on public.sales
  for each row execute function public.trg_prevent_completed_sale_mutation();
