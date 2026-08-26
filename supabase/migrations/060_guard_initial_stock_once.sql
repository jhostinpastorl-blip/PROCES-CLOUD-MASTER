-- ===================================================================
-- PROCESA CLOUD · FASE 1A · MIGRATION 060
-- Guard Initial Stock Once (Strict Idempotency & Initial Balance Lock)
-- ===================================================================

-- 1. Permitir cantidad cero en inventory_movements para inicialización en cero (INVENTORY-08)
alter table public.inventory_movements drop constraint if exists inventory_movements_quantity_check;
alter table public.inventory_movements add constraint inventory_movements_quantity_check check (quantity >= 0);

-- 2. Fortalecer RPC set_initial_stock para permitir solo 1 inicialización por combinación (company, warehouse, product)
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

  if p_quantity < 0 then
    raise exception 'INVALID_QUANTITY';
  end if;

  -- Validar producto pertenece a la empresa y permite inventario
  select company_id, allows_inventory into prod_company, prod_allows_inv
  from public.products
  where id = p_product_id and deleted_at is null;

  if prod_company is null or prod_company <> p_company_id then
    raise exception 'PRODUCT_NOT_FOUND';
  end if;

  if not prod_allows_inv then
    raise exception 'PRODUCT_DOES_NOT_ALLOW_INVENTORY';
  end if;

  -- Validar almacén pertenece a la empresa
  select company_id into wh_company
  from public.warehouses
  where id = p_warehouse_id and deleted_at is null;

  if wh_company is null or wh_company <> p_company_id then
    raise exception 'WAREHOUSE_NOT_FOUND';
  end if;

  -- Protección de idempotencia y concurrencia:
  -- Rechazar si ya existe un balance previo o si ya se ejecutó INITIAL_STOCK para esta combinación
  if exists (
    select 1 from public.inventory_balances
    where company_id = p_company_id and warehouse_id = p_warehouse_id and product_id = p_product_id
  ) or exists (
    select 1 from public.inventory_movements
    where company_id = p_company_id and warehouse_id = p_warehouse_id and product_id = p_product_id
      and movement_type = 'INITIAL_STOCK'
  ) then
    raise exception 'INITIAL_STOCK_ALREADY_EXISTS';
  end if;

  -- Insertar balance inicial
  insert into public.inventory_balances (company_id, warehouse_id, product_id, quantity, updated_at)
  values (p_company_id, p_warehouse_id, p_product_id, p_quantity, now());

  -- Registrar movimiento inicial auditable
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
    p_product_id,
    'INITIAL_STOCK',
    p_quantity,
    coalesce(p_unit_cost, 0),
    coalesce(p_notes, 'Stock inicial'),
    auth.uid()
  );
end;$$;

revoke all on function public.set_initial_stock(uuid, uuid, uuid, numeric, numeric, text) from public;
grant execute on function public.set_initial_stock(uuid, uuid, uuid, numeric, numeric, text) to authenticated;
