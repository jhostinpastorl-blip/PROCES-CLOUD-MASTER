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
