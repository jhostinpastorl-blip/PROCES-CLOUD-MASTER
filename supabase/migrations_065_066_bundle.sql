-- ============================================================
-- PROCESA CLOUD · FASE 1D · BUNDLE: 065 + 066
-- RETURNS, VOIDS & REVERSAL ENGINE RPCs & SCHEMA
-- Copiar y pegar completo en SQL Editor de Supabase
-- ============================================================

-- ========== supabase/migrations/065_pos_returns_and_voids_schema.sql ==========
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


-- ========== supabase/migrations/066_pos_returns_and_voids_rpcs.sql ==========
-- ===================================================================
-- PROCESA CLOUD · FASE 1D · MIGRATION 066
-- Returns, Voids & Reversal Engine RPCs & Permissions
-- ===================================================================

-- 1. Permisos FASE 1D
insert into public.permissions (code, description) values
  ('pos.sales.return', 'Permite registrar devoluciones parciales y totales de ventas'),
  ('pos.sales.void', 'Permite anular ventas completas'),
  ('pos.purchases.return', 'Permite registrar devoluciones de mercadería a proveedores')
on conflict (code) do nothing;

-- Asignar nuevos permisos al rol Administrador
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.is_system = true and r.name = 'Administrador'
  and p.code in (
    'pos.sales.return',
    'pos.sales.void',
    'pos.purchases.return'
  )
on conflict do nothing;

-- 2. Limpiar sobrecargas previas
drop function if exists public.create_sale_return(uuid, uuid, jsonb, text, jsonb, uuid, text, text, text);
drop function if exists public.void_sale(uuid, uuid, text, uuid, text, text);
drop function if exists public.create_purchase_return(uuid, uuid, jsonb, text, text, text);

