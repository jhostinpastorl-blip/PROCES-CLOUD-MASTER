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
