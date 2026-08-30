-- ============================================================
-- PROCESA CLOUD V2 — MIGRACIÓN 071
-- HARDENING DEL MOTOR DE COSTO PROMEDIO PONDERADO (CPP)
-- RECEPCIÓN TRANSACCIONAL DE COMPRAS Y ACTUALIZACIÓN DE KARDEX
-- ============================================================

-- 1. Asegurar índice optimizado para cálculo de stock consolidado por producto
create index if not exists idx_inventory_balances_company_product 
  on public.inventory_balances(company_id, product_id);

-- 2. RPC ATÓMICA REFORZADA: create_pos_purchase
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
  
  v_total_company_stock numeric(14,4);
  v_new_avg_cost numeric(12,4);
  
  v_doc_prefix text := 'COM';
  v_doc_seq bigint;
  v_doc_number text;
  v_branch_for_seq uuid;
  
  v_existing_purchase record;
  v_prepared_items jsonb := '[]'::jsonb;
begin
  -- 1. Validar membresía de empresa
  if not public.is_company_member(p_company_id) then
    raise exception 'forbidden';
  end if;

  -- 2. Idempotencia: si ya existe una compra con esta key para la empresa, retornarla
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

  -- 5. Validar que la lista de items no esté vacía
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_PURCHASE_ITEMS';
  end if;

  v_purchase_id := gen_random_uuid();
  v_branch_for_seq := coalesce(p_branch_id, v_branch_for_seq);

  -- 6. Paso 1: Validar productos y calcular totales financieros
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
      'allows_inventory', v_prod.allows_inventory
    );
  end loop;

  -- 7. Generar correlativo oficial
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
    v_branch_for_seq,
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

  -- 9. Paso 2: Insertar items, actualizar stock y recalcular Costo Promedio Ponderado bajo LOCK PESIMISTA
  for v_item in select * from jsonb_array_elements(v_prepared_items)
  loop
    v_line_qty := (v_item->>'quantity')::numeric;
    v_line_cost := (v_item->>'unit_cost')::numeric;

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
      v_line_qty,
      v_line_cost,
      v_item->>'tax_type',
      (v_item->>'tax_rate')::numeric,
      (v_item->>'tax_amount')::numeric,
      (v_item->>'line_subtotal')::numeric,
      (v_item->>'line_total')::numeric
    );

    -- Si es producto físico inventariable, ingresar al almacén y recalcular costo promedio ponderado
    if (v_item->>'allows_inventory')::boolean then
      -- A. Bloquear maestro de producto para serializar cálculo de costo
      select id, cost into v_prod
      from public.products
      where id = (v_item->>'product_id')::uuid and company_id = p_company_id
      for update;

      -- B. Obtener stock total consolidado de la empresa previo a esta recepción
      select coalesce(sum(quantity), 0.0000) into v_total_company_stock
      from public.inventory_balances
      where company_id = p_company_id and product_id = (v_item->>'product_id')::uuid;

      -- C. Fórmula formal de Costo Promedio Ponderado (CPP) con 4 decimales:
      -- Si stock previo <= 0, el nuevo costo promedio es el costo de compra unitario
      if v_total_company_stock <= 0 then
        v_new_avg_cost := round(v_line_cost, 4);
      else
        v_new_avg_cost := round(
          ((v_total_company_stock * coalesce(v_prod.cost, 0.0000)) + (v_line_qty * v_line_cost))
          / (v_total_company_stock + v_line_qty),
          4
        );
      end if;

      -- D. Actualizar costo maestro del producto
      update public.products
      set cost = v_new_avg_cost, updated_at = now()
      where id = (v_item->>'product_id')::uuid;

      -- E. Incrementar balance de inventario en el almacén de destino (con bloqueo)
      insert into public.inventory_balances (company_id, warehouse_id, product_id, quantity, updated_at)
      values (p_company_id, p_warehouse_id, (v_item->>'product_id')::uuid, v_line_qty, now())
      on conflict (company_id, warehouse_id, product_id)
      do update set quantity = inventory_balances.quantity + v_line_qty, updated_at = now();

      -- F. Registrar movimiento Kardex inmutable (PURCHASE_IN)
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
        v_line_qty,
        v_line_cost,
        'purchase',
        v_purchase_id,
        'Ingreso por Compra ' || v_doc_number,
        auth.uid()
      );
    end if;
  end loop;

  -- 10. Registrar auditoría inmutable
  insert into public.audit_logs (
    company_id, actor_user_id, action, entity_type, entity_id, metadata
  ) values (
    p_company_id, auth.uid(), 'purchase.created', 'purchases', v_purchase_id,
    jsonb_build_object(
      'document_number', v_doc_number,
      'warehouse_id', p_warehouse_id,
      'supplier_id', p_supplier_id,
      'total', v_total,
      'items_count', jsonb_array_length(v_prepared_items)
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

-- Revocar acceso público y otorgar a usuarios autenticados
revoke all on function public.create_pos_purchase(uuid, uuid, uuid, jsonb, uuid, text, text, date, text, text) from public;
grant execute on function public.create_pos_purchase(uuid, uuid, uuid, jsonb, uuid, text, text, date, text, text) to authenticated;
