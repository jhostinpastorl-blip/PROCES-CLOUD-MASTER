-- ============================================================
-- PROCESA CLOUD · FASE 1B · BUNDLE: 061 + 062
-- POS SALES, CASH SESSIONS & TRANSACTIONAL RPCs
-- Copiar y pegar completo en SQL Editor de Supabase
-- ============================================================

-- ========== supabase/migrations/061_pos_sales_and_cash_sessions.sql ==========
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


-- ========== supabase/migrations/062_pos_sales_rpc_and_permissions.sql ==========
-- ===================================================================
-- PROCESA CLOUD · FASE 1B · MIGRATION 062
-- POS Sales Transactional RPCs, Cash Flow & Permission Seed
-- ===================================================================

-- 1. Permisos POS FASE 1B
insert into public.permissions (code, description) values
  ('pos.sales.read', 'Permite consultar el historial y detalle de ventas'),
  ('pos.sales.create', 'Permite emitir y cobrar ventas en el punto de venta'),
  ('pos.cash_sessions.open', 'Permite realizar la apertura de turnos de caja'),
  ('pos.cash_sessions.close', 'Permite realizar el cierre y arqueo de turnos de caja')
on conflict (code) do nothing;

-- Asignar nuevos permisos al rol Administrador del sistema
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.is_system = true and r.name = 'Administrador'
  and p.code in ('pos.sales.read', 'pos.sales.create', 'pos.cash_sessions.open', 'pos.cash_sessions.close')
on conflict do nothing;

-- 2. Limpiar sobrecargas previas de funciones
drop function if exists public.open_cash_session(uuid, uuid, uuid, numeric, text);
drop function if exists public.close_cash_session(uuid, uuid, numeric, text);
drop function if exists public.create_pos_sale(uuid, uuid, uuid, uuid, uuid, jsonb, jsonb, text, text);
drop function if exists public.create_pos_sale(uuid, uuid, uuid, uuid, jsonb, jsonb, uuid, text, text);

