-- ============================================================
-- PROCESA CLOUD · FASE 1C · BUNDLE: 063 + 064 (HARDENED)
-- PURCHASES, ADJUSTMENTS, TRANSFERS & KARDEX RPCs
-- Copiar y pegar completo en SQL Editor de Supabase
-- ============================================================

-- ========== supabase/migrations/063_pos_purchases_adjustments_transfers.sql ==========
-- ===================================================================
-- PROCESA CLOUD · FASE 1C · MIGRATION 063
-- Purchases, Adjustments, Transfers & Kardex Schema (RLS & Invariants)
-- ===================================================================

-- 1. Actualizar catálogo de movimientos y referencias en inventory_movements
alter table public.inventory_movements add column if not exists reference_type text;
alter table public.inventory_movements add column if not exists reference_id uuid;

alter table public.inventory_movements drop constraint if exists inventory_movements_movement_type_check;
alter table public.inventory_movements add constraint inventory_movements_movement_type_check
  check (movement_type in (
    'INITIAL_STOCK',
    'PURCHASE_IN',
    'SALE_OUT',
    'IN_ADJUSTMENT',
    'OUT_ADJUSTMENT',
    'TRANSFER_OUT',
    'TRANSFER_IN'
  ));

alter table public.inventory_movements drop constraint if exists inventory_movements_reference_type_check;
alter table public.inventory_movements add constraint inventory_movements_reference_type_check
  check (reference_type is null or reference_type in ('initial_stock', 'sale', 'purchase', 'adjustment', 'transfer'));

-- Trigger de Inmutabilidad sobre inventory_movements (Append-only absoluto)
create or replace function public.trg_prevent_inventory_movement_mutation()
returns trigger language plpgsql security definer as $$
begin
  raise exception 'INVENTORY_MOVEMENTS_ARE_IMMUTABLE';
end;$$;

drop trigger if exists trg_inventory_movements_immutability on public.inventory_movements;
create trigger trg_inventory_movements_immutability
  before update or delete on public.inventory_movements
  for each row execute function public.trg_prevent_inventory_movement_mutation();

-- 2. Entidad: Compras (purchases)
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  warehouse_id uuid not null references public.warehouses(id) on delete restrict,
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  document_number text not null,
  status text not null default 'confirmed' check (status in ('draft', 'confirmed', 'cancelled')),
  currency text not null default 'PEN',
  subtotal numeric(12,2) not null check (subtotal >= 0),
  tax_total numeric(12,2) not null default 0.00 check (tax_total >= 0),
  total numeric(12,2) not null check (total >= 0),
  supplier_doc_type text default 'FACTURA',
  supplier_doc_number text,
  supplier_doc_date date default current_date,
  idempotency_key text,
  notes text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz default now()
);

