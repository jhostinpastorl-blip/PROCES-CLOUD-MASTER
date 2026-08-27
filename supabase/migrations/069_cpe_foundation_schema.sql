-- ===================================================================
-- PROCESA CLOUD · FASE 1F · MIGRATION 069
-- ELECTRONIC INVOICING / SUNAT CPE FOUNDATION SCHEMA
-- Factura (01), Boleta (03), Nota de Crédito (07), Nota de Débito (08)
-- ===================================================================

-- 1. Perfil Tributario de Empresa (Fiscal Identity & Settings)
create table if not exists public.company_fiscal_profiles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade unique,
  ruc text not null check (length(ruc) = 11),
  legal_name text not null,
  trade_name text,
  fiscal_address text not null,
  ubigeo text default '150101',
  department text default 'LIMA',
  province text default 'LIMA',
  district text default 'LIMA',
  urbanization text,
  cpe_environment text not null default 'beta' check (cpe_environment in ('beta', 'production')),
  cpe_transport_provider text not null default 'mock' check (cpe_transport_provider in ('mock', 'beta_sunat', 'sunat_soap', 'ose')),
  cpe_sol_user text,
  cpe_sol_pass text,
  certificate_configured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.company_fiscal_profiles enable row level security;

create policy "company_fiscal_profiles tenant read" on public.company_fiscal_profiles
  for select using (public.is_company_member(company_id));

create policy "company_fiscal_profiles tenant insert" on public.company_fiscal_profiles
  for insert with check (public.is_company_member(company_id));

create policy "company_fiscal_profiles tenant update" on public.company_fiscal_profiles
  for update using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));

create policy "company_fiscal_profiles tenant delete" on public.company_fiscal_profiles
  for delete using (public.is_company_member(company_id));

create index if not exists idx_fiscal_profiles_company on public.company_fiscal_profiles(company_id);

-- 2. Series Fiscales de Comprobantes (Series & Correlative Counter)
create table if not exists public.tax_document_series (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  document_type text not null check (document_type in ('01', '03', '07', '08')),
  series text not null check (length(series) = 4),
  current_number int not null default 0 check (current_number >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, document_type, series)
);

-- Validación de formato de series según normativa SUNAT:
-- 01 (Factura): Inicia con 'F' (F001 - F999 o FAAA - FZZZ)
-- 03 (Boleta): Inicia con 'B' (B001 - B999 o BAAA - BZZZ)
-- 07 (Nota de Crédito): Inicia con 'F' o 'B' (FC01, BC01, FN01, BN01, F001, B001)
-- 08 (Nota de Débito): Inicia con 'F' o 'B' (FD01, BD01, F001, B001)
alter table public.tax_document_series add constraint chk_series_prefix check (
  (document_type = '01' and series ~ '^F[A-Z0-9]{3}$') or
  (document_type = '03' and series ~ '^B[A-Z0-9]{3}$') or
  (document_type in ('07', '08') and series ~ '^(F|B)[A-Z0-9]{3}$')
);

alter table public.tax_document_series enable row level security;

create policy "tax_document_series tenant read" on public.tax_document_series
  for select using (public.is_company_member(company_id));

create policy "tax_document_series tenant insert" on public.tax_document_series
  for insert with check (public.is_company_member(company_id));

create policy "tax_document_series tenant update" on public.tax_document_series
  for update using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));

create policy "tax_document_series tenant delete" on public.tax_document_series
  for delete using (public.is_company_member(company_id));

create index if not exists idx_tax_series_company_type on public.tax_document_series(company_id, document_type, is_active);

