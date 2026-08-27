-- ============================================================
-- PROCESA CLOUD · FASE 1E · BUNDLE: 067 + 068
-- POS REPORTING, CASH CONTROL & OPERATIONAL ANALYTICS
-- ============================================================

-- ========== supabase/migrations/067_pos_reporting_schema.sql ==========
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


-- ========== supabase/migrations/068_pos_reporting_rpcs.sql ==========
-- ===================================================================
-- PROCESA CLOUD · FASE 1E · MIGRATION 068
-- POS Reporting, Cash Control & Operational Analytics RPCs
-- ===================================================================

-- 0. Limpiar funciones previas
drop function if exists public.get_x_report(uuid, uuid) cascade;
drop function if exists public.get_z_report(uuid, uuid) cascade;
drop function if exists public.get_pos_sales_report(uuid, timestamptz, timestamptz, uuid, uuid, uuid, uuid, text, uuid, uuid) cascade;
drop function if exists public.get_pos_product_report(uuid, timestamptz, timestamptz, uuid, uuid) cascade;
drop function if exists public.get_pos_cash_report(uuid, timestamptz, timestamptz, uuid, uuid, uuid, text, int, int) cascade;
drop function if exists public.get_pos_purchases_report(uuid, timestamptz, timestamptz, uuid, uuid, uuid) cascade;
drop function if exists public.get_pos_inventory_report(uuid, uuid, uuid, text, boolean) cascade;
drop function if exists public.get_pos_dashboard_kpis(uuid, uuid, date, text) cascade;

