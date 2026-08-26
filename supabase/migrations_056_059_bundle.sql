-- ============================================================
-- PROCESA CLOUD · FASE 1A · BUNDLE: 056 + 057 + 058 + 059
-- POS CLOUD FOUNDATION MIGRATIONS
-- Copiar y pegar completo en SQL Editor de Supabase
-- ============================================================

-- ========== supabase/migrations/056_pos_catalogs_and_products.sql ==========
-- ===================================================================
-- PROCESA CLOUD · FASE 1A · MIGRATION 056
-- POS Catalogs & Products Foundation
-- ===================================================================

-- 1. Categorías de Productos
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.categories enable row level security;

create policy "categories tenant read" on public.categories
  for select using (public.is_company_member(company_id) and deleted_at is null);

create policy "categories tenant insert" on public.categories
  for insert with check (public.is_company_member(company_id));

create policy "categories tenant update" on public.categories
  for update using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));

create policy "categories tenant delete" on public.categories
  for delete using (public.is_company_member(company_id));

create index if not exists idx_categories_company on public.categories(company_id) where deleted_at is null;

-- 2. Catálogo de Productos y Servicios
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  code text not null,
  sku text,
  barcode text,
  name text not null,
  description text,
  type text not null default 'product' check (type in ('product', 'service')),
  unit text not null default 'NIU',
  price numeric(12,2) not null default 0.00 check (price >= 0),
  cost numeric(12,4) not null default 0.0000 check (cost >= 0),
  tax_type text not null default 'igv_18' check (tax_type in ('igv_18', 'exempt', 'inaffected')),
  allows_inventory boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique(company_id, code)
);

alter table public.products enable row level security;

create policy "products tenant read" on public.products
  for select using (public.is_company_member(company_id) and deleted_at is null);

create policy "products tenant insert" on public.products
  for insert with check (public.is_company_member(company_id));

create policy "products tenant update" on public.products
  for update using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));

create policy "products tenant delete" on public.products
  for delete using (public.is_company_member(company_id));

-- Unique indexes tenant-aware for SKU and Barcode (allowing nulls)
create unique index if not exists idx_products_company_sku on public.products(company_id, sku)
  where sku is not null and sku <> '' and deleted_at is null;

create unique index if not exists idx_products_company_barcode on public.products(company_id, barcode)
  where barcode is not null and barcode <> '' and deleted_at is null;

create index if not exists idx_products_company_category on public.products(company_id, category_id)
  where deleted_at is null;


-- ========== supabase/migrations/057_pos_commercial_entities.sql ==========
-- ===================================================================
-- PROCESA CLOUD · FASE 1A · MIGRATION 057
-- Commercial Entities: Customers & Suppliers Foundation
-- ===================================================================

-- 1. Clientes
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  doc_type text not null default 'DNI' check (doc_type in ('DNI', 'RUC', 'CE', 'PASSPORT', 'OTHER')),
  doc_number text not null,
  name text not null,
  trade_name text,
  email text,
  phone text,
  address text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique(company_id, doc_type, doc_number)
);

alter table public.customers enable row level security;

create policy "customers tenant read" on public.customers
  for select using (public.is_company_member(company_id) and deleted_at is null);

create policy "customers tenant insert" on public.customers
  for insert with check (public.is_company_member(company_id));

create policy "customers tenant update" on public.customers
  for update using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));

create policy "customers tenant delete" on public.customers
  for delete using (public.is_company_member(company_id));

create index if not exists idx_customers_company_doc on public.customers(company_id, doc_number) where deleted_at is null;

-- 2. Proveedores
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  doc_type text not null default 'RUC' check (doc_type in ('RUC', 'DNI', 'OTHER')),
  doc_number text not null,
  name text not null,
  trade_name text,
  contact_name text,
  email text,
  phone text,
  address text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique(company_id, doc_type, doc_number)
);

alter table public.suppliers enable row level security;

create policy "suppliers tenant read" on public.suppliers
  for select using (public.is_company_member(company_id) and deleted_at is null);

create policy "suppliers tenant insert" on public.suppliers
  for insert with check (public.is_company_member(company_id));

create policy "suppliers tenant update" on public.suppliers
  for update using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));

create policy "suppliers tenant delete" on public.suppliers
  for delete using (public.is_company_member(company_id));

create index if not exists idx_suppliers_company_doc on public.suppliers(company_id, doc_number) where deleted_at is null;


-- ========== supabase/migrations/058_pos_inventory_and_cash.sql ==========
-- ===================================================================
-- PROCESA CLOUD · FASE 1A · MIGRATION 058
-- Warehouses, Inventory Balances, Movements & Cash Registers
-- ===================================================================

-- 1. Almacenes
create table if not exists public.warehouses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  code text not null,
  name text not null,
  address text,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique(company_id, code)
);

alter table public.warehouses enable row level security;

create policy "warehouses tenant read" on public.warehouses
  for select using (public.is_company_member(company_id) and deleted_at is null);

create policy "warehouses tenant insert" on public.warehouses
  for insert with check (public.is_company_member(company_id));

create policy "warehouses tenant update" on public.warehouses
  for update using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));

create policy "warehouses tenant delete" on public.warehouses
  for delete using (public.is_company_member(company_id));

create index if not exists idx_warehouses_company on public.warehouses(company_id) where deleted_at is null;