-- 3. Documentos Tributarios Electrónicos (Electronic Documents / CPE)
create table if not exists public.electronic_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  
  -- Origen comercial independiente
  source_type text not null default 'sale' check (source_type in ('sale', 'sale_return', 'manual')),
  source_id uuid,
  
  -- Identificación fiscal
  document_type text not null check (document_type in ('01', '03', '07', '08')),
  series text not null,
  number int not null check (number > 0),
  issue_date date not null default current_date,
  issue_time time not null default current_time,
  due_date date,
  currency text not null default 'PEN',
  
  -- Snapshot de Emisor
  issuer_ruc text not null,
  issuer_legal_name text not null,
  issuer_trade_name text,
  issuer_address text not null,
  issuer_ubigeo text,
  
  -- Snapshot de Adquirente / Cliente
  customer_id uuid references public.customers(id) on delete set null,
  customer_doc_type text not null check (customer_doc_type in ('6', '1', '4', '7', '0', '-')),
  customer_doc_number text not null,
  customer_name text not null,
  customer_address text,
  customer_email text,
  
  -- Referencia a Documento Original (para Notas de Crédito / Débito)
  referenced_document_id uuid references public.electronic_documents(id) on delete restrict,
  referenced_document_type text check (referenced_document_type in ('01', '03')),
  referenced_series text,
  referenced_number int,
  discrepancy_code text,
  discrepancy_reason text,
  
  -- Desglose Financiero y Tributario
  taxable_amount numeric(12,2) not null default 0.00 check (taxable_amount >= 0),
  exonerated_amount numeric(12,2) not null default 0.00 check (exonerated_amount >= 0),
  unaffected_amount numeric(12,2) not null default 0.00 check (unaffected_amount >= 0),
  igv_amount numeric(12,2) not null default 0.00 check (igv_amount >= 0),
  icbper_amount numeric(12,2) not null default 0.00 check (icbper_amount >= 0),
  subtotal numeric(12,2) not null default 0.00 check (subtotal >= 0),
  tax_total numeric(12,2) not null default 0.00 check (tax_total >= 0),
  total numeric(12,2) not null check (total >= 0),
  
  -- Ciclo de Vida y Estados
  status text not null default 'draft' check (status in ('draft', 'generated', 'signed', 'queued', 'submitted', 'accepted', 'accepted_with_observations', 'rejected', 'error', 'void_requested')),
  idempotency_key text,
  
  -- Integridad XML & Firma
  xml_hash text,
  xml_content text,
  signed_xml_content text,
  signed_xml_hash text,
  qr_data text,
  environment text not null default 'beta' check (environment in ('beta', 'production')),
  
  -- Transporte y CDR
  transport_provider text default 'mock',
  sunat_ticket text,
  cdr_status text check (cdr_status in ('0', 'accepted', 'rejected', 'observed', 'pending')),
  cdr_code text,
  cdr_description text,
  cdr_notes text[] default '{}',
  cdr_raw text,
  cdr_received_at timestamptz,
  
  -- Reintentos y Auditoría
  submission_attempts int not null default 0,
  last_error_code text,
  last_error_message text,
  last_submitted_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  unique(company_id, document_type, series, number),
  unique(company_id, idempotency_key)
);

alter table public.electronic_documents enable row level security;

create policy "electronic_documents tenant read" on public.electronic_documents
  for select using (public.is_company_member(company_id));

create policy "electronic_documents tenant insert" on public.electronic_documents
  for insert with check (public.is_company_member(company_id));

create policy "electronic_documents tenant update" on public.electronic_documents
  for update using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));

create policy "electronic_documents tenant delete" on public.electronic_documents
  for delete using (public.is_company_member(company_id));

create index if not exists idx_cpe_company_created on public.electronic_documents(company_id, created_at desc);
create index if not exists idx_cpe_company_type_series on public.electronic_documents(company_id, document_type, series, number);
create index if not exists idx_cpe_source on public.electronic_documents(company_id, source_type, source_id);
create index if not exists idx_cpe_status on public.electronic_documents(company_id, status);
create index if not exists idx_cpe_referenced on public.electronic_documents(referenced_document_id);