-- 3. RPC TRANSACCIONAL: create_sale_return
create or replace function public.create_sale_return(
  p_company_id uuid,
  p_sale_id uuid,
  p_items jsonb,
  p_reason text,
  p_refunds jsonb default null,
  p_cash_session_id uuid default null,
  p_return_type text default 'partial_return',
  p_idempotency_key text default null,
  p_notes text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_sale record;
  v_return_id uuid;
  v_item jsonb;
  v_sale_item record;
  v_prod record;
  v_balance record;
  v_cash_session record;
  
  v_req_qty numeric(14,4);
  v_already_returned numeric(14,4);
  v_rem_qty numeric(14,4);
  v_line_refund numeric(12,2);
  v_total_refund numeric(12,2) := 0.00;
  
  v_hist_cost numeric(12,4);
  v_prod_cost numeric(12,4);
  v_current_stock numeric(14,4);
  v_new_avg_cost numeric(12,4);
  
  v_doc_prefix text := 'DEV';
  v_doc_seq bigint;
  v_doc_number text;
  
  v_existing_return record;
  v_prepared_items jsonb := '[]'::jsonb;
  v_refund_item jsonb;
  v_refund_amt numeric(12,2);
  v_refund_method text;
  v_total_refund_applied numeric(12,2) := 0.00;
  
  v_all_items_count int;
  v_fully_returned_count int;
begin
  -- 1. Validar membresía y parámetros básicos
  if not public.is_company_member(p_company_id) then
    raise exception 'forbidden';
  end if;

  if p_reason is null or trim(p_reason) = '' then
    raise exception 'RETURN_REASON_REQUIRED';
  end if;

  if p_return_type not in ('partial_return', 'full_return', 'void') then
    raise exception 'INVALID_RETURN_TYPE';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_RETURN_ITEMS';
  end if;

  -- 2. Idempotencia DB-Backed
  if p_idempotency_key is not null and trim(p_idempotency_key) <> '' then
    select id, document_number, refund_total, return_type, created_at into v_existing_return
    from public.sale_returns
    where company_id = p_company_id and idempotency_key = p_idempotency_key;

    if v_existing_return.id is not null then
      return jsonb_build_object(
        'return_id', v_existing_return.id,
        'document_number', v_existing_return.document_number,
        'refund_total', v_existing_return.refund_total,
        'return_type', v_existing_return.return_type,
        'created_at', v_existing_return.created_at,
        'idempotent_replay', true
      );
    end if;
  end if;

  -- 3. Validar venta original y bloquear estado de venta
  select * into v_sale
  from public.sales
  where id = p_sale_id and company_id = p_company_id
  for update;

  if v_sale.id is null then
    raise exception 'SALE_NOT_FOUND';
  end if;

  if v_sale.status in ('voided', 'fully_returned') and p_return_type <> 'void' then
    raise exception 'SALE_ALREADY_FULLY_REVERSED';
  end if;

  v_return_id := gen_random_uuid();

  -- 4. Validar y procesar cada ítem de devolución
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_req_qty := (v_item->>'quantity')::numeric;

    if v_req_qty is null or v_req_qty <= 0 then
      raise exception 'INVALID_RETURN_QUANTITY';
    end if;

    select * into v_sale_item
    from public.sale_items
    where id = (v_item->>'sale_item_id')::uuid and sale_id = p_sale_id
    for update;

    if v_sale_item.id is null then
      raise exception 'SALE_ITEM_NOT_FOUND';
    end if;

    -- Calcular cantidad ya devuelta acumulada
    select coalesce(sum(quantity), 0.0000) into v_already_returned
    from public.sale_return_items
    where sale_item_id = v_sale_item.id;

    v_rem_qty := v_sale_item.quantity - v_already_returned;

    if v_req_qty > v_rem_qty then
      raise exception 'RETURN_QUANTITY_EXCEEDED: % (Vendidas: %, Ya devueltas: %, Solicitadas: %)',
        v_sale_item.name_snapshot, v_sale_item.quantity, v_already_returned, v_req_qty;
    end if;

    -- Proporción económica exacta de reembolso
    v_line_refund := round((v_req_qty / v_sale_item.quantity) * v_sale_item.line_total, 2);
    v_total_refund := v_total_refund + v_line_refund;

    -- Recuperar costo histórico del movimiento original (sale_item.unit_cost snapshot)
    v_hist_cost := coalesce(v_sale_item.unit_cost, 0.0000);
    if v_hist_cost = 0 then
      select coalesce(unit_cost, 0.0000) into v_hist_cost
      from public.inventory_movements
      where company_id = p_company_id and movement_type = 'SALE_OUT' and product_id = v_sale_item.product_id
      order by created_at desc limit 1;

      if v_hist_cost is null or v_hist_cost = 0 then
        select cost into v_hist_cost from public.products where id = v_sale_item.product_id;
        v_hist_cost := coalesce(v_hist_cost, 0.0000);
      end if;
    end if;

    select id, company_id, allows_inventory, cost into v_prod
    from public.products
    where id = v_sale_item.product_id and company_id = p_company_id;

    v_prepared_items := v_prepared_items || jsonb_build_object(
      'sale_item_id', v_sale_item.id,
      'product_id', v_sale_item.product_id,
      'name_snapshot', v_sale_item.name_snapshot,
      'quantity', v_req_qty,
      'unit_price_snapshot', v_sale_item.unit_price,
      'unit_cost_snapshot', v_hist_cost,
      'tax_type', v_sale_item.tax_type,
      'tax_rate', v_sale_item.tax_rate,
      'tax_amount', round(v_line_refund * (v_sale_item.tax_rate / (1.0000 + v_sale_item.tax_rate)), 2),
      'line_refund_total', v_line_refund,
      'allows_inventory', coalesce(v_prod.allows_inventory, false),
      'current_cost', coalesce(v_prod.cost, 0.0000)
    );
  end loop;

  -- 5. Generar correlativo de Devolución
  insert into public.branch_sequences (company_id, branch_id, document_type, prefix, current_number)
  values (p_company_id, v_sale.branch_id, 'RETURN', 'DEV', 1)
  on conflict (company_id, branch_id, document_type)
  do update set current_number = branch_sequences.current_number + 1, updated_at = now()
  returning prefix, current_number into v_doc_prefix, v_doc_seq;
  v_doc_number := v_doc_prefix || '-' || lpad(v_doc_seq::text, 8, '0');

  -- 6. Insertar encabezado de sale_returns
  insert into public.sale_returns (
    id,
    company_id,
    branch_id,
    sale_id,
    warehouse_id,
    cash_session_id,
    document_number,
    return_type,
    status,
    reason,
    refund_total,
    currency,
    idempotency_key,
    notes,
    created_by,
    created_at,
    completed_at
  ) values (
    v_return_id,
    p_company_id,
    v_sale.branch_id,
    p_sale_id,
    v_sale.warehouse_id,
    p_cash_session_id,
    v_doc_number,
    p_return_type,
    'completed',
    p_reason,
    v_total_refund,
    v_sale.currency,
    p_idempotency_key,
    p_notes,
    auth.uid(),
    now(),
    now()
  );

  -- 7. Insertar ítems de devolución y restaurar inventario con MACP
  for v_item in select * from jsonb_array_elements(v_prepared_items)
  loop
    insert into public.sale_return_items (
      sale_return_id,
      company_id,
      sale_item_id,
      product_id,
      name_snapshot,
      quantity,
      unit_price_snapshot,
      unit_cost_snapshot,
      tax_type,
      tax_rate,
      tax_amount,
      line_refund_total
    ) values (
      v_return_id,
      p_company_id,
      (v_item->>'sale_item_id')::uuid,
      (v_item->>'product_id')::uuid,
      v_item->>'name_snapshot',
      (v_item->>'quantity')::numeric,
      (v_item->>'unit_price_snapshot')::numeric,
      (v_item->>'unit_cost_snapshot')::numeric,
      v_item->>'tax_type',
      (v_item->>'tax_rate')::numeric,
      (v_item->>'tax_amount')::numeric,
      (v_item->>'line_refund_total')::numeric
    );

    -- Si es producto físico inventariable, retornar stock al almacén original de la venta
    if (v_item->>'allows_inventory')::boolean then
      select id, quantity into v_balance
      from public.inventory_balances
      where company_id = p_company_id and warehouse_id = v_sale.warehouse_id and product_id = (v_item->>'product_id')::uuid
      for update;

      v_current_stock := coalesce(v_balance.quantity, 0.0000);

      -- Cálculo de MACP tras reingreso valorizado a costo histórico
      select coalesce(cost, 0.0000) into v_prod_cost
      from public.products
      where id = (v_item->>'product_id')::uuid;

      if v_current_stock <= 0 then
        v_new_avg_cost := (v_item->>'unit_cost_snapshot')::numeric;
      else
        v_new_avg_cost := round(
          ((v_current_stock * v_prod_cost) + ((v_item->>'quantity')::numeric * (v_item->>'unit_cost_snapshot')::numeric))
          / (v_current_stock + (v_item->>'quantity')::numeric),
          4
        );
      end if;

      -- Actualizar costo del maestro si fue positivo
      if v_new_avg_cost > 0 then
        update public.products
        set cost = v_new_avg_cost, updated_at = now()
        where id = (v_item->>'product_id')::uuid;
      end if;

      -- Incrementar balance
      insert into public.inventory_balances (company_id, warehouse_id, product_id, quantity, updated_at)
      values (p_company_id, v_sale.warehouse_id, (v_item->>'product_id')::uuid, (v_item->>'quantity')::numeric, now())
      on conflict (company_id, warehouse_id, product_id)
      do update set quantity = inventory_balances.quantity + (v_item->>'quantity')::numeric, updated_at = now();

      -- Registrar movimiento Kardex (SALE_RETURN_IN)
      insert into public.inventory_movements (
        company_id,
        warehouse_id,
        product_id,
        movement_type,
        quantity,
        unit_cost,
        reference_type,
        reference_id,
        notes,
        created_by
      ) values (
        p_company_id,
        v_sale.warehouse_id,
        (v_item->>'product_id')::uuid,
        'SALE_RETURN_IN',
        (v_item->>'quantity')::numeric,
        (v_item->>'unit_cost_snapshot')::numeric,
        'sale_return',
        v_return_id,
        'Devolución de venta ' || v_sale.document_number || ' (' || v_doc_number || ')',
        auth.uid()
      );
    end if;
  end loop;

  -- 8. Validar y procesar reembolsos económicos (Refunds)
  if p_refunds is not null and jsonb_array_length(p_refunds) > 0 then
    -- Validación previa de montos y suma total
    for v_refund_item in select * from jsonb_array_elements(p_refunds)
    loop
      v_refund_amt := (v_refund_item->>'amount')::numeric;
      v_refund_method := lower(trim(v_refund_item->>'payment_method'));

      if v_refund_amt is null or v_refund_amt <= 0 then
        raise exception 'INVALID_REFUND_AMOUNT';
      end if;

      if v_refund_method not in ('cash', 'card', 'transfer', 'digital') then
        raise exception 'INVALID_REFUND_METHOD';
      end if;

      v_total_refund_applied := v_total_refund_applied + v_refund_amt;
    end loop;

    if v_total_refund_applied > v_total_refund then
      raise exception 'REFUND_AMOUNT_EXCEEDS_RETURN_TOTAL';
    end if;

    -- Aplicación de reembolsos validados
    for v_refund_item in select * from jsonb_array_elements(p_refunds)
    loop
      v_refund_amt := (v_refund_item->>'amount')::numeric;
      v_refund_method := lower(trim(v_refund_item->>'payment_method'));

      -- Si es efectivo, impactar turno de caja activo
      if v_refund_method = 'cash' then
        if p_cash_session_id is null then
          raise exception 'CASH_SESSION_REQUIRED_FOR_CASH_REFUND';
        end if;

        select * into v_cash_session
        from public.cash_sessions
        where id = p_cash_session_id and company_id = p_company_id
        for update;

        if v_cash_session.id is null then
          raise exception 'CASH_SESSION_NOT_FOUND';
        end if;

        if v_cash_session.status <> 'open' then
          raise exception 'CASH_SESSION_CLOSED';
        end if;

        -- Registrar movimiento de salida en caja
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
          'SALE_REFUND',
          v_refund_amt,
          'cash',
          v_return_id,
          'Reembolso por devolución ' || v_doc_number,
          auth.uid()
        );

        -- Disminuir expected_cash
        update public.cash_sessions
        set expected_cash = expected_cash - v_refund_amt
        where id = p_cash_session_id;
      end if;

      -- Insertar registro de reembolso
      insert into public.sale_refunds (
        company_id,
        sale_return_id,
        cash_session_id,
        payment_method,
        amount,
        status,
        reference_notes
      ) values (
        p_company_id,
        v_return_id,
        case when v_refund_method = 'cash' then p_cash_session_id else null end,
        v_refund_method,
        v_refund_amt,
        'completed',
        v_refund_item->>'reference_notes'
      );
    end loop;
  else
    -- Por defecto, reembolso registrado en el medio original o por el total
    insert into public.sale_refunds (
      company_id, sale_return_id, payment_method, amount, status, reference_notes
    ) values (
      p_company_id, v_return_id, 'cash', v_total_refund, 'recorded', 'Reembolso registrado por defecto'
    );
  end if;

  -- 9. Actualizar estado derivado en la venta original
  select count(*), count(*) filter (
    where (
      select coalesce(sum(quantity), 0)
      from public.sale_return_items sri
      where sri.sale_item_id = si.id
    ) >= si.quantity
  ) into v_all_items_count, v_fully_returned_count
  from public.sale_items si
  where si.sale_id = p_sale_id;

  if p_return_type = 'void' or (v_all_items_count > 0 and v_all_items_count = v_fully_returned_count) then
    update public.sales
    set status = case when p_return_type = 'void' then 'voided' else 'fully_returned' end, updated_at = now()
    where id = p_sale_id;
  else
    update public.sales
    set status = 'partially_returned', updated_at = now()
    where id = p_sale_id;
  end if;

  -- 10. Auditar
  insert into public.audit_logs (
    company_id, actor_user_id, action, entity_type, entity_id, metadata
  ) values (
    p_company_id, auth.uid(),
    case when p_return_type = 'void' then 'sale.voided' else 'sale.return.completed' end,
    'sale_returns', v_return_id,
    jsonb_build_object(
      'document_number', v_doc_number,
      'sale_id', p_sale_id,
      'return_type', p_return_type,
      'refund_total', v_total_refund,
      'reason', p_reason
    )
  );

  return jsonb_build_object(
    'return_id', v_return_id,
    'document_number', v_doc_number,
    'sale_id', p_sale_id,
    'return_type', p_return_type,
    'refund_total', v_total_refund,
    'status', 'completed',
    'created_at', now()
  );