create unique index if not exists purchases_idempotency_uq
  on public.purchases (company_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists purchases_company_created_idx
  on public.purchases (company_id, created_at desc);

create index if not exists purchases_warehouse_idx
  on public.purchases (company_id, warehouse_id);

alter table public.purchases enable row level security;

drop policy if exists "purchases_select" on public.purchases;
create policy "purchases_select" on public.purchases
  for select using (public.is_company_member(company_id));

drop policy if exists "purchases_insert" on public.purchases;
create policy "purchases_insert" on public.purchases
  for insert with check (public.is_company_member(company_id));

-- Trigger de Inmutabilidad sobre Compras Confirmadas
create or replace function public.trg_prevent_confirmed_purchase_mutation()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'UPDATE' then
    if OLD.status = 'confirmed' and (
      NEW.total <> OLD.total or
      NEW.subtotal <> OLD.subtotal or
      NEW.tax_total <> OLD.tax_total or
      NEW.warehouse_id <> OLD.warehouse_id or
      NEW.supplier_id <> OLD.supplier_id or
      NEW.company_id <> OLD.company_id
    ) then
      raise exception 'CANNOT_MUTATE_CONFIRMED_PURCHASE';
    end if;
  elsif TG_OP = 'DELETE' then
    if OLD.status = 'confirmed' then
      raise exception 'CANNOT_DELETE_CONFIRMED_PURCHASE';
    end if;
  end if;
  return NEW;
end;$$;

drop trigger if exists purchases_immutability_trg on public.purchases;
create trigger purchases_immutability_trg
  before update or delete on public.purchases
  for each row execute function public.trg_prevent_confirmed_purchase_mutation();

-- 3. Detalle de Compra (purchase_items)
create table if not exists public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  name_snapshot text not null,
  sku_snapshot text,
  unit_snapshot text not null default 'NIU',
  quantity numeric(14,4) not null check (quantity > 0),
  unit_cost numeric(12,4) not null check (unit_cost >= 0),
  tax_type text not null default 'igv_18',
  tax_rate numeric(5,4) not null default 0.1800,
  tax_amount numeric(12,2) not null default 0.00 check (tax_amount >= 0),
  line_subtotal numeric(12,2) not null check (line_subtotal >= 0),
  line_total numeric(12,2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

create index if not exists purchase_items_purchase_idx on public.purchase_items(purchase_id);

alter table public.purchase_items enable row level security;

drop policy if exists "purchase_items_select" on public.purchase_items;
create policy "purchase_items_select" on public.purchase_items
  for select using (
    exists (
      select 1 from public.purchases p
      where p.id = purchase_items.purchase_id and public.is_company_member(p.company_id)
    )
  );

drop policy if exists "purchase_items_insert" on public.purchase_items;
create policy "purchase_items_insert" on public.purchase_items
  for insert with check (
    exists (
      select 1 from public.purchases p
      where p.id = purchase_items.purchase_id and public.is_company_member(p.company_id)
    )
  );

-- Trigger de Inmutabilidad sobre Purchase Items
create or replace function public.trg_prevent_confirmed_purchase_item_mutation()
returns trigger language plpgsql security definer as $$
declare
  v_status text;
begin
  select status into v_status from public.purchases where id = coalesce(OLD.purchase_id, NEW.purchase_id);
  if v_status = 'confirmed' then
    if TG_OP = 'UPDATE' then
      raise exception 'CANNOT_MUTATE_CONFIRMED_PURCHASE_ITEM';
    elsif TG_OP = 'DELETE' then
      raise exception 'CANNOT_DELETE_CONFIRMED_PURCHASE_ITEM';
    end if;
  end if;
  return NEW;
end;$$;

drop trigger if exists purchase_items_immutability_trg on public.purchase_items;
create trigger purchase_items_immutability_trg
  before update or delete on public.purchase_items
  for each row execute function public.trg_prevent_confirmed_purchase_item_mutation();

-- 4. Ajustes de Inventario (inventory_adjustments & items)
create table if not exists public.inventory_adjustments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  warehouse_id uuid not null references public.warehouses(id) on delete restrict,
  document_number text not null,
  reason text not null check (length(trim(reason)) > 0),
  status text not null default 'completed' check (status in ('completed', 'cancelled')),
  idempotency_key text,
  notes text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create unique index if not exists inventory_adjustments_idempotency_uq
  on public.inventory_adjustments (company_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists inventory_adjustments_company_idx
  on public.inventory_adjustments (company_id, created_at desc);

alter table public.inventory_adjustments enable row level security;

drop policy if exists "inventory_adjustments_select" on public.inventory_adjustments;
create policy "inventory_adjustments_select" on public.inventory_adjustments
  for select using (public.is_company_member(company_id));

drop policy if exists "inventory_adjustments_insert" on public.inventory_adjustments;
create policy "inventory_adjustments_insert" on public.inventory_adjustments
  for insert with check (public.is_company_member(company_id));

-- Trigger de Inmutabilidad sobre inventory_adjustments
create or replace function public.trg_prevent_adjustment_mutation()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'UPDATE' then
    raise exception 'CANNOT_MUTATE_COMPLETED_ADJUSTMENT';
  elsif TG_OP = 'DELETE' then
    raise exception 'CANNOT_DELETE_COMPLETED_ADJUSTMENT';
  end if;
  return NEW;
end;$$;

drop trigger if exists inventory_adjustments_immutability_trg on public.inventory_adjustments;
create trigger inventory_adjustments_immutability_trg
  before update or delete on public.inventory_adjustments
  for each row execute function public.trg_prevent_adjustment_mutation();

create table if not exists public.inventory_adjustment_items (
  id uuid primary key default gen_random_uuid(),
  adjustment_id uuid not null references public.inventory_adjustments(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  adjustment_type text not null check (adjustment_type in ('IN', 'OUT')),
  quantity numeric(14,4) not null check (quantity > 0),
  unit_cost numeric(12,4) not null default 0.0000 check (unit_cost >= 0),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists adjustment_items_adj_idx on public.inventory_adjustment_items(adjustment_id);

alter table public.inventory_adjustment_items enable row level security;

drop policy if exists "adjustment_items_select" on public.inventory_adjustment_items;
create policy "adjustment_items_select" on public.inventory_adjustment_items
  for select using (
    exists (
      select 1 from public.inventory_adjustments a
      where a.id = inventory_adjustment_items.adjustment_id and public.is_company_member(a.company_id)
    )
  );

drop policy if exists "adjustment_items_insert" on public.inventory_adjustment_items;
create policy "adjustment_items_insert" on public.inventory_adjustment_items
  for insert with check (
    exists (
      select 1 from public.inventory_adjustments a
      where a.id = inventory_adjustment_items.adjustment_id and public.is_company_member(a.company_id)
    )
  );

-- Trigger de Inmutabilidad sobre adjustment_items
create or replace function public.trg_prevent_adjustment_item_mutation()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'UPDATE' then
    raise exception 'CANNOT_MUTATE_ADJUSTMENT_ITEM';
  elsif TG_OP = 'DELETE' then
    raise exception 'CANNOT_DELETE_ADJUSTMENT_ITEM';
  end if;
  return NEW;
end;$$;

drop trigger if exists adjustment_items_immutability_trg on public.inventory_adjustment_items;
create trigger adjustment_items_immutability_trg
  before update or delete on public.inventory_adjustment_items
  for each row execute function public.trg_prevent_adjustment_item_mutation();

-- 5. Transferencias entre Almacenes (inventory_transfers & items)
create table if not exists public.inventory_transfers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  source_warehouse_id uuid not null references public.warehouses(id) on delete restrict,
  destination_warehouse_id uuid not null references public.warehouses(id) on delete restrict,
  document_number text not null,
  status text not null default 'completed' check (status in ('completed', 'cancelled')),
  idempotency_key text,
  notes text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (source_warehouse_id <> destination_warehouse_id)
);

create unique index if not exists inventory_transfers_idempotency_uq
  on public.inventory_transfers (company_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists inventory_transfers_company_idx
  on public.inventory_transfers (company_id, created_at desc);

alter table public.inventory_transfers enable row level security;

drop policy if exists "inventory_transfers_select" on public.inventory_transfers;
create policy "inventory_transfers_select" on public.inventory_transfers
  for select using (public.is_company_member(company_id));

drop policy if exists "inventory_transfers_insert" on public.inventory_transfers;
create policy "inventory_transfers_insert" on public.inventory_transfers
  for insert with check (public.is_company_member(company_id));

-- Trigger de Inmutabilidad sobre inventory_transfers
create or replace function public.trg_prevent_transfer_mutation()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'UPDATE' then
    raise exception 'CANNOT_MUTATE_COMPLETED_TRANSFER';
  elsif TG_OP = 'DELETE' then
    raise exception 'CANNOT_DELETE_COMPLETED_TRANSFER';
  end if;
  return NEW;
end;$$;

drop trigger if exists inventory_transfers_immutability_trg on public.inventory_transfers;
create trigger inventory_transfers_immutability_trg
  before update or delete on public.inventory_transfers
  for each row execute function public.trg_prevent_transfer_mutation();

create table if not exists public.inventory_transfer_items (
  id uuid primary key default gen_random_uuid(),
  transfer_id uuid not null references public.inventory_transfers(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity numeric(14,4) not null check (quantity > 0),
  unit_cost numeric(12,4) not null default 0.0000 check (unit_cost >= 0),
  created_at timestamptz not null default now()
);

create index if not exists transfer_items_tr_idx on public.inventory_transfer_items(transfer_id);

alter table public.inventory_transfer_items enable row level security;

drop policy if exists "transfer_items_select" on public.inventory_transfer_items;
create policy "transfer_items_select" on public.inventory_transfer_items
  for select using (
    exists (
      select 1 from public.inventory_transfers t
      where t.id = inventory_transfer_items.transfer_id and public.is_company_member(t.company_id)
    )
  );

drop policy if exists "transfer_items_insert" on public.inventory_transfer_items;
create policy "transfer_items_insert" on public.inventory_transfer_items
  for insert with check (
    exists (
      select 1 from public.inventory_transfers t
      where t.id = inventory_transfer_items.transfer_id and public.is_company_member(t.company_id)
    )
  );

-- Trigger de Inmutabilidad sobre transfer_items
create or replace function public.trg_prevent_transfer_item_mutation()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'UPDATE' then
    raise exception 'CANNOT_MUTATE_TRANSFER_ITEM';
  elsif TG_OP = 'DELETE' then
    raise exception 'CANNOT_DELETE_TRANSFER_ITEM';
  end if;
  return NEW;
end;$$;

drop trigger if exists transfer_items_immutability_trg on public.inventory_transfer_items;
create trigger transfer_items_immutability_trg
  before update or delete on public.inventory_transfer_items
  for each row execute function public.trg_prevent_transfer_item_mutation();


-- ========== supabase/migrations/064_pos_purchases_and_inventory_rpcs.sql ==========
-- ===================================================================
-- PROCESA CLOUD · FASE 1C · MIGRATION 064
-- Purchases, Adjustments, Transfers & Kardex RPCs & Permissions
-- ===================================================================

-- 1. Permisos FASE 1C
insert into public.permissions (code, description) values
  ('pos.purchases.read', 'Permite consultar el historial y detalle de compras a proveedores'),
  ('pos.purchases.create', 'Permite registrar y confirmar compras de mercadería'),
  ('pos.inventory.adjust', 'Permite registrar ajustes positivos y negativos de stock'),
  ('pos.inventory.transfer', 'Permite transferir stock entre almacenes de la empresa'),
  ('pos.inventory.kardex', 'Permite consultar el Kardex físico valorizado y movimientos')
on conflict (code) do nothing;

-- Asignar nuevos permisos al rol Administrador del sistema
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.is_system = true and r.name = 'Administrador'
  and p.code in (
    'pos.purchases.read',
    'pos.purchases.create',
    'pos.inventory.adjust',
    'pos.inventory.transfer',
    'pos.inventory.kardex'
  )
on conflict do nothing;

-- 2. Limpiar sobrecargas previas
drop function if exists public.create_pos_purchase(uuid, uuid, uuid, jsonb, uuid, text, text, date, text, text);
drop function if exists public.create_inventory_adjustment(uuid, uuid, text, jsonb, text, text);
drop function if exists public.create_inventory_adjustment(uuid, uuid, text, jsonb, text);
drop function if exists public.create_inventory_transfer(uuid, uuid, uuid, jsonb, text, text);
drop function if exists public.create_inventory_transfer(uuid, uuid, uuid, jsonb, text);
drop function if exists public.get_product_kardex(uuid, uuid, uuid, timestamptz, timestamptz);

-- 3. RPC TRANSACCIONAL ATÓMICO: create_pos_purchase
create or replace function public.create_pos_purchase(
  p_company_id uuid,
  p_warehouse_id uuid,
  p_supplier_id uuid,
  p_items jsonb,
  p_branch_id uuid default null,
  p_supplier_doc_type text default 'FACTURA',
  p_supplier_doc_number text default null,
  p_supplier_doc_date date default current_date,
  p_idempotency_key text default null,
  p_notes text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_purchase_id uuid;
  v_wh_company uuid;
  v_sup_company uuid;
  v_item jsonb;
  v_prod record;
  v_balance record;
  
  v_subtotal numeric(12,2) := 0.00;
  v_tax_total numeric(12,2) := 0.00;
  v_total numeric(12,2) := 0.00;
  
  v_line_qty numeric(14,4);
  v_line_cost numeric(12,4);
  v_line_subtotal numeric(12,2);
  v_line_tax numeric(12,2);
  v_line_total numeric(12,2);
  v_tax_rate numeric(5,4);
  
  v_new_avg_cost numeric(12,4);
  v_current_stock numeric(14,4);
  
  v_doc_prefix text := 'COM';
  v_doc_seq bigint;
  v_doc_number text;
  v_branch_for_seq uuid;
  
  v_existing_purchase record;
  v_prepared_items jsonb := '[]'::jsonb;
begin
  -- 1. Validar membresía
  if not public.is_company_member(p_company_id) then
    raise exception 'forbidden';
  end if;

  -- 2. Idempotencia
  if p_idempotency_key is not null and trim(p_idempotency_key) <> '' then
    select id, document_number, total, created_at into v_existing_purchase
    from public.purchases
    where company_id = p_company_id and idempotency_key = p_idempotency_key;

    if v_existing_purchase.id is not null then
      return jsonb_build_object(
        'purchase_id', v_existing_purchase.id,
        'document_number', v_existing_purchase.document_number,
        'total', v_existing_purchase.total,
        'created_at', v_existing_purchase.created_at,
        'idempotent_replay', true
      );
    end if;
  end if;

  -- 3. Validar almacén
  select company_id, branch_id into v_wh_company, v_branch_for_seq
  from public.warehouses
  where id = p_warehouse_id and deleted_at is null;

  if v_wh_company is null or v_wh_company <> p_company_id then
    raise exception 'WAREHOUSE_NOT_FOUND';
  end if;

  -- 4. Validar proveedor
  select company_id into v_sup_company
  from public.suppliers
  where id = p_supplier_id and deleted_at is null;

  if v_sup_company is null or v_sup_company <> p_company_id then
    raise exception 'SUPPLIER_NOT_FOUND';
  end if;

  -- 5. Validar items no vacíos
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_PURCHASE_ITEMS';
  end if;

  v_purchase_id := gen_random_uuid();
  v_branch_for_seq := coalesce(p_branch_id, v_branch_for_seq);

  -- 6. Validar y procesar items
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_line_qty := (v_item->>'quantity')::numeric;
    v_line_cost := (v_item->>'unit_cost')::numeric;

    if v_line_qty is null or v_line_qty <= 0 then
      raise exception 'INVALID_ITEM_QUANTITY';
    end if;

    if v_line_cost is null or v_line_cost < 0 then
      raise exception 'INVALID_ITEM_COST';
    end if;

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

    if v_prod.tax_type = 'igv_18' then
      v_tax_rate := 0.1800;
    else
      v_tax_rate := 0.0000;
    end if;

    v_line_subtotal := round(v_line_qty * v_line_cost, 2);
    v_line_tax := round(v_line_subtotal * v_tax_rate, 2);
    v_line_total := v_line_subtotal + v_line_tax;

    v_subtotal := v_subtotal + v_line_subtotal;
    v_tax_total := v_tax_total + v_line_tax;
    v_total := v_total + v_line_total;

    v_prepared_items := v_prepared_items || jsonb_build_object(
      'product_id', v_prod.id,
      'name_snapshot', v_prod.name,
      'sku_snapshot', v_prod.sku,
      'unit_snapshot', coalesce(v_prod.unit, 'NIU'),
      'quantity', v_line_qty,
      'unit_cost', v_line_cost,
      'tax_type', v_prod.tax_type,
      'tax_rate', v_tax_rate,
      'tax_amount', v_line_tax,
      'line_subtotal', v_line_subtotal,
      'line_total', v_line_total,
      'allows_inventory', v_prod.allows_inventory,
      'current_cost', coalesce(v_prod.cost, 0.0000)
    );
  end loop;

  -- 7. Generar correlativo
  if v_branch_for_seq is not null then
    insert into public.branch_sequences (company_id, branch_id, document_type, prefix, current_number)
    values (p_company_id, v_branch_for_seq, 'PURCHASE', 'COM', 1)
    on conflict (company_id, branch_id, document_type)
    do update set current_number = branch_sequences.current_number + 1, updated_at = now()
    returning prefix, current_number into v_doc_prefix, v_doc_seq;
    v_doc_number := v_doc_prefix || '-' || lpad(v_doc_seq::text, 8, '0');
  else
    v_doc_number := 'COM-' || to_char(now(), 'YYYYMMDD') || '-' || substr(v_purchase_id::text, 1, 6);
  end if;

  -- 8. Insertar encabezado de compra
  insert into public.purchases (
    id,
    company_id,
    branch_id,
    warehouse_id,
    supplier_id,
    document_number,
    status,
    currency,
    subtotal,
    tax_total,
    total,
    supplier_doc_type,
    supplier_doc_number,
    supplier_doc_date,
    idempotency_key,
    notes,
    created_by,
    created_at,
    confirmed_at
  ) values (
    v_purchase_id,
    p_company_id,
    p_branch_id,
    p_warehouse_id,
    p_supplier_id,
    v_doc_number,
    'confirmed',
    'PEN',
    v_subtotal,
    v_tax_total,
    v_total,
    p_supplier_doc_type,
    p_supplier_doc_number,
    p_supplier_doc_date,
    p_idempotency_key,
    p_notes,
    auth.uid(),
    now(),
    now()
  );

  -- 9. Insertar items, actualizar stock e impacto de costo promedio ponderado bajo LOCK
  for v_item in select * from jsonb_array_elements(v_prepared_items)
  loop
    insert into public.purchase_items (
      purchase_id,
      product_id,
      name_snapshot,
      sku_snapshot,
      unit_snapshot,
      quantity,
      unit_cost,
      tax_type,
      tax_rate,
      tax_amount,
      line_subtotal,
      line_total
    ) values (
      v_purchase_id,
      (v_item->>'product_id')::uuid,
      v_item->>'name_snapshot',
      v_item->>'sku_snapshot',
      v_item->>'unit_snapshot',
      (v_item->>'quantity')::numeric,
      (v_item->>'unit_cost')::numeric,
      v_item->>'tax_type',
      (v_item->>'tax_rate')::numeric,
      (v_item->>'tax_amount')::numeric,
      (v_item->>'line_subtotal')::numeric,
      (v_item->>'line_total')::numeric
    );

    -- Si es producto físico inventariable, ingresar al almacén y recalcular costo
    if (v_item->>'allows_inventory')::boolean then
      select id, quantity into v_balance
      from public.inventory_balances
      where company_id = p_company_id and warehouse_id = p_warehouse_id and product_id = (v_item->>'product_id')::uuid
      for update;

      v_current_stock := coalesce(v_balance.quantity, 0.0000);

      -- Cálculo de Costo Promedio Ponderado Móvil (bajo lock)
      if v_current_stock <= 0 then
        v_new_avg_cost := (v_item->>'unit_cost')::numeric;
      else
        v_new_avg_cost := round(
          ((v_current_stock * (v_item->>'current_cost')::numeric) + ((v_item->>'quantity')::numeric * (v_item->>'unit_cost')::numeric))
          / (v_current_stock + (v_item->>'quantity')::numeric),
          4
        );
      end if;

      -- Actualizar costo maestro del producto
      update public.products
      set cost = v_new_avg_cost, updated_at = now()
      where id = (v_item->>'product_id')::uuid;

      -- Incrementar balance de inventario
      insert into public.inventory_balances (company_id, warehouse_id, product_id, quantity, updated_at)
      values (p_company_id, p_warehouse_id, (v_item->>'product_id')::uuid, (v_item->>'quantity')::numeric, now())
      on conflict (company_id, warehouse_id, product_id)
      do update set quantity = inventory_balances.quantity + (v_item->>'quantity')::numeric, updated_at = now();

      -- Registrar movimiento Kardex (PURCHASE_IN)
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
        p_warehouse_id,
        (v_item->>'product_id')::uuid,
        'PURCHASE_IN',
        (v_item->>'quantity')::numeric,
        (v_item->>'unit_cost')::numeric,
        'purchase',
        v_purchase_id,
        'Entrada por compra ' || v_doc_number,
        auth.uid()
      );
    end if;
  end loop;

  -- 10. Auditar
  insert into public.audit_logs (
    company_id, actor_user_id, action, entity_type, entity_id, metadata
  ) values (
    p_company_id, auth.uid(), 'purchase.completed', 'purchases', v_purchase_id,
    jsonb_build_object(
      'document_number', v_doc_number,
      'total', v_total,
      'warehouse_id', p_warehouse_id,
      'supplier_id', p_supplier_id
    )
  );

  return jsonb_build_object(
    'purchase_id', v_purchase_id,
    'document_number', v_doc_number,
    'subtotal', v_subtotal,
    'tax_total', v_tax_total,
    'total', v_total,
    'created_at', now()
  );
end;$$;

-- 4. RPC TRANSACCIONAL ATÓMICO: create_inventory_adjustment
create or replace function public.create_inventory_adjustment(
  p_company_id uuid,
  p_warehouse_id uuid,
  p_reason text,
  p_items jsonb,
  p_notes text default null,
  p_idempotency_key text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_adj_id uuid;
  v_wh_company uuid;
  v_item jsonb;
  v_prod record;
  v_balance record;
  v_line_qty numeric(14,4);
  v_line_type text;
  v_doc_number text;
  v_existing_adj record;
begin
  if not public.is_company_member(p_company_id) then
    raise exception 'forbidden';
  end if;

  -- Idempotencia
  if p_idempotency_key is not null and trim(p_idempotency_key) <> '' then
    select id, document_number, created_at into v_existing_adj
    from public.inventory_adjustments
    where company_id = p_company_id and idempotency_key = p_idempotency_key;

    if v_existing_adj.id is not null then
      return jsonb_build_object(
        'adjustment_id', v_existing_adj.id,
        'document_number', v_existing_adj.document_number,
        'status', 'completed',
        'created_at', v_existing_adj.created_at,
        'idempotent_replay', true
      );
    end if;
  end if;

  if p_reason is null or trim(p_reason) = '' then
    raise exception 'ADJUSTMENT_REASON_REQUIRED';
  end if;

  select company_id into v_wh_company
  from public.warehouses
  where id = p_warehouse_id and deleted_at is null;

  if v_wh_company is null or v_wh_company <> p_company_id then
    raise exception 'WAREHOUSE_NOT_FOUND';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_ADJUSTMENT_ITEMS';
  end if;

  v_adj_id := gen_random_uuid();
  v_doc_number := 'ADJ-' || to_char(now(), 'YYYYMMDD') || '-' || substr(v_adj_id::text, 1, 6);

  -- Insertar encabezado
  insert into public.inventory_adjustments (
    id,
    company_id,
    warehouse_id,
    document_number,
    reason,
    status,
    idempotency_key,
    notes,
    created_by,
    created_at
  ) values (
    v_adj_id,
    p_company_id,
    p_warehouse_id,
    v_doc_number,
    p_reason,
    'completed',
    p_idempotency_key,
    p_notes,
    auth.uid(),
    now()
  );

  -- Procesar items
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_line_qty := (v_item->>'quantity')::numeric;
    v_line_type := upper(trim(v_item->>'adjustment_type'));

    if v_line_qty is null or v_line_qty <= 0 then
      raise exception 'INVALID_ADJUSTMENT_QUANTITY';
    end if;

    if v_line_type not in ('IN', 'OUT') then
      raise exception 'INVALID_ADJUSTMENT_TYPE';
    end if;

    select id, company_id, name, allows_inventory, cost, is_active
    into v_prod
    from public.products
    where id = (v_item->>'product_id')::uuid and company_id = p_company_id and deleted_at is null;

    if v_prod.id is null then
      raise exception 'PRODUCT_NOT_FOUND';
    end if;

    if not v_prod.allows_inventory then
      raise exception 'PRODUCT_DOES_NOT_ALLOW_INVENTORY';
    end if;

    -- Lock balance
    select id, quantity into v_balance
    from public.inventory_balances
    where company_id = p_company_id and warehouse_id = p_warehouse_id and product_id = v_prod.id
    for update;

    if v_line_type = 'OUT' then
      if v_balance.id is null or v_balance.quantity < v_line_qty then
        raise exception 'INSUFFICIENT_STOCK: % (Disponible: %, Solicitado: %)',
          v_prod.name, coalesce(v_balance.quantity, 0), v_line_qty;
      end if;

      update public.inventory_balances
      set quantity = quantity - v_line_qty, updated_at = now()
      where id = v_balance.id;

      insert into public.inventory_movements (
        company_id, warehouse_id, product_id, movement_type, quantity, unit_cost, reference_type, reference_id, notes, created_by
      ) values (
        p_company_id, p_warehouse_id, v_prod.id, 'OUT_ADJUSTMENT', v_line_qty, v_prod.cost, 'adjustment', v_adj_id,
        coalesce(p_notes, p_reason), auth.uid()
      );
    else
      -- IN adjustment
      insert into public.inventory_balances (company_id, warehouse_id, product_id, quantity, updated_at)
      values (p_company_id, p_warehouse_id, v_prod.id, v_line_qty, now())
      on conflict (company_id, warehouse_id, product_id)
      do update set quantity = inventory_balances.quantity + v_line_qty, updated_at = now();

      insert into public.inventory_movements (
        company_id, warehouse_id, product_id, movement_type, quantity, unit_cost, reference_type, reference_id, notes, created_by
      ) values (
        p_company_id, p_warehouse_id, v_prod.id, 'IN_ADJUSTMENT', v_line_qty, v_prod.cost, 'adjustment', v_adj_id,
        coalesce(p_notes, p_reason), auth.uid()
      );
    end if;

    insert into public.inventory_adjustment_items (
      adjustment_id, product_id, adjustment_type, quantity, unit_cost, notes
    ) values (
      v_adj_id, v_prod.id, v_line_type, v_line_qty, v_prod.cost, v_item->>'notes'
    );
  end loop;

  -- Auditar
  insert into public.audit_logs (
    company_id, actor_user_id, action, entity_type, entity_id, metadata
  ) values (
    p_company_id, auth.uid(), 'inventory.adjusted', 'inventory_adjustments', v_adj_id,
    jsonb_build_object('document_number', v_doc_number, 'reason', p_reason, 'warehouse_id', p_warehouse_id)
  );

  return jsonb_build_object(
    'adjustment_id', v_adj_id,
    'document_number', v_doc_number,
    'warehouse_id', p_warehouse_id,
    'status', 'completed',
    'created_at', now()
  );
end;$$;

-- 5. RPC TRANSACCIONAL ATÓMICO: create_inventory_transfer (Con locking determinista por Warehouse y Product)
create or replace function public.create_inventory_transfer(
  p_company_id uuid,
  p_source_warehouse_id uuid,
  p_destination_warehouse_id uuid,
  p_items jsonb,
  p_notes text default null,
  p_idempotency_key text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_transfer_id uuid;
  v_src_wh record;
  v_dst_wh record;
  v_item jsonb;
  v_prod record;
  v_src_balance record;
  v_line_qty numeric(14,4);
  v_doc_number text;
  v_existing_trf record;
  v_first_wh uuid;
  v_second_wh uuid;
begin
  if not public.is_company_member(p_company_id) then
    raise exception 'forbidden';
  end if;

  -- Idempotencia
  if p_idempotency_key is not null and trim(p_idempotency_key) <> '' then
    select id, document_number, created_at into v_existing_trf
    from public.inventory_transfers
    where company_id = p_company_id and idempotency_key = p_idempotency_key;

    if v_existing_trf.id is not null then
      return jsonb_build_object(
        'transfer_id', v_existing_trf.id,
        'document_number', v_existing_trf.document_number,
        'status', 'completed',
        'created_at', v_existing_trf.created_at,
        'idempotent_replay', true
      );
    end if;
  end if;

  if p_source_warehouse_id = p_destination_warehouse_id then
    raise exception 'SAME_WAREHOUSE_TRANSFER';
  end if;

  -- Validar almacén origen
  select * into v_src_wh
  from public.warehouses
  where id = p_source_warehouse_id and company_id = p_company_id and deleted_at is null;

  if v_src_wh.id is null then
    raise exception 'SOURCE_WAREHOUSE_NOT_FOUND';
  end if;

  -- Validar almacén destino
  select * into v_dst_wh
  from public.warehouses
  where id = p_destination_warehouse_id and company_id = p_company_id and deleted_at is null;

  if v_dst_wh.id is null then
    raise exception 'DESTINATION_WAREHOUSE_NOT_FOUND';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_TRANSFER_ITEMS';
  end if;

  v_transfer_id := gen_random_uuid();
  v_doc_number := 'TRF-' || to_char(now(), 'YYYYMMDD') || '-' || substr(v_transfer_id::text, 1, 6);

  -- Insertar encabezado de transferencia
  insert into public.inventory_transfers (
    id,
    company_id,
    source_warehouse_id,
    destination_warehouse_id,
    document_number,
    status,
    idempotency_key,
    notes,
    created_by,
    created_at
  ) values (
    v_transfer_id,
    p_company_id,
    p_source_warehouse_id,
    p_destination_warehouse_id,
    v_doc_number,
    'completed',
    p_idempotency_key,
    p_notes,
    auth.uid(),
    now()
  );

  -- Determinar orden estricto de almacenes para locking
  if p_source_warehouse_id < p_destination_warehouse_id then
    v_first_wh := p_source_warehouse_id;
    v_second_wh := p_destination_warehouse_id;
  else
    v_first_wh := p_destination_warehouse_id;
    v_second_wh := p_source_warehouse_id;
  end if;

  -- Procesar items con locking determinista por (warehouse, product)
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_line_qty := (v_item->>'quantity')::numeric;

    if v_line_qty is null or v_line_qty <= 0 then
      raise exception 'INVALID_TRANSFER_QUANTITY';
    end if;

    select id, company_id, name, cost, allows_inventory
    into v_prod
    from public.products
    where id = (v_item->>'product_id')::uuid and company_id = p_company_id and deleted_at is null;

    if v_prod.id is null then
      raise exception 'PRODUCT_NOT_FOUND';
    end if;

    if not v_prod.allows_inventory then
      raise exception 'PRODUCT_DOES_NOT_ALLOW_INVENTORY';
    end if;

    -- Bloqueo determinista de filas por (Warehouse, Product) en orden estricto
    perform id from public.inventory_balances
    where company_id = p_company_id and warehouse_id = v_first_wh and product_id = v_prod.id for update;

    perform id from public.inventory_balances
    where company_id = p_company_id and warehouse_id = v_second_wh and product_id = v_prod.id for update;

    -- Validar saldo en origen
    select id, quantity into v_src_balance
    from public.inventory_balances
    where company_id = p_company_id and warehouse_id = p_source_warehouse_id and product_id = v_prod.id;

    if v_src_balance.id is null or v_src_balance.quantity < v_line_qty then
      raise exception 'INSUFFICIENT_STOCK: % en almacén origen (Disponible: %, Solicitado: %)',
        v_prod.name, coalesce(v_src_balance.quantity, 0), v_line_qty;
    end if;

    -- Descontar origen (conserva costo origen)
    update public.inventory_balances
    set quantity = quantity - v_line_qty, updated_at = now()
    where id = v_src_balance.id;

    -- Incrementar destino
    insert into public.inventory_balances (company_id, warehouse_id, product_id, quantity, updated_at)
    values (p_company_id, p_destination_warehouse_id, v_prod.id, v_line_qty, now())
    on conflict (company_id, warehouse_id, product_id)
    do update set quantity = inventory_balances.quantity + v_line_qty, updated_at = now();

    -- Registrar movimiento TRANSFER_OUT en origen
    insert into public.inventory_movements (
      company_id, warehouse_id, product_id, movement_type, quantity, unit_cost, reference_type, reference_id, notes, created_by
    ) values (
      p_company_id, p_source_warehouse_id, v_prod.id, 'TRANSFER_OUT', v_line_qty, v_prod.cost, 'transfer', v_transfer_id,
      'Transferencia a ' || v_dst_wh.name || ' (' || v_doc_number || ')', auth.uid()
    );

    -- Registrar movimiento TRANSFER_IN en destino (conservación exacta de cantidad y costo)
    insert into public.inventory_movements (
      company_id, warehouse_id, product_id, movement_type, quantity, unit_cost, reference_type, reference_id, notes, created_by
    ) values (
      p_company_id, p_destination_warehouse_id, v_prod.id, 'TRANSFER_IN', v_line_qty, v_prod.cost, 'transfer', v_transfer_id,
      'Transferencia desde ' || v_src_wh.name || ' (' || v_doc_number || ')', auth.uid()
    );

    -- Insertar item
    insert into public.inventory_transfer_items (
      transfer_id, product_id, quantity, unit_cost
    ) values (
      v_transfer_id, v_prod.id, v_line_qty, v_prod.cost
    );
  end loop;

  -- Auditar
  insert into public.audit_logs (
    company_id, actor_user_id, action, entity_type, entity_id, metadata
  ) values (
    p_company_id, auth.uid(), 'inventory.transfer.completed', 'inventory_transfers', v_transfer_id,
    jsonb_build_object('document_number', v_doc_number, 'source', p_source_warehouse_id, 'destination', p_destination_warehouse_id)
  );

  return jsonb_build_object(
    'transfer_id', v_transfer_id,
    'document_number', v_doc_number,
    'source_warehouse_id', p_source_warehouse_id,
    'destination_warehouse_id', p_destination_warehouse_id,
    'status', 'completed',
    'created_at', now()
  );
end;$$;

-- 6. RPC: Consulta de Kardex Cronológico
create or replace function public.get_product_kardex(
  p_company_id uuid,
  p_product_id uuid,
  p_warehouse_id uuid default null,
  p_from timestamptz default null,
  p_to timestamptz default null
) returns table (
  movement_id uuid,
  movement_date timestamptz,
  warehouse_id uuid,
  warehouse_name text,
  movement_type text,
  reference_type text,
  reference_id uuid,
  quantity numeric,
  unit_cost numeric,
  notes text,
  user_email text
)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_company_member(p_company_id) then
    raise exception 'forbidden';
  end if;

  return query
  select
    m.id as movement_id,
    m.created_at as movement_date,
    m.warehouse_id,
    w.name as warehouse_name,
    m.movement_type,
    m.reference_type,
    m.reference_id,
    m.quantity,
    m.unit_cost,
    m.notes,
    u.email::text as user_email
  from public.inventory_movements m
  inner join public.warehouses w on w.id = m.warehouse_id
  left join auth.users u on u.id = m.created_by
  where m.company_id = p_company_id
    and m.product_id = p_product_id
    and (p_warehouse_id is null or m.warehouse_id = p_warehouse_id)
    and (p_from is null or m.created_at >= p_from)
    and (p_to is null or m.created_at <= p_to)
  order by m.created_at asc;
end;$$;

-- Permisos de ejecución
revoke all on function public.create_pos_purchase(uuid, uuid, uuid, jsonb, uuid, text, text, date, text, text) from public;
grant execute on function public.create_pos_purchase(uuid, uuid, uuid, jsonb, uuid, text, text, date, text, text) to authenticated;

revoke all on function public.create_inventory_adjustment(uuid, uuid, text, jsonb, text, text) from public;
grant execute on function public.create_inventory_adjustment(uuid, uuid, text, jsonb, text, text) to authenticated;

revoke all on function public.create_inventory_transfer(uuid, uuid, uuid, jsonb, text, text) from public;
grant execute on function public.create_inventory_transfer(uuid, uuid, uuid, jsonb, text, text) to authenticated;

revoke all on function public.get_product_kardex(uuid, uuid, uuid, timestamptz, timestamptz) from public;
grant execute on function public.get_product_kardex(uuid, uuid, uuid, timestamptz, timestamptz) to authenticated;