-- 4. Ítems del Documento Tributario (CPE Items Snapshot)
create table if not exists public.electronic_document_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  document_id uuid not null references public.electronic_documents(id) on delete cascade,
  item_order int not null check (item_order > 0),
  product_id uuid references public.products(id) on delete set null,
  sku text,
  product_name text not null,
  unit_code text not null default 'NIU',
  quantity numeric(14,4) not null check (quantity > 0),
  unit_value numeric(14,4) not null check (unit_value >= 0),
  unit_price numeric(14,4) not null check (unit_price >= 0),
  tax_category text not null default '10' check (tax_category in ('10', '20', '30', '40')),
  igv_rate numeric(6,4) not null default 0.1800,
  igv_amount numeric(12,2) not null default 0.00 check (igv_amount >= 0),
  line_subtotal numeric(12,2) not null check (line_subtotal >= 0),
  line_total numeric(12,2) not null check (line_total >= 0),
  created_at timestamptz not null default now(),
  unique(document_id, item_order)
);

alter table public.electronic_document_items enable row level security;

create policy "cpe_items tenant read" on public.electronic_document_items
  for select using (public.is_company_member(company_id));

create policy "cpe_items tenant insert" on public.electronic_document_items
  for insert with check (public.is_company_member(company_id));

create policy "cpe_items tenant update" on public.electronic_document_items
  for update using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));

create policy "cpe_items tenant delete" on public.electronic_document_items
  for delete using (public.is_company_member(company_id));

create index if not exists idx_cpe_items_doc on public.electronic_document_items(document_id);
create index if not exists idx_cpe_items_prod on public.electronic_document_items(company_id, product_id);

-- 5. Resúmenes Diarios de Boletas (Daily Summary Foundation)
create table if not exists public.cpe_daily_summaries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  reference_date date not null,
  summary_date date not null default current_date,
  identifier text not null,
  status text not null default 'draft' check (status in ('draft', 'generated', 'signed', 'submitted', 'accepted', 'rejected', 'error')),
  ticket text,
  cdr_code text,
  cdr_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, identifier)
);

alter table public.cpe_daily_summaries enable row level security;

create policy "cpe_daily_summaries tenant read" on public.cpe_daily_summaries
  for select using (public.is_company_member(company_id));

create policy "cpe_daily_summaries tenant insert" on public.cpe_daily_summaries
  for insert with check (public.is_company_member(company_id));

create policy "cpe_daily_summaries tenant update" on public.cpe_daily_summaries
  for update using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));

create policy "cpe_daily_summaries tenant delete" on public.cpe_daily_summaries
  for delete using (public.is_company_member(company_id));

-- 6. Triggers de Inmutabilidad Fiscal
create or replace function public.trg_check_cpe_immutability()
returns trigger
language plpgsql security definer as $$
begin
  if old.status in ('signed', 'queued', 'submitted', 'accepted', 'accepted_with_observations') then
    if (old.total <> new.total or
        old.subtotal <> new.subtotal or
        old.tax_total <> new.tax_total or
        old.series <> new.series or
        old.number <> new.number or
        old.document_type <> new.document_type or
        old.customer_doc_number <> new.customer_doc_number or
        (old.signed_xml_hash is not null and new.signed_xml_hash is not null and old.signed_xml_hash <> new.signed_xml_hash)) then
      raise exception 'CANNOT_MUTATE_SIGNED_OR_SUBMITTED_CPE';
    end if;
  end if;
  return new;
end;$$;

drop trigger if exists trg_cpe_immutability on public.electronic_documents;
create trigger trg_cpe_immutability
  before update on public.electronic_documents
  for each row execute function public.trg_check_cpe_immutability();

create or replace function public.trg_prevent_cpe_delete()
returns trigger
language plpgsql security definer as $$
begin
  if old.status in ('signed', 'queued', 'submitted', 'accepted', 'accepted_with_observations') then
    raise exception 'CANNOT_DELETE_OFFICIAL_CPE';
  end if;
  return old;
end;$$;

drop trigger if exists trg_cpe_no_delete on public.electronic_documents;
create trigger trg_cpe_no_delete
  before delete on public.electronic_documents
  for each row execute function public.trg_prevent_cpe_delete();
