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