-- 3. RPC: Apertura de Turno de Caja (open_cash_session)
create or replace function public.open_cash_session(
  p_company_id uuid,
  p_branch_id uuid,
  p_cash_register_id uuid,
  p_opening_amount numeric default 0.00,
  p_notes text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_session_id uuid;
  v_reg_branch uuid;
  v_reg_active boolean;
begin
  -- 1. Validar membresía
  if not public.is_company_member(p_company_id) then
    raise exception 'forbidden';
  end if;

  if p_opening_amount < 0 then
    raise exception 'INVALID_OPENING_AMOUNT';
  end if;

  -- 2. Validar que la caja pertenezca a la empresa y sucursal
  select branch_id, is_active into v_reg_branch, v_reg_active
  from public.cash_registers
  where id = p_cash_register_id and company_id = p_company_id and deleted_at is null;

  if v_reg_branch is null or v_reg_branch <> p_branch_id then
    raise exception 'CASH_REGISTER_NOT_FOUND';
  end if;

  if not v_reg_active then
    raise exception 'CASH_REGISTER_INACTIVE';
  end if;

  -- 3. Validar que no haya otra sesión abierta en la misma caja
  if exists (
    select 1 from public.cash_sessions
    where company_id = p_company_id and cash_register_id = p_cash_register_id and status = 'open'
  ) then
    raise exception 'CASH_REGISTER_ALREADY_OPEN';
  end if;

  -- 4. Crear sesión
  insert into public.cash_sessions (
    company_id,
    branch_id,
    cash_register_id,
    user_id,
    status,
    opening_amount,
    expected_cash,
    opened_at,
    notes
  ) values (
    p_company_id,
    p_branch_id,
    p_cash_register_id,
    auth.uid(),
    'open',
    p_opening_amount,
    p_opening_amount,
    now(),
    p_notes
  ) returning id into v_session_id;

  -- 5. Registrar movimiento de apertura
  insert into public.cash_movements (
    company_id,
    cash_session_id,
    movement_type,
    amount,
    payment_method,
    notes,
    created_by
  ) values (
    p_company_id,
    v_session_id,
    'OPENING',
    p_opening_amount,
    'cash',
    coalesce(p_notes, 'Apertura de caja'),
    auth.uid()
  );

  -- 6. Actualizar estado de la caja registradora
  update public.cash_registers
  set status = 'open', updated_at = now()
  where id = p_cash_register_id;

  -- 7. Auditar (actor_user_id, entity_type, metadata)
  insert into public.audit_logs (
    company_id, actor_user_id, action, entity_type, entity_id, metadata
  ) values (
    p_company_id, auth.uid(), 'cash_session.opened', 'cash_sessions', v_session_id,
    jsonb_build_object('cash_register_id', p_cash_register_id, 'opening_amount', p_opening_amount)
  );

  return v_session_id;
end;$$;

-- 4. RPC: Cierre de Turno de Caja (close_cash_session)
create or replace function public.close_cash_session(
  p_company_id uuid,
  p_session_id uuid,
  p_declared_cash numeric,
  p_notes text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_session record;
  v_diff numeric;
begin
  if not public.is_company_member(p_company_id) then
    raise exception 'forbidden';
  end if;

  if p_declared_cash is null or p_declared_cash < 0 then
    raise exception 'INVALID_DECLARED_CASH';
  end if;

  -- Obtener y bloquear sesión
  select * into v_session
  from public.cash_sessions
  where id = p_session_id and company_id = p_company_id
  for update;

  if v_session.id is null then
    raise exception 'CASH_SESSION_NOT_FOUND';
  end if;

  if v_session.status <> 'open' then
    raise exception 'CASH_SESSION_ALREADY_CLOSED';
  end if;

  v_diff := p_declared_cash - v_session.expected_cash;

  -- Actualizar sesión
  update public.cash_sessions
  set
    status = 'closed',
    declared_cash = p_declared_cash,
    difference = v_diff,
    closed_at = now(),
    notes = coalesce(p_notes, notes)
  where id = p_session_id;

  -- Registrar movimiento de cierre
  insert into public.cash_movements (
    company_id,
    cash_session_id,
    movement_type,
    amount,
    payment_method,
    notes,
    created_by
  ) values (
    p_company_id,
    p_session_id,
    'CLOSING',
    p_declared_cash,
    'cash',
    coalesce(p_notes, 'Cierre y arqueo de caja'),
    auth.uid()
  );

  -- Actualizar estado de la caja registradora
  update public.cash_registers
  set status = 'closed', updated_at = now()
  where id = v_session.cash_register_id;

  -- Auditar
  insert into public.audit_logs (
    company_id, actor_user_id, action, entity_type, entity_id, metadata
  ) values (
    p_company_id, auth.uid(), 'cash_session.closed', 'cash_sessions', p_session_id,
    jsonb_build_object(
      'expected_cash', v_session.expected_cash,
      'declared_cash', p_declared_cash,
      'difference', v_diff
    )
  );

  return jsonb_build_object(
    'id', p_session_id,
    'status', 'closed',
    'expected_cash', v_session.expected_cash,
    'declared_cash', p_declared_cash,
    'difference', v_diff
  );
end;$$;

-- 5. RPC TRANSACCIONAL ATÓMICO: create_pos_sale
create or replace function public.create_pos_sale(
  p_company_id uuid,
  p_branch_id uuid,
  p_warehouse_id uuid,
  p_cash_session_id uuid,
  p_items jsonb,
  p_payments jsonb,
  p_customer_id uuid default null,
  p_idempotency_key text default null,
  p_notes text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_sale_id uuid;
  v_session record;
  v_wh_company uuid;
  v_cust_company uuid;
  v_item jsonb;
  v_payment jsonb;
  v_prod record;
  v_balance record;
  
  v_subtotal numeric(12,2) := 0.00;
  v_discount_total numeric(12,2) := 0.00;
  v_tax_total numeric(12,2) := 0.00;
  v_total numeric(12,2) := 0.00;
  v_paid_total numeric(12,2) := 0.00;
  v_change_total numeric(12,2) := 0.00;
  
  v_line_qty numeric(14,4);
  v_line_disc numeric(12,2);
  v_line_subtotal numeric(12,2);
  v_line_tax numeric(12,2);
  v_line_total numeric(12,2);
  v_tax_rate numeric(5,4);
  
  v_doc_prefix text := 'T001';
  v_doc_seq bigint;
  v_doc_number text;
  
  v_cash_paid numeric(12,2) := 0.00;
  v_existing_sale record;
  
  -- Estructuras temporales para inserción en 2 pasos
  v_prepared_items jsonb := '[]'::jsonb;
begin
  -- 1. Validar Membresía y Permisos
  if not public.is_company_member(p_company_id) then
    raise exception 'forbidden';
  end if;

  -- 2. Idempotencia: si ya existe una venta con esta key para la empresa, retornarla
  if p_idempotency_key is not null and trim(p_idempotency_key) <> '' then
    select id, document_number, total, created_at into v_existing_sale
    from public.sales
    where company_id = p_company_id and idempotency_key = p_idempotency_key;

    if v_existing_sale.id is not null then
      return jsonb_build_object(
        'sale_id', v_existing_sale.id,
        'document_number', v_existing_sale.document_number,
        'total', v_existing_sale.total,
        'created_at', v_existing_sale.created_at,
        'idempotent_replay', true
      );
    end if;
  end if;

  -- 3. Validar Sesión de Caja (Debe estar OPEN, pertenecer a company y branch)
  select * into v_session
  from public.cash_sessions
  where id = p_cash_session_id and company_id = p_company_id and branch_id = p_branch_id
  for update;

  if v_session.id is null then
    raise exception 'CASH_SESSION_NOT_FOUND';
  end if;

  if v_session.status <> 'open' then
    raise exception 'CASH_SESSION_CLOSED';
  end if;

  -- 4. Validar Almacén (Debe pertenecer a la empresa)
  select company_id into v_wh_company
  from public.warehouses
  where id = p_warehouse_id and deleted_at is null;

  if v_wh_company is null or v_wh_company <> p_company_id then
    raise exception 'WAREHOUSE_NOT_FOUND';
  end if;

  -- 5. Validar Cliente si fue proporcionado
  if p_customer_id is not null then
    select company_id into v_cust_company
    from public.customers
    where id = p_customer_id and deleted_at is null;

    if v_cust_company is null or v_cust_company <> p_company_id then
      raise exception 'CUSTOMER_NOT_FOUND';
    end if;
  end if;

  -- 6. Validar que la lista de items no esté vacía
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_SALE_ITEMS';
  end if;

  -- Generar ID de venta
  v_sale_id := gen_random_uuid();

  -- 7. PRIMER PASO: Validar Productos, Cálculos y Bloqueo de Stock
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_line_qty := (v_item->>'quantity')::numeric;
    v_line_disc := coalesce((v_item->>'discount')::numeric, 0.00);

    if v_line_qty is null or v_line_qty <= 0 then
      raise exception 'INVALID_ITEM_QUANTITY';
    end if;

    if v_line_disc < 0 then
      raise exception 'INVALID_ITEM_DISCOUNT';
    end if;

    -- Obtener producto oficial desde base de datos
    select id, company_id, name, sku, unit, price, cost, tax_type, allows_inventory, is_active
    into v_prod
    from public.products
    where id = (v_item->>'product_id')::uuid and company_id = p_company_id and deleted_at is null;

    if v_prod.id is null then
      raise exception 'PRODUCT_NOT_FOUND';
    end if;

    if not v_prod.is_active then
      raise exception 'PRODUCT_INACTIVE: %', v_prod.name;
    end if;

    -- Tasa impositiva
    if v_prod.tax_type = 'igv_18' then
      v_tax_rate := 0.1800;
    else
      v_tax_rate := 0.0000;
    end if;

    -- Cálculos matemáticos exactos
    v_line_subtotal := round(v_prod.price * v_line_qty, 2) - v_line_disc;
    if v_line_subtotal < 0 then
      raise exception 'DISCOUNT_EXCEEDS_LINE_TOTAL';
    end if;

    v_line_tax := round(v_line_subtotal * (v_tax_rate / (1.0 + v_tax_rate)), 2);
    v_line_total := v_line_subtotal;

    v_subtotal := v_subtotal + (v_line_subtotal - v_line_tax);
    v_discount_total := v_discount_total + v_line_disc;
    v_tax_total := v_tax_total + v_line_tax;
    v_total := v_total + v_line_total;

    -- Control de Inventario y Concurrencia (Lock FOR UPDATE)
    if v_prod.allows_inventory then
      select id, quantity into v_balance
      from public.inventory_balances
      where company_id = p_company_id and warehouse_id = p_warehouse_id and product_id = v_prod.id
      for update;

      if v_balance.id is null or v_balance.quantity < v_line_qty then
        raise exception 'INSUFFICIENT_STOCK: % (Disponible: %, Solicitado: %)',
          v_prod.name, coalesce(v_balance.quantity, 0), v_line_qty;
      end if;
    end if;

    -- Guardar item procesado en lista temporal
    v_prepared_items := v_prepared_items || jsonb_build_object(
      'product_id', v_prod.id,
      'name_snapshot', v_prod.name,
      'sku_snapshot', v_prod.sku,
      'unit_snapshot', coalesce(v_prod.unit, 'NIU'),
      'quantity', v_line_qty,
      'unit_price', v_prod.price,
      'unit_cost', v_prod.cost,
      'discount', v_line_disc,
      'tax_type', v_prod.tax_type,
      'tax_rate', v_tax_rate,
      'tax_amount', v_line_tax,
      'line_subtotal', v_line_subtotal - v_line_tax,
      'line_total', v_line_total,
      'allows_inventory', v_prod.allows_inventory
    );
  end loop;

  -- 8. Validar Pagos
  if p_payments is null or jsonb_array_length(p_payments) = 0 then
    raise exception 'EMPTY_SALE_PAYMENTS';
  end if;

  for v_payment in select * from jsonb_array_elements(p_payments)
  loop
    declare
      v_p_amount numeric(12,2) := (v_payment->>'amount')::numeric;
      v_p_received numeric(12,2) := coalesce((v_payment->>'received_amount')::numeric, (v_payment->>'amount')::numeric);
      v_p_change numeric(12,2) := coalesce((v_payment->>'change_amount')::numeric, 0.00);
      v_p_method text := v_payment->>'payment_method';
    begin
      if v_p_amount is null or v_p_amount <= 0 then
        raise exception 'INVALID_PAYMENT_AMOUNT';
      end if;

      if v_p_received < v_p_amount then
        raise exception 'RECEIVED_AMOUNT_LESS_THAN_PAYMENT';
      end if;

      if v_p_method not in ('cash', 'card', 'transfer', 'digital') then
        raise exception 'INVALID_PAYMENT_METHOD: %', v_p_method;
      end if;

      v_paid_total := v_paid_total + v_p_amount;
      v_change_total := v_change_total + v_p_change;

      if v_p_method = 'cash' then
        v_cash_paid := v_cash_paid + v_p_amount;
      end if;
    end;
  end loop;

  -- Validar que el total pagado cubra el total calculado de la venta
  if v_paid_total < v_total then
    raise exception 'PAYMENT_MISMATCH: Pagado % es menor que Total %', v_paid_total, v_total;
  end if;

  -- 9. Generar Correlativo Atómico de Sucursal
  insert into public.branch_sequences (company_id, branch_id, document_type, prefix, current_number)
  values (p_company_id, p_branch_id, 'TICKET', 'T001', 1)
  on conflict (company_id, branch_id, document_type)
  do update set current_number = branch_sequences.current_number + 1, updated_at = now()
  returning prefix, current_number into v_doc_prefix, v_doc_seq;

  v_doc_number := v_doc_prefix || '-' || lpad(v_doc_seq::text, 8, '0');

  -- 10. INSERTAR ENCABEZADO DE VENTA PRIMERO (Garantiza integridad referencial)
  insert into public.sales (
    id,
    company_id,
    branch_id,
    warehouse_id,
    cash_register_id,
    cash_session_id,
    customer_id,
    document_type,
    document_number,
    status,
    currency,
    subtotal,
    discount_total,
    tax_total,
    total,
    paid_amount,
    change_amount,
    idempotency_key,
    notes,
    created_by
  ) values (
    v_sale_id,
    p_company_id,
    p_branch_id,
    p_warehouse_id,
    v_session.cash_register_id,
    p_cash_session_id,
    p_customer_id,
    'TICKET',
    v_doc_number,
    'completed',
    'PEN',
    v_subtotal,
    v_discount_total,
    v_tax_total,
    v_total,
    v_paid_total,
    v_change_total,
    p_idempotency_key,
    p_notes,
    auth.uid()
  );

  -- 11. INSERTAR ITEMS, ACTUALIZAR INVENTARIO Y REGISTRAR KARDEX
  for v_item in select * from jsonb_array_elements(v_prepared_items)
  loop
    insert into public.sale_items (
      sale_id,
      product_id,
      name_snapshot,
      sku_snapshot,
      unit_snapshot,
      quantity,
      unit_price,
      unit_cost,
      discount,
      tax_type,
      tax_rate,
      tax_amount,
      line_subtotal,
      line_total
    ) values (
      v_sale_id,
      (v_item->>'product_id')::uuid,
      v_item->>'name_snapshot',
      v_item->>'sku_snapshot',
      v_item->>'unit_snapshot',
      (v_item->>'quantity')::numeric,
      (v_item->>'unit_price')::numeric,
      (v_item->>'unit_cost')::numeric,
      (v_item->>'discount')::numeric,
      v_item->>'tax_type',
      (v_item->>'tax_rate')::numeric,
      (v_item->>'tax_amount')::numeric,
      (v_item->>'line_subtotal')::numeric,
      (v_item->>'line_total')::numeric
    );

    -- Descontar inventario si es producto físico
    if (v_item->>'allows_inventory')::boolean then
      update public.inventory_balances
      set quantity = quantity - (v_item->>'quantity')::numeric, updated_at = now()
      where company_id = p_company_id and warehouse_id = p_warehouse_id and product_id = (v_item->>'product_id')::uuid;

      -- Registrar movimiento de salida por venta (Kardex)
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
        (v_item->>'product_id')::uuid,
        'SALE_OUT',
        (v_item->>'quantity')::numeric,
        (v_item->>'unit_cost')::numeric,
        'Salida por venta POS ' || v_doc_number,
        auth.uid()
      );
    end if;
  end loop;

  -- 12. INSERTAR PAGOS
  for v_payment in select * from jsonb_array_elements(p_payments)
  loop
    insert into public.sale_payments (
      sale_id,
      payment_method,
      amount,
      received_amount,
      change_amount,
      reference
    ) values (
      v_sale_id,
      v_payment->>'payment_method',
      (v_payment->>'amount')::numeric,
      coalesce((v_payment->>'received_amount')::numeric, (v_payment->>'amount')::numeric),
      coalesce((v_payment->>'change_amount')::numeric, 0.00),
      v_payment->>'reference'
    );
  end loop;

  -- 13. SI HUBO EFECTIVO, REGISTRAR EN CAJA FÍSICA Y ACTUALIZAR EXPECTED_CASH
  if v_cash_paid > 0 then
    insert into public.cash_movements (
      company_id,
      cash_session_id,
      movement_type,
      amount,
      payment_method,
      reference_id,
      notes,
      created_by
    ) values (
      p_company_id,
      p_cash_session_id,
      'SALE',
      v_cash_paid,
      'cash',
      v_sale_id,
      'Venta POS ' || v_doc_number,
      auth.uid()
    );

    update public.cash_sessions
    set expected_cash = expected_cash + v_cash_paid
    where id = p_cash_session_id;
  end if;

  -- 14. AUDITAR
  insert into public.audit_logs (
    company_id, actor_user_id, action, entity_type, entity_id, metadata
  ) values (
    p_company_id, auth.uid(), 'sale.completed', 'sales', v_sale_id,
    jsonb_build_object(
      'document_number', v_doc_number,
      'total', v_total,
      'branch_id', p_branch_id,
      'cash_session_id', p_cash_session_id
    )
  );

  -- 15. RETORNAR PAYLOAD DE ÉXITO
  return jsonb_build_object(
    'sale_id', v_sale_id,
    'document_number', v_doc_number,
    'subtotal', v_subtotal,
    'discount_total', v_discount_total,
    'tax_total', v_tax_total,
    'total', v_total,
    'paid_amount', v_paid_total,
    'change_amount', v_change_total,
    'created_at', now()
  );
end;$$;

revoke all on function public.open_cash_session(uuid, uuid, uuid, numeric, text) from public;
grant execute on function public.open_cash_session(uuid, uuid, uuid, numeric, text) to authenticated;

revoke all on function public.close_cash_session(uuid, uuid, numeric, text) from public;
grant execute on function public.close_cash_session(uuid, uuid, numeric, text) to authenticated;

revoke all on function public.create_pos_sale(uuid, uuid, uuid, uuid, jsonb, jsonb, uuid, text, text) from public;
grant execute on function public.create_pos_sale(uuid, uuid, uuid, uuid, jsonb, jsonb, uuid, text, text) to authenticated;