-- 2. Balances de Inventario
create table if not exists public.inventory_balances (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  warehouse_id uuid not null references public.warehouses(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity numeric(14,4) not null default 0.0000 check (quantity >= 0),
  updated_at timestamptz not null default now(),
  unique(company_id, warehouse_id, product_id)
);

alter table public.inventory_balances enable row level security;

create policy "inventory_balances tenant read" on public.inventory_balances
  for select using (public.is_company_member(company_id));

create policy "inventory_balances tenant insert" on public.inventory_balances
  for insert with check (public.is_company_member(company_id));

create policy "inventory_balances tenant update" on public.inventory_balances
  for update using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));

create policy "inventory_balances tenant delete" on public.inventory_balances
  for delete using (public.is_company_member(company_id));

create index if not exists idx_inventory_balances_lookup on public.inventory_balances(company_id, warehouse_id, product_id);

-- 3. Movimientos de Inventario (Kardex Base)
create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  warehouse_id uuid not null references public.warehouses(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  movement_type text not null check (movement_type in ('INITIAL_STOCK', 'IN_ADJUSTMENT', 'OUT_ADJUSTMENT', 'TRANSFER_IN', 'TRANSFER_OUT')),
  quantity numeric(14,4) not null check (quantity > 0),
  unit_cost numeric(12,4) not null default 0.0000,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.inventory_movements enable row level security;

create policy "inventory_movements tenant read" on public.inventory_movements
  for select using (public.is_company_member(company_id));

create policy "inventory_movements tenant insert" on public.inventory_movements
  for insert with check (public.is_company_member(company_id));

create index if not exists idx_inventory_movements_prod on public.inventory_movements(company_id, product_id, created_at desc);

-- 4. RPC para establecer Stock Inicial
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

  if p_quantity <= 0 then
    raise exception 'INVALID_QUANTITY';
  end if;

  -- Validate product belongs to company and allows inventory
  select company_id, allows_inventory into prod_company, prod_allows_inv
  from public.products where id = p_product_id and deleted_at is null;

  if prod_company is null or prod_company <> p_company_id then
    raise exception 'PRODUCT_NOT_FOUND';
  end if;

  if not prod_allows_inv then
    raise exception 'PRODUCT_DOES_NOT_ALLOW_INVENTORY';
  end if;

  -- Validate warehouse belongs to company
  select company_id into wh_company
  from public.warehouses where id = p_warehouse_id and deleted_at is null;

  if wh_company is null or wh_company <> p_company_id then
    raise exception 'WAREHOUSE_NOT_FOUND';
  end if;

  -- Upsert inventory balance
  insert into public.inventory_balances (company_id, warehouse_id, product_id, quantity, updated_at)
  values (p_company_id, p_warehouse_id, p_product_id, p_quantity, now())
  on conflict (company_id, warehouse_id, product_id)
  do update set quantity = p_quantity, updated_at = now();

  -- Record movement
  insert into public.inventory_movements (
    company_id, warehouse_id, product_id, movement_type, quantity, unit_cost, notes, created_by
  ) values (
    p_company_id, p_warehouse_id, p_product_id, 'INITIAL_STOCK', p_quantity, coalesce(p_unit_cost, 0), coalesce(p_notes, 'Stock inicial'), auth.uid()
  );
end;$$;

revoke all on function public.set_initial_stock(uuid, uuid, uuid, numeric, numeric, text) from public;
grant execute on function public.set_initial_stock(uuid, uuid, uuid, numeric, numeric, text) to authenticated;

-- 5. Cajas (Cash Registers)
create table if not exists public.cash_registers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  code text not null,
  name text not null,
  status text not null default 'closed' check (status in ('closed', 'open', 'inactive')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique(company_id, branch_id, code)
);

alter table public.cash_registers enable row level security;

create policy "cash_registers tenant read" on public.cash_registers
  for select using (public.is_company_member(company_id) and deleted_at is null);

create policy "cash_registers tenant insert" on public.cash_registers
  for insert with check (public.is_company_member(company_id));

create policy "cash_registers tenant update" on public.cash_registers
  for update using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));

create policy "cash_registers tenant delete" on public.cash_registers
  for delete using (public.is_company_member(company_id));

create index if not exists idx_cash_registers_branch on public.cash_registers(company_id, branch_id) where deleted_at is null;


-- ========== supabase/migrations/059_pos_permissions_seed.sql ==========
-- ===================================================================
-- PROCESA CLOUD · FASE 1A · MIGRATION 059
-- POS Permission Catalog & Seed
-- ===================================================================

insert into public.permissions (code, description) values
  ('pos.products.read', 'Permite consultar el catálogo de productos y servicios'),
  ('pos.products.manage', 'Permite crear, editar y desactivar productos y servicios'),
  ('pos.categories.read', 'Permite consultar las categorías de productos'),
  ('pos.categories.manage', 'Permite crear y editar categorías de productos'),
  ('pos.customers.read', 'Permite consultar el directorio de clientes'),
  ('pos.customers.manage', 'Permite crear y editar clientes'),
  ('pos.suppliers.read', 'Permite consultar el directorio de proveedores'),
  ('pos.suppliers.manage', 'Permite crear y editar proveedores'),
  ('pos.warehouses.read', 'Permite consultar los almacenes de la empresa'),
  ('pos.warehouses.manage', 'Permite crear y editar almacenes'),
  ('pos.inventory.read', 'Permite consultar el stock y balances de inventario'),
  ('pos.inventory.manage', 'Permite establecer stock inicial y ajustes de inventario'),
  ('pos.cash_registers.read', 'Permite consultar las cajas de las sucursales'),
  ('pos.cash_registers.manage', 'Permite crear y configurar cajas registradoras')
on conflict (code) do nothing;

-- Asignar automáticamente los nuevos permisos POS a los roles de Administrador de sistema
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.is_system = true and r.name = 'Administrador'
  and p.code like 'pos.%'
on conflict do nothing;