-- 1. RPC: get_x_report (Corte Parcial de Caja Informativo / Read-Only)
create or replace function public.get_x_report(
  p_company_id uuid,
  p_cash_session_id uuid
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_session record;
  v_register record;
  v_branch record;
  v_user_profile record;
  
  v_gross_sales numeric(12,2) := 0.00;
  v_voided_sales numeric(12,2) := 0.00;
  v_sales_count int := 0;
  v_voids_count int := 0;
  
  v_cash_sales numeric(12,2) := 0.00;
  v_card_sales numeric(12,2) := 0.00;
  v_transfer_sales numeric(12,2) := 0.00;
  v_digital_sales numeric(12,2) := 0.00;
  
  v_cash_refunds numeric(12,2) := 0.00;
  v_other_refunds numeric(12,2) := 0.00;
  v_returns_count int := 0;
  v_total_refunds numeric(12,2) := 0.00;
  v_net_sales numeric(12,2) := 0.00;
  v_calculated_expected_cash numeric(12,2) := 0.00;
begin
  if not public.is_company_member(p_company_id) then
    raise exception 'forbidden';
  end if;

  select * into v_session
  from public.cash_sessions
  where id = p_cash_session_id and company_id = p_company_id;

  if v_session.id is null then
    raise exception 'CASH_SESSION_NOT_FOUND';
  end if;

  select * into v_register from public.cash_registers where id = v_session.cash_register_id;
  select * into v_branch from public.branches where id = v_session.branch_id;
  select * into v_user_profile from public.profiles where id = v_session.user_id;

  -- 1. Ventas brutas y no anuladas en la sesión
  select 
    coalesce(sum(case when status <> 'voided' then total else 0.00 end), 0.00),
    coalesce(sum(case when status = 'voided' then total else 0.00 end), 0.00),
    count(*) filter (where status <> 'voided'),
    count(*) filter (where status = 'voided')
  into v_gross_sales, v_voided_sales, v_sales_count, v_voids_count
  from public.sales
  where company_id = p_company_id and cash_session_id = p_cash_session_id;

  -- 2. Pagos por medio de pago (solo ventas no anuladas)
  select
    coalesce(sum(case when sp.payment_method = 'cash' then sp.amount else 0.00 end), 0.00),
    coalesce(sum(case when sp.payment_method = 'card' then sp.amount else 0.00 end), 0.00),
    coalesce(sum(case when sp.payment_method = 'transfer' then sp.amount else 0.00 end), 0.00),
    coalesce(sum(case when sp.payment_method = 'digital' then sp.amount else 0.00 end), 0.00)
  into v_cash_sales, v_card_sales, v_transfer_sales, v_digital_sales
  from public.sale_payments sp
  join public.sales s on s.id = sp.sale_id
  where s.company_id = p_company_id and s.cash_session_id = p_cash_session_id and s.status <> 'voided';

  -- 3. Reembolsos por devoluciones (excluyendo voids para balancear con ventas no anuladas)
  select 
    coalesce(sum(case when sr.payment_method = 'cash' then sr.amount else 0.00 end), 0.00),
    coalesce(sum(case when sr.payment_method <> 'cash' then sr.amount else 0.00 end), 0.00),
    count(*)
  into v_cash_refunds, v_other_refunds, v_returns_count
  from public.sale_refunds sr
  join public.sale_returns ret on ret.id = sr.sale_return_id
  where sr.company_id = p_company_id and sr.cash_session_id = p_cash_session_id and ret.return_type <> 'void';

  v_total_refunds := v_cash_refunds + v_other_refunds;
  v_net_sales := v_gross_sales - v_total_refunds;
  v_calculated_expected_cash := v_session.opening_amount + v_cash_sales - v_cash_refunds;

  return jsonb_build_object(
    'report_type', 'X_REPORT',
    'generated_at', now(),
    'session_id', v_session.id,
    'session_status', v_session.status,
    'branch', jsonb_build_object('id', v_branch.id, 'name', v_branch.name, 'code', v_branch.code),
    'cash_register', jsonb_build_object('id', v_register.id, 'name', v_register.name, 'code', v_register.code),
    'operator', jsonb_build_object('id', v_session.user_id, 'full_name', v_user_profile.full_name),
    'opened_at', v_session.opened_at,
    'opening_amount', v_session.opening_amount,
    'gross_sales', v_gross_sales,
    'voided_sales', v_voided_sales,
    'returns_amount', v_total_refunds,
    'net_sales', v_net_sales,
    'sales_count', v_sales_count,
    'voids_count', v_voids_count,
    'returns_count', v_returns_count,
    'payments_breakdown', jsonb_build_object(
      'cash', v_cash_sales,
      'card', v_card_sales,
      'transfer', v_transfer_sales,
      'digital', v_digital_sales
    ),
    'refunds_breakdown', jsonb_build_object(
      'cash_refunds', v_cash_refunds,
      'other_refunds', v_other_refunds,
      'total_refunds', v_total_refunds
    ),
    'cash_summary', jsonb_build_object(
      'opening_amount', v_session.opening_amount,
      'cash_sales', v_cash_sales,
      'cash_refunds', v_cash_refunds,
      'expected_cash', coalesce(v_session.expected_cash, v_calculated_expected_cash),
      'calculated_expected_cash', v_calculated_expected_cash
    ),
    'is_closed', (v_session.status = 'closed')
  );
end;$$;

-- 2. RPC: get_z_report (Cierre Consolidado de Turno / Snapshot Inmutable)
create or replace function public.get_z_report(
  p_company_id uuid,
  p_cash_session_id uuid
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_session record;
  v_x_report jsonb;
begin
  if not public.is_company_member(p_company_id) then
    raise exception 'forbidden';
  end if;

  select * into v_session
  from public.cash_sessions
  where id = p_cash_session_id and company_id = p_company_id;

  if v_session.id is null then
    raise exception 'CASH_SESSION_NOT_FOUND';
  end if;

  if v_session.status <> 'closed' then
    raise exception 'CASH_SESSION_NOT_CLOSED';
  end if;

  -- Obtener base del reporte X
  v_x_report := public.get_x_report(p_company_id, p_cash_session_id);

  -- Extender con datos de cierre definitivos (snapshot determinista e inmutable)
  return v_x_report || jsonb_build_object(
    'report_type', 'Z_REPORT',
    'generated_at', v_session.closed_at,
    'closed_at', v_session.closed_at,
    'declared_cash', v_session.declared_cash,
    'difference', v_session.difference,
    'difference_type', case 
      when v_session.difference > 0 then 'sobrante'
      when v_session.difference < 0 then 'faltante'
      else 'cuadrado'
    end,
    'notes', v_session.notes,
    'is_authoritative_closure', true
  );
end;$$;

-- 3. RPC: get_pos_sales_report (Reporte Analítico Integral de Ventas)
create or replace function public.get_pos_sales_report(
  p_company_id uuid,
  p_start_date timestamptz default null,
  p_end_date timestamptz default null,
  p_branch_id uuid default null,
  p_cash_register_id uuid default null,
  p_user_id uuid default null,
  p_customer_id uuid default null,
  p_payment_method text default null,
  p_product_id uuid default null,
  p_category_id uuid default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_gross_sales numeric(12,2) := 0.00;
  v_voided_sales numeric(12,2) := 0.00;
  v_sales_count int := 0;
  v_voids_count int := 0;
  v_items_sold_count numeric(14,4) := 0.0000;
  
  v_returned_amount numeric(12,2) := 0.00;
  v_returns_count int := 0;
  v_net_sales numeric(12,2) := 0.00;
  v_avg_ticket numeric(12,2) := 0.00;
  
  v_cash_total numeric(12,2) := 0.00;
  v_card_total numeric(12,2) := 0.00;
  v_transfer_total numeric(12,2) := 0.00;
  v_digital_total numeric(12,2) := 0.00;
  
  v_by_branch jsonb := '[]'::jsonb;
  v_by_cashier jsonb := '[]'::jsonb;
  v_by_payment jsonb := '[]'::jsonb;
  v_daily_trend jsonb := '[]'::jsonb;
begin
  if not public.is_company_member(p_company_id) then
    raise exception 'forbidden';
  end if;

  -- 1. Totales de Ventas
  select
    coalesce(sum(case when s.status <> 'voided' then s.total else 0.00 end), 0.00),
    coalesce(sum(case when s.status = 'voided' then s.total else 0.00 end), 0.00),
    count(*) filter (where s.status <> 'voided'),
    count(*) filter (where s.status = 'voided')
  into v_gross_sales, v_voided_sales, v_sales_count, v_voids_count
  from public.sales s
  where s.company_id = p_company_id
    and (p_start_date is null or s.created_at >= p_start_date)
    and (p_end_date is null or s.created_at <= p_end_date)
    and (p_branch_id is null or s.branch_id = p_branch_id)
    and (p_cash_register_id is null or s.cash_register_id = p_cash_register_id)
    and (p_user_id is null or s.created_by = p_user_id)
    and (p_customer_id is null or s.customer_id = p_customer_id)
    and (p_product_id is null or exists (select 1 from public.sale_items si where si.sale_id = s.id and si.product_id = p_product_id))
    and (p_category_id is null or exists (select 1 from public.sale_items si join public.products p on p.id = si.product_id where si.sale_id = s.id and p.category_id = p_category_id))
    and (p_payment_method is null or exists (select 1 from public.sale_payments sp where sp.sale_id = s.id and sp.payment_method = p_payment_method));

  -- 2. Cantidad de ítems físicos y servicios vendidos
  select coalesce(sum(si.quantity), 0.0000)
  into v_items_sold_count
  from public.sale_items si
  join public.sales s on s.id = si.sale_id
  where s.company_id = p_company_id and s.status <> 'voided'
    and (p_start_date is null or s.created_at >= p_start_date)
    and (p_end_date is null or s.created_at <= p_end_date)
    and (p_branch_id is null or s.branch_id = p_branch_id)
    and (p_cash_register_id is null or s.cash_register_id = p_cash_register_id)
    and (p_user_id is null or s.created_by = p_user_id)
    and (p_customer_id is null or s.customer_id = p_customer_id)
    and (p_product_id is null or si.product_id = p_product_id)
    and (p_category_id is null or exists (select 1 from public.products p where p.id = si.product_id and p.category_id = p_category_id));

  -- 3. Devoluciones en el período (excluyendo voids para reflejar devoluciones reales de clientes)
  select
    coalesce(sum(sr.refund_total), 0.00),
    count(*)
  into v_returned_amount, v_returns_count
  from public.sale_returns sr
  where sr.company_id = p_company_id and sr.status = 'completed' and sr.return_type <> 'void'
    and (p_start_date is null or sr.created_at >= p_start_date)
    and (p_end_date is null or sr.created_at <= p_end_date)
    and (p_branch_id is null or sr.branch_id = p_branch_id)
    and (p_user_id is null or sr.created_by = p_user_id);

  v_net_sales := v_gross_sales - v_returned_amount;
  if v_sales_count > 0 then
    v_avg_ticket := round(v_net_sales / v_sales_count, 2);
  else
    v_avg_ticket := 0.00;
  end if;

  -- 4. Medios de Pago
  select
    coalesce(sum(case when sp.payment_method = 'cash' then sp.amount else 0.00 end), 0.00),
    coalesce(sum(case when sp.payment_method = 'card' then sp.amount else 0.00 end), 0.00),
    coalesce(sum(case when sp.payment_method = 'transfer' then sp.amount else 0.00 end), 0.00),
    coalesce(sum(case when sp.payment_method = 'digital' then sp.amount else 0.00 end), 0.00)
  into v_cash_total, v_card_total, v_transfer_total, v_digital_total
  from public.sale_payments sp
  join public.sales s on s.id = sp.sale_id
  where s.company_id = p_company_id and s.status <> 'voided'
    and (p_start_date is null or s.created_at >= p_start_date)
    and (p_end_date is null or s.created_at <= p_end_date)
    and (p_branch_id is null or s.branch_id = p_branch_id)
    and (p_cash_register_id is null or s.cash_register_id = p_cash_register_id)
    and (p_user_id is null or s.created_by = p_user_id);

  -- 5. Agrupación por Sucursal
  select coalesce(jsonb_agg(b_row), '[]'::jsonb) into v_by_branch
  from (
    select 
      b.id as branch_id,
      b.name as branch_name,
      b.code as branch_code,
      coalesce(sum(case when s.status <> 'voided' then s.total else 0.00 end), 0.00) as gross_sales,
      count(s.id) filter (where s.status <> 'voided') as sales_count
    from public.branches b
    left join public.sales s on s.branch_id = b.id and s.company_id = p_company_id
      and (p_start_date is null or s.created_at >= p_start_date)
      and (p_end_date is null or s.created_at <= p_end_date)
    where b.company_id = p_company_id
    group by b.id, b.name, b.code
    order by gross_sales desc
  ) b_row;

  -- 6. Agrupación por Cajero / Usuario
  select coalesce(jsonb_agg(u_row), '[]'::jsonb) into v_by_cashier
  from (
    select
      p.id as user_id,
      p.full_name as user_name,
      coalesce(sum(case when s.status <> 'voided' then s.total else 0.00 end), 0.00) as gross_sales,
      count(s.id) filter (where s.status <> 'voided') as sales_count
    from public.sales s
    join public.profiles p on p.id = s.created_by
    where s.company_id = p_company_id
      and (p_start_date is null or s.created_at >= p_start_date)
      and (p_end_date is null or s.created_at <= p_end_date)
      and (p_branch_id is null or s.branch_id = p_branch_id)
    group by p.id, p.full_name
    order by gross_sales desc
  ) u_row;

  return jsonb_build_object(
    'gross_sales', v_gross_sales,
    'voided_sales', v_voided_sales,
    'returned_amount', v_returned_amount,
    'net_sales', v_net_sales,
    'transaction_count', v_sales_count,
    'void_count', v_voids_count,
    'return_count', v_returns_count,
    'items_sold_count', v_items_sold_count,
    'average_ticket', v_avg_ticket,
    'payment_methods', jsonb_build_object(
      'cash', v_cash_total,
      'card', v_card_total,
      'transfer', v_transfer_total,
      'digital', v_digital_total
    ),
    'by_branch', v_by_branch,
    'by_cashier', v_by_cashier
  );
end;$$;

-- 4. RPC: get_pos_product_report (Desempeño de Productos y Categorías)
create or replace function public.get_pos_product_report(
  p_company_id uuid,
  p_start_date timestamptz default null,
  p_end_date timestamptz default null,
  p_branch_id uuid default null,
  p_category_id uuid default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_products jsonb := '[]'::jsonb;
begin
  if not public.is_company_member(p_company_id) then
    raise exception 'forbidden';
  end if;

  select coalesce(jsonb_agg(p_row), '[]'::jsonb) into v_products
  from (
    select
      p.id as product_id,
      p.name as product_name,
      p.sku as sku,
      p.code as code,
      coalesce(c.name, 'Sin Categoría') as category_name,
      p.allows_inventory,
      p.is_active,
      coalesce(sum(case when s.id is not null then si.quantity else 0.0000 end), 0.0000) as quantity_sold,
      coalesce((
        select sum(sri.quantity)
        from public.sale_return_items sri
        join public.sale_returns sr on sr.id = sri.sale_return_id
        where sri.product_id = p.id and sr.company_id = p_company_id and sr.status = 'completed' and sr.return_type <> 'void'
          and (p_start_date is null or sr.created_at >= p_start_date)
          and (p_end_date is null or sr.created_at <= p_end_date)
          and (p_branch_id is null or sr.branch_id = p_branch_id)
      ), 0.0000) as quantity_returned,
      (
        coalesce(sum(case when s.id is not null then si.quantity else 0.0000 end), 0.0000) - 
        coalesce((
          select sum(sri.quantity)
          from public.sale_return_items sri
          join public.sale_returns sr on sr.id = sri.sale_return_id
          where sri.product_id = p.id and sr.company_id = p_company_id and sr.status = 'completed' and sr.return_type <> 'void'
            and (p_start_date is null or sr.created_at >= p_start_date)
            and (p_end_date is null or sr.created_at <= p_end_date)
            and (p_branch_id is null or sr.branch_id = p_branch_id)
        ), 0.0000)
      ) as net_quantity,
      coalesce(sum(case when s.id is not null then si.line_total else 0.00 end), 0.00) as gross_revenue,
      coalesce((
        select sum(sri.line_refund_total)
        from public.sale_return_items sri
        join public.sale_returns sr on sr.id = sri.sale_return_id
        where sri.product_id = p.id and sr.company_id = p_company_id and sr.status = 'completed' and sr.return_type <> 'void'
          and (p_start_date is null or sr.created_at >= p_start_date)
          and (p_end_date is null or sr.created_at <= p_end_date)
          and (p_branch_id is null or sr.branch_id = p_branch_id)
      ), 0.00) as returns_amount,
      (
        coalesce(sum(case when s.id is not null then si.line_total else 0.00 end), 0.00) - 
        coalesce((
          select sum(sri.line_refund_total)
          from public.sale_return_items sri
          join public.sale_returns sr on sr.id = sri.sale_return_id
          where sri.product_id = p.id and sr.company_id = p_company_id and sr.status = 'completed' and sr.return_type <> 'void'
            and (p_start_date is null or sr.created_at >= p_start_date)
            and (p_end_date is null or sr.created_at <= p_end_date)
            and (p_branch_id is null or sr.branch_id = p_branch_id)
        ), 0.00)
      ) as net_revenue
    from public.products p
    left join public.categories c on c.id = p.category_id
    left join public.sale_items si on si.product_id = p.id
    left join public.sales s on s.id = si.sale_id and s.status <> 'voided'
      and (p_start_date is null or s.created_at >= p_start_date)
      and (p_end_date is null or s.created_at <= p_end_date)
      and (p_branch_id is null or s.branch_id = p_branch_id)
    where p.company_id = p_company_id
      and (p_category_id is null or p.category_id = p_category_id)
    group by p.id, p.name, p.sku, p.code, c.name, p.allows_inventory, p.is_active
    having (coalesce(sum(case when s.id is not null then si.quantity else 0.0000 end), 0) > 0 or coalesce((
      select sum(sri.quantity) from public.sale_return_items sri join public.sale_returns sr on sr.id = sri.sale_return_id where sri.product_id = p.id and sr.company_id = p_company_id and sr.status = 'completed' and sr.return_type <> 'void'
    ), 0) > 0)
    order by net_revenue desc
  ) p_row;

  return jsonb_build_object(
    'products', v_products,
    'total_products_count', jsonb_array_length(v_products)
  );
end;$$;

-- 5. RPC: get_pos_cash_report (Reporte Histórico y Auditoría de Cajas)
create or replace function public.get_pos_cash_report(
  p_company_id uuid,
  p_start_date timestamptz default null,
  p_end_date timestamptz default null,
  p_branch_id uuid default null,
  p_cash_register_id uuid default null,
  p_user_id uuid default null,
  p_status text default null,
  p_limit int default 50,
  p_offset int default 0
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_sessions jsonb := '[]'::jsonb;
  v_total_count int := 0;
  v_sum_opening numeric(12,2) := 0.00;
  v_sum_expected numeric(12,2) := 0.00;
  v_sum_declared numeric(12,2) := 0.00;
  v_sum_difference_pos numeric(12,2) := 0.00;
  v_sum_difference_neg numeric(12,2) := 0.00;
begin
  if not public.is_company_member(p_company_id) then
    raise exception 'forbidden';
  end if;

  select count(*),
    coalesce(sum(opening_amount), 0.00),
    coalesce(sum(expected_cash), 0.00),
    coalesce(sum(declared_cash), 0.00),
    coalesce(sum(case when difference > 0 then difference else 0.00 end), 0.00),
    coalesce(sum(case when difference < 0 then difference else 0.00 end), 0.00)
  into v_total_count, v_sum_opening, v_sum_expected, v_sum_declared, v_sum_difference_pos, v_sum_difference_neg
  from public.cash_sessions cs
  where cs.company_id = p_company_id
    and (p_start_date is null or cs.opened_at >= p_start_date)
    and (p_end_date is null or cs.opened_at <= p_end_date)
    and (p_branch_id is null or cs.branch_id = p_branch_id)
    and (p_cash_register_id is null or cs.cash_register_id = p_cash_register_id)
    and (p_user_id is null or cs.user_id = p_user_id)
    and (p_status is null or cs.status = p_status);

  select coalesce(jsonb_agg(s_row), '[]'::jsonb) into v_sessions
  from (
    select
      cs.id as session_id,
      cs.status,
      cs.opened_at,
      cs.closed_at,
      cs.opening_amount,
      cs.expected_cash,
      cs.declared_cash,
      cs.difference,
      case 
        when cs.difference > 0 then 'sobrante'
        when cs.difference < 0 then 'faltante'
        when cs.status = 'closed' then 'cuadrado'
        else 'en_curso'
      end as difference_type,
      cs.notes,
      b.name as branch_name,
      b.code as branch_code,
      cr.name as register_name,
      cr.code as register_code,
      p.full_name as operator_name
    from public.cash_sessions cs
    left join public.branches b on b.id = cs.branch_id
    left join public.cash_registers cr on cr.id = cs.cash_register_id
    left join public.profiles p on p.id = cs.user_id
    where cs.company_id = p_company_id
      and (p_start_date is null or cs.opened_at >= p_start_date)
      and (p_end_date is null or cs.opened_at <= p_end_date)
      and (p_branch_id is null or cs.branch_id = p_branch_id)
      and (p_cash_register_id is null or cs.cash_register_id = p_cash_register_id)
      and (p_user_id is null or cs.user_id = p_user_id)
      and (p_status is null or cs.status = p_status)
    order by cs.opened_at desc
    limit coalesce(p_limit, 50) offset coalesce(p_offset, 0)
  ) s_row;

  return jsonb_build_object(
    'total_count', v_total_count,
    'summary', jsonb_build_object(
      'total_opening', v_sum_opening,
      'total_expected', v_sum_expected,
      'total_declared', v_sum_declared,
      'total_difference_positive', v_sum_difference_pos,
      'total_difference_negative', v_sum_difference_neg
    ),
    'sessions', v_sessions
  );
end;$$;

-- 6. RPC: get_pos_purchases_report (Reporte Analítico de Compras a Proveedores)
create or replace function public.get_pos_purchases_report(
  p_company_id uuid,
  p_start_date timestamptz default null,
  p_end_date timestamptz default null,
  p_branch_id uuid default null,
  p_warehouse_id uuid default null,
  p_supplier_id uuid default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_gross_purchases numeric(12,2) := 0.00;
  v_purchase_returns numeric(12,2) := 0.00;
  v_net_purchases numeric(12,2) := 0.00;
  v_purchases_count int := 0;
  v_returns_count int := 0;
  v_by_supplier jsonb := '[]'::jsonb;
  v_by_warehouse jsonb := '[]'::jsonb;
begin
  if not public.is_company_member(p_company_id) then
    raise exception 'forbidden';
  end if;

  select 
    coalesce(sum(total), 0.00),
    count(*)
  into v_gross_purchases, v_purchases_count
  from public.purchases p
  where p.company_id = p_company_id and p.status = 'confirmed'
    and (p_start_date is null or p.created_at >= p_start_date)
    and (p_end_date is null or p.created_at <= p_end_date)
    and (p_branch_id is null or p.branch_id = p_branch_id)
    and (p_warehouse_id is null or p.warehouse_id = p_warehouse_id)
    and (p_supplier_id is null or p.supplier_id = p_supplier_id);

  select
    coalesce(sum(pr.refund_expected), 0.00),
    count(*)
  into v_purchase_returns, v_returns_count
  from public.purchase_returns pr
  where pr.company_id = p_company_id and pr.status = 'completed'
    and (p_start_date is null or pr.created_at >= p_start_date)
    and (p_end_date is null or pr.created_at <= p_end_date)
    and (p_branch_id is null or pr.branch_id = p_branch_id)
    and (p_warehouse_id is null or pr.warehouse_id = p_warehouse_id)
    and (p_supplier_id is null or pr.supplier_id = p_supplier_id);

  v_net_purchases := v_gross_purchases - v_purchase_returns;

  -- Agrupación por proveedor
  select coalesce(jsonb_agg(sup_row), '[]'::jsonb) into v_by_supplier
  from (
    select
      s.id as supplier_id,
      s.name as supplier_name,
      s.doc_number as supplier_tax_id,
      coalesce(sum(p.total), 0.00) as gross_purchases,
      count(p.id) as purchases_count
    from public.suppliers s
    join public.purchases p on p.supplier_id = s.id and p.company_id = p_company_id and p.status = 'confirmed'
      and (p_start_date is null or p.created_at >= p_start_date)
      and (p_end_date is null or p.created_at <= p_end_date)
      and (p_branch_id is null or p.branch_id = p_branch_id)
      and (p_warehouse_id is null or p.warehouse_id = p_warehouse_id)
    where s.company_id = p_company_id
    group by s.id, s.name, s.doc_number
    order by gross_purchases desc
  ) sup_row;

  return jsonb_build_object(
    'gross_purchases', v_gross_purchases,
    'purchase_returns', v_purchase_returns,
    'net_purchases', v_net_purchases,
    'purchases_count', v_purchases_count,
    'returns_count', v_returns_count,
    'by_supplier', v_by_supplier
  );
end;$$;

-- 7. RPC: get_pos_inventory_report (Reporte Operativo y Valorización de Inventario)
create or replace function public.get_pos_inventory_report(
  p_company_id uuid,
  p_warehouse_id uuid default null,
  p_category_id uuid default null,
  p_filter_type text default 'all',
  p_include_cost boolean default false
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_items jsonb := '[]'::jsonb;
  v_total_skus int := 0;
  v_total_units numeric(14,4) := 0.0000;
  v_total_valuation numeric(14,2) := 0.00;
  v_low_stock_count int := 0;
  v_zero_stock_count int := 0;
begin
  if not public.is_company_member(p_company_id) then
    raise exception 'forbidden';
  end if;

  select coalesce(jsonb_agg(inv_row), '[]'::jsonb) into v_items
  from (
    select
      b.id as balance_id,
      p.id as product_id,
      p.code as product_code,
      p.name as product_name,
      p.sku as sku,
      coalesce(c.name, 'Sin Categoría') as category_name,
      w.id as warehouse_id,
      w.name as warehouse_name,
      w.code as warehouse_code,
      b.quantity as quantity,
      coalesce(nullif(b.min_stock, 0.0000), p.min_stock, 0.0000) as min_stock,
      (b.quantity <= coalesce(nullif(b.min_stock, 0.0000), p.min_stock, 0.0000) and b.quantity > 0 and coalesce(nullif(b.min_stock, 0.0000), p.min_stock, 0.0000) > 0) as is_low_stock,
      (b.quantity = 0) as is_zero_stock,
      case when p_include_cost then p.cost else null end as average_cost,
      case when p_include_cost then round(b.quantity * p.cost, 2) else null end as inventory_value
    from public.inventory_balances b
    join public.products p on p.id = b.product_id
    join public.warehouses w on w.id = b.warehouse_id
    left join public.categories c on c.id = p.category_id
    where b.company_id = p_company_id
      and (p_warehouse_id is null or b.warehouse_id = p_warehouse_id)
      and (p_category_id is null or p.category_id = p_category_id)
      and (
        p_filter_type = 'all' or
        (p_filter_type = 'low_stock' and b.quantity <= coalesce(nullif(b.min_stock, 0.0000), p.min_stock, 0.0000) and b.quantity > 0 and coalesce(nullif(b.min_stock, 0.0000), p.min_stock, 0.0000) > 0) or
        (p_filter_type = 'zero_stock' and b.quantity = 0)
      )
    order by p.name asc, w.name asc
  ) inv_row;

  -- Resumen global
  select
    count(distinct b.product_id),
    coalesce(sum(b.quantity), 0.0000),
    coalesce(sum(case when p_include_cost then round(b.quantity * p.cost, 2) else 0.00 end), 0.00),
    count(*) filter (where b.quantity <= coalesce(nullif(b.min_stock, 0.0000), p.min_stock, 0.0000) and b.quantity > 0 and coalesce(nullif(b.min_stock, 0.0000), p.min_stock, 0.0000) > 0),
    count(*) filter (where b.quantity = 0)
  into v_total_skus, v_total_units, v_total_valuation, v_low_stock_count, v_zero_stock_count
  from public.inventory_balances b
  join public.products p on p.id = b.product_id
  where b.company_id = p_company_id
    and (p_warehouse_id is null or b.warehouse_id = p_warehouse_id)
    and (p_category_id is null or p.category_id = p_category_id);

  return jsonb_build_object(
    'summary', jsonb_build_object(
      'total_skus', v_total_skus,
      'total_units', v_total_units,
      'total_valuation', case when p_include_cost then v_total_valuation else null end,
      'low_stock_count', v_low_stock_count,
      'zero_stock_count', v_zero_stock_count
    ),
    'items', v_items
  );
end;$$;

-- 8. RPC: get_pos_dashboard_kpis (KPIs Operativos en Tiempo Real para el Dashboard POS)
create or replace function public.get_pos_dashboard_kpis(
  p_company_id uuid,
  p_branch_id uuid default null,
  p_target_date date default current_date,
  p_timezone text default 'America/Lima'
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_tz text := coalesce(nullif(trim(p_timezone), ''), 'America/Lima');
  v_day_start timestamptz;
  v_day_end timestamptz;
  
  v_net_sales numeric(12,2) := 0.00;
  v_gross_sales numeric(12,2) := 0.00;
  v_returns_amount numeric(12,2) := 0.00;
  v_transactions_count int := 0;
  v_average_ticket numeric(12,2) := 0.00;
  v_open_sessions_count int := 0;
  v_low_stock_count int := 0;
begin
  if not public.is_company_member(p_company_id) then
    raise exception 'forbidden';
  end if;

  -- Calcular límites UTC para el día comercial exacto en el timezone local
  v_day_start := (p_target_date::text || ' 00:00:00')::timestamp at time zone v_tz;
  v_day_end := (p_target_date::text || ' 23:59:59.999999')::timestamp at time zone v_tz;

  -- Ventas del día
  select
    coalesce(sum(case when status <> 'voided' then total else 0.00 end), 0.00),
    count(*) filter (where status <> 'voided')
  into v_gross_sales, v_transactions_count
  from public.sales
  where company_id = p_company_id
    and created_at >= v_day_start and created_at <= v_day_end
    and (p_branch_id is null or branch_id = p_branch_id);

  -- Devoluciones del día (excluyendo voids)
  select coalesce(sum(refund_total), 0.00)
  into v_returns_amount
  from public.sale_returns
  where company_id = p_company_id and status = 'completed' and return_type <> 'void'
    and created_at >= v_day_start and created_at <= v_day_end
    and (p_branch_id is null or branch_id = p_branch_id);

  v_net_sales := v_gross_sales - v_returns_amount;
  if v_transactions_count > 0 then
    v_average_ticket := round(v_net_sales / v_transactions_count, 2);
  else
    v_average_ticket := 0.00;
  end if;

  -- Turnos de caja activos (abiertos)
  select count(*) into v_open_sessions_count
  from public.cash_sessions
  where company_id = p_company_id and status = 'open'
    and (p_branch_id is null or branch_id = p_branch_id);

  -- Conteo de stock bajo
  select count(*) into v_low_stock_count
  from public.inventory_balances b
  join public.products p on p.id = b.product_id
  where b.company_id = p_company_id
    and p.allows_inventory = true
    and b.quantity <= coalesce(nullif(b.min_stock, 0.0000), p.min_stock, 0.0000)
    and coalesce(nullif(b.min_stock, 0.0000), p.min_stock, 0.0000) > 0
    and (p_branch_id is null or exists (select 1 from public.warehouses w where w.id = b.warehouse_id and w.branch_id = p_branch_id));

  return jsonb_build_object(
    'target_date', p_target_date,
    'timezone', v_tz,
    'net_sales_today', v_net_sales,
    'gross_sales_today', v_gross_sales,
    'returns_today', v_returns_amount,
    'transactions_today', v_transactions_count,
    'average_ticket_today', v_average_ticket,
    'open_cash_sessions_count', v_open_sessions_count,
    'low_stock_count', v_low_stock_count
  );
end;$$;

-- Permisos de ejecución
revoke all on function public.get_x_report(uuid, uuid) from public;
grant execute on function public.get_x_report(uuid, uuid) to authenticated;

revoke all on function public.get_z_report(uuid, uuid) from public;
grant execute on function public.get_z_report(uuid, uuid) to authenticated;

revoke all on function public.get_pos_sales_report(uuid, timestamptz, timestamptz, uuid, uuid, uuid, uuid, text, uuid, uuid) from public;
grant execute on function public.get_pos_sales_report(uuid, timestamptz, timestamptz, uuid, uuid, uuid, uuid, text, uuid, uuid) to authenticated;

revoke all on function public.get_pos_product_report(uuid, timestamptz, timestamptz, uuid, uuid) from public;
grant execute on function public.get_pos_product_report(uuid, timestamptz, timestamptz, uuid, uuid) to authenticated;

revoke all on function public.get_pos_cash_report(uuid, timestamptz, timestamptz, uuid, uuid, uuid, text, int, int) from public;
grant execute on function public.get_pos_cash_report(uuid, timestamptz, timestamptz, uuid, uuid, uuid, text, int, int) to authenticated;

revoke all on function public.get_pos_purchases_report(uuid, timestamptz, timestamptz, uuid, uuid, uuid) from public;
grant execute on function public.get_pos_purchases_report(uuid, timestamptz, timestamptz, uuid, uuid, uuid) to authenticated;

revoke all on function public.get_pos_inventory_report(uuid, uuid, uuid, text, boolean) from public;
grant execute on function public.get_pos_inventory_report(uuid, uuid, uuid, text, boolean) to authenticated;

revoke all on function public.get_pos_dashboard_kpis(uuid, uuid, date, text) from public;
grant execute on function public.get_pos_dashboard_kpis(uuid, uuid, date, text) to authenticated;
