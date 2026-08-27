-- ===================================================================
-- PROCESA CLOUD · FASE 1E · MIGRATION 067
-- POS Reporting Schema, Min Stock, Performance Indexes & Permissions
-- ===================================================================

-- 1. Soporte de Stock Mínimo (Foundation Operativo)
alter table public.products 
  add column if not exists min_stock numeric(14,4) default 0.0000 check (min_stock >= 0);

alter table public.inventory_balances 
  add column if not exists min_stock numeric(14,4) default 0.0000 check (min_stock >= 0);

-- 2. Índices de Rendimiento para Consultas Analíticas y Filtros
create index if not exists idx_sales_company_created 
  on public.sales(company_id, created_at desc);

create index if not exists idx_sales_company_branch_created 
  on public.sales(company_id, branch_id, created_at desc);

create index if not exists idx_sales_company_status_created 
  on public.sales(company_id, status, created_at desc);

create index if not exists idx_sale_items_sale_prod 
  on public.sale_items(sale_id, product_id);

create index if not exists idx_sale_returns_company_created 
  on public.sale_returns(company_id, created_at desc);

create index if not exists idx_sale_returns_company_sale 
  on public.sale_returns(company_id, sale_id);

create index if not exists idx_purchases_company_created 
  on public.purchases(company_id, created_at desc);

create index if not exists idx_purchases_company_branch_created 
  on public.purchases(company_id, branch_id, created_at desc);

create index if not exists idx_purchase_returns_company_created 
  on public.purchase_returns(company_id, created_at desc);

create index if not exists idx_cash_sessions_company_opened 
  on public.cash_sessions(company_id, opened_at desc);

create index if not exists idx_cash_sessions_company_branch_opened 
  on public.cash_sessions(company_id, branch_id, opened_at desc);

create index if not exists idx_cash_movements_session_type 
  on public.cash_movements(cash_session_id, movement_type);

create index if not exists idx_inventory_movements_wh_prod_created 
  on public.inventory_movements(company_id, warehouse_id, product_id, created_at desc);

-- 3. Catálogo de Permisos FASE 1E
insert into public.permissions (code, description) values
  ('pos.reports.sales', 'Permite consultar reportes y analíticas de ventas'),
  ('pos.reports.cash', 'Permite consultar reportes y arqueos de caja'),
  ('pos.reports.inventory', 'Permite consultar reportes de inventario y stock'),
  ('pos.reports.purchases', 'Permite consultar reportes de compras y proveedores'),
  ('pos.reports.cost', 'Permite visualizar costos de productos y valorización en reportes'),
  ('pos.cash_sessions.x_report', 'Permite emitir reporte X de corte parcial de caja'),
  ('pos.cash_sessions.z_report', 'Permite emitir reporte Z de cierre de turno de caja')
on conflict (code) do nothing;

-- Asignar permisos al rol Administrador
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.is_system = true and r.name = 'Administrador'
  and p.code in (
    'pos.reports.sales',
    'pos.reports.cash',
    'pos.reports.inventory',
    'pos.reports.purchases',
    'pos.reports.cost',
    'pos.cash_sessions.x_report',
    'pos.cash_sessions.z_report'
  )
on conflict do nothing;