end;$$;

-- 4. RPC TRANSACCIONAL: void_sale
create or replace function public.void_sale(
  p_company_id uuid,
  p_sale_id uuid,
  p_reason text,
  p_cash_session_id uuid default null,
  p_idempotency_key text default null,
  p_notes text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_sale record;
  v_si record;
  v_already_ret numeric(14,4);
  v_rem_qty numeric(14,4);
  v_return_items jsonb := '[]'::jsonb;
  v_refunds jsonb := '[]'::jsonb;
  v_total_rem_refund numeric(12,2) := 0.00;
  v_item_refund numeric(12,2);
  v_res jsonb;
begin
  if not public.is_company_member(p_company_id) then
    raise exception 'forbidden';
  end if;

  if p_reason is null or trim(p_reason) = '' then
    raise exception 'VOID_REASON_REQUIRED';
  end if;

  select * into v_sale
  from public.sales
  where id = p_sale_id and company_id = p_company_id;

  if v_sale.id is null then
    raise exception 'SALE_NOT_FOUND';
  end if;

  if v_sale.status = 'voided' then
    -- Idempotente si ya fue anulada
    return jsonb_build_object(
      'sale_id', p_sale_id,
      'status', 'voided',
      'idempotent_replay', true,
      'message', 'SALE_ALREADY_VOIDED'
    );
  end if;

  -- Calcular cantidades remanentes de cada ítem
  for v_si in select * from public.sale_items where sale_id = p_sale_id
  loop
    select coalesce(sum(quantity), 0.0000) into v_already_ret
    from public.sale_return_items
    where sale_item_id = v_si.id;

    v_rem_qty := v_si.quantity - v_already_ret;

    if v_rem_qty > 0 then
      v_item_refund := round((v_rem_qty / v_si.quantity) * v_si.line_total, 2);
      v_total_rem_refund := v_total_rem_refund + v_item_refund;

      v_return_items := v_return_items || jsonb_build_object(
        'sale_item_id', v_si.id,
        'quantity', v_rem_qty
      );
    end if;
  end loop;

  if jsonb_array_length(v_return_items) = 0 then
    raise exception 'SALE_NOTHING_TO_VOID';
  end if;

  -- Si hubo pagos en efectivo y hay caja abierta, preparar reembolso en efectivo
  if p_cash_session_id is not null and v_total_rem_refund > 0 then
    v_refunds := jsonb_build_array(
      jsonb_build_object('payment_method', 'cash', 'amount', v_total_rem_refund, 'reference_notes', 'Anulación total de venta')
    );
  end if;

  -- Ejecutar motor común de reversión
  v_res := public.create_sale_return(
    p_company_id => p_company_id,
    p_sale_id => p_sale_id,
    p_items => v_return_items,
    p_reason => p_reason,
    p_refunds => v_refunds,
    p_cash_session_id => p_cash_session_id,
    p_return_type => 'void',
    p_idempotency_key => p_idempotency_key,
    p_notes => coalesce(p_notes, 'Anulación completa de venta ' || v_sale.document_number)
  );

  return v_res;
end;$$;

-- 5. RPC TRANSACCIONAL: create_purchase_return
create or replace function public.create_purchase_return(
  p_company_id uuid,
  p_purchase_id uuid,
  p_items jsonb,
  p_reason text,
  p_idempotency_key text default null,
  p_notes text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_purchase record;
  v_return_id uuid;
  v_item jsonb;
  v_purchase_item record;
  v_prod record;
  v_balance record;
  
  v_req_qty numeric(14,4);
  v_already_returned numeric(14,4);
  v_rem_qty numeric(14,4);
  v_line_total numeric(12,2);
  v_total_refund_expected numeric(12,2) := 0.00;
  
  v_doc_prefix text := 'DEVCOM';
  v_doc_seq bigint;
  v_doc_number text;
  
  v_existing_return record;
  v_prepared_items jsonb := '[]'::jsonb;
begin
  if not public.is_company_member(p_company_id) then
    raise exception 'forbidden';
  end if;

  if p_reason is null or trim(p_reason) = '' then
    raise exception 'PURCHASE_RETURN_REASON_REQUIRED';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_PURCHASE_RETURN_ITEMS';
  end if;

  -- Idempotencia
  if p_idempotency_key is not null and trim(p_idempotency_key) <> '' then
    select id, document_number, refund_expected, created_at into v_existing_return
    from public.purchase_returns
    where company_id = p_company_id and idempotency_key = p_idempotency_key;

    if v_existing_return.id is not null then
      return jsonb_build_object(
        'purchase_return_id', v_existing_return.id,
        'document_number', v_existing_return.document_number,
        'refund_expected', v_existing_return.refund_expected,
        'created_at', v_existing_return.created_at,
        'idempotent_replay', true
      );
    end if;
  end if;

  -- Validar compra
  select * into v_purchase
  from public.purchases
  where id = p_purchase_id and company_id = p_company_id;

  if v_purchase.id is null then
    raise exception 'PURCHASE_NOT_FOUND';
  end if;

  v_return_id := gen_random_uuid();

  -- Procesar y validar cada ítem
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_req_qty := (v_item->>'quantity')::numeric;

    if v_req_qty is null or v_req_qty <= 0 then
      raise exception 'INVALID_PURCHASE_RETURN_QUANTITY';
    end if;

    select * into v_purchase_item
    from public.purchase_items
    where id = (v_item->>'purchase_item_id')::uuid and purchase_id = p_purchase_id
    for update;

    if v_purchase_item.id is null then
      raise exception 'PURCHASE_ITEM_NOT_FOUND';
    end if;

    -- Validar no sobredevolver sobre la compra original
    select coalesce(sum(quantity), 0.0000) into v_already_returned
    from public.purchase_return_items
    where purchase_item_id = v_purchase_item.id;

    v_rem_qty := v_purchase_item.quantity - v_already_returned;

    if v_req_qty > v_rem_qty then
      raise exception 'PURCHASE_RETURN_QUANTITY_EXCEEDED: % (Compradas: %, Ya devueltas: %, Solicitadas: %)',
        v_purchase_item.name_snapshot, v_purchase_item.quantity, v_already_returned, v_req_qty;
    end if;

    v_line_total := round(v_req_qty * v_purchase_item.unit_cost, 2);
    v_total_refund_expected := v_total_refund_expected + v_line_total;

    select id, company_id, allows_inventory, cost into v_prod
    from public.products
    where id = v_purchase_item.product_id and company_id = p_company_id;

    -- Validar stock físico disponible en el almacén de compra
    if coalesce(v_prod.allows_inventory, false) then
      select id, quantity into v_balance
      from public.inventory_balances
      where company_id = p_company_id and warehouse_id = v_purchase.warehouse_id and product_id = v_purchase_item.product_id
      for update;

      if v_balance.id is null or v_balance.quantity < v_req_qty then
        raise exception 'INSUFFICIENT_STOCK: % en almacén para devolución (Disponible: %, Solicitado: %)',
          v_purchase_item.name_snapshot, coalesce(v_balance.quantity, 0), v_req_qty;
      end if;
    end if;

    v_prepared_items := v_prepared_items || jsonb_build_object(
      'purchase_item_id', v_purchase_item.id,
      'product_id', v_purchase_item.product_id,
      'name_snapshot', v_purchase_item.name_snapshot,
      'quantity', v_req_qty,
      'unit_cost_snapshot', v_purchase_item.unit_cost,
      'line_total', v_line_total,
      'allows_inventory', coalesce(v_prod.allows_inventory, false)
    );
  end loop;

  -- Generar correlativo
  v_doc_number := 'DEVCOM-' || to_char(now(), 'YYYYMMDD') || '-' || substr(v_return_id::text, 1, 6);

  -- Insertar encabezado de purchase_returns
  insert into public.purchase_returns (
    id,
    company_id,
    branch_id,
    purchase_id,
    warehouse_id,
    supplier_id,
    document_number,
    status,
    reason,
    refund_expected,
    currency,
    idempotency_key,
    notes,
    created_by,
    created_at,
    completed_at
  ) values (
    v_return_id,
    p_company_id,
    v_purchase.branch_id,
    p_purchase_id,
    v_purchase.warehouse_id,
    v_purchase.supplier_id,
    v_doc_number,
    'completed',
    p_reason,
    v_total_refund_expected,
    v_purchase.currency,
    p_idempotency_key,
    p_notes,
    auth.uid(),
    now(),
    now()
  );

  -- Insertar items y descontar stock con PURCHASE_RETURN_OUT
  for v_item in select * from jsonb_array_elements(v_prepared_items)
  loop
    insert into public.purchase_return_items (
      purchase_return_id,
      company_id,
      purchase_item_id,
      product_id,
      name_snapshot,
      quantity,
      unit_cost_snapshot,
      line_total
    ) values (
      v_return_id,
      p_company_id,
      (v_item->>'purchase_item_id')::uuid,
      (v_item->>'product_id')::uuid,
      v_item->>'name_snapshot',
      (v_item->>'quantity')::numeric,
      (v_item->>'unit_cost_snapshot')::numeric,
      (v_item->>'line_total')::numeric
    );

    if (v_item->>'allows_inventory')::boolean then
      -- Descontar inventario (sin alterar MACP del saldo restante)
      update public.inventory_balances
      set quantity = quantity - (v_item->>'quantity')::numeric, updated_at = now()
      where company_id = p_company_id and warehouse_id = v_purchase.warehouse_id and product_id = (v_item->>'product_id')::uuid;

      -- Registrar movimiento Kardex (PURCHASE_RETURN_OUT)
      insert into public.inventory_movements (
        company_id,
        warehouse_id,
        product_id,
        movement_type,
        quantity,
        unit_cost,
        reference_type,
        reference_id,
        notes,
        created_by
      ) values (
        p_company_id,
        v_purchase.warehouse_id,
        (v_item->>'product_id')::uuid,
        'PURCHASE_RETURN_OUT',
        (v_item->>'quantity')::numeric,
        (v_item->>'unit_cost_snapshot')::numeric,
        'purchase_return',
        v_return_id,
        'Devolución de compra ' || v_purchase.document_number || ' (' || v_doc_number || ')',
        auth.uid()
      );
    end if;
  end loop;

  -- Auditar
  insert into public.audit_logs (
    company_id, actor_user_id, action, entity_type, entity_id, metadata
  ) values (
    p_company_id, auth.uid(), 'purchase.return.completed', 'purchase_returns', v_return_id,
    jsonb_build_object(
      'document_number', v_doc_number,
      'purchase_id', p_purchase_id,
      'supplier_id', v_purchase.supplier_id,
      'refund_expected', v_total_refund_expected,
      'reason', p_reason
    )
  );

  return jsonb_build_object(
    'purchase_return_id', v_return_id,
    'document_number', v_doc_number,
    'purchase_id', p_purchase_id,
    'refund_expected', v_total_refund_expected,
    'status', 'completed',
    'created_at', now()
  );
end;$$;

-- Permisos de ejecución
revoke all on function public.create_sale_return(uuid, uuid, jsonb, text, jsonb, uuid, text, text, text) from public;
grant execute on function public.create_sale_return(uuid, uuid, jsonb, text, jsonb, uuid, text, text, text) to authenticated;

revoke all on function public.void_sale(uuid, uuid, text, uuid, text, text) from public;
grant execute on function public.void_sale(uuid, uuid, text, uuid, text, text) to authenticated;

revoke all on function public.create_purchase_return(uuid, uuid, jsonb, text, text, text) from public;
grant execute on function public.create_purchase_return(uuid, uuid, jsonb, text, text, text) to authenticated;
