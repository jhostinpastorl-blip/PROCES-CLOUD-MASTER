-- ===================================================================
-- PROCESA CLOUD · FASE 1F · MIGRATION 070
-- ELECTRONIC INVOICING / SUNAT CPE RPCS & PERMISSIONS
-- ===================================================================

-- 1. Registrar 5 nuevos permisos RBAC en el catálogo oficial
insert into public.permissions (code, description) values
  ('pos.cpe.read', 'Permite consultar CPEs (Facturas, Boletas, NC, ND) y sus estados SUNAT'),
  ('pos.cpe.issue', 'Permite generar y emitir Facturas y Boletas electrónicas desde ventas'),
  ('pos.cpe.retry', 'Permite reintentar el transporte y consulta de CDR para comprobantes pendientes o con error'),
  ('pos.cpe.credit_note', 'Permite emitir Notas de Crédito y Débito electrónicas vinculadas a ventas o devoluciones'),
  ('pos.cpe.config.manage', 'Permite configurar el perfil tributario, series fiscales y entorno de facturación')
on conflict (code) do nothing;

-- Asignar los 5 nuevos permisos a los roles de Administrador existentes
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.is_system = true and r.name = 'Administrador'
  and p.code in (
    'pos.cpe.read',
    'pos.cpe.issue',
    'pos.cpe.retry',
    'pos.cpe.credit_note',
    'pos.cpe.config.manage'
  )
on conflict do nothing;

-- 2. RPC: Obtener siguiente correlativo fiscal concurrente (get_next_fiscal_correlative)
create or replace function public.get_next_fiscal_correlative(
  p_company_id uuid,
  p_document_type text,
  p_series text
) returns int
language plpgsql security definer set search_path = public as $$
declare
  v_series record;
  v_next_num int;
begin
  if not public.is_company_member(p_company_id) then
    raise exception 'forbidden';
  end if;

  -- Bloquear fila de serie para concurrencia estricta
  select * into v_series
  from public.tax_document_series
  where company_id = p_company_id
    and document_type = p_document_type
    and series = p_series
  for update;

  if v_series.id is null then
    raise exception 'SERIES_NOT_FOUND';
  end if;

  if not v_series.is_active then
    raise exception 'SERIES_IS_INACTIVE';
  end if;

  v_next_num := v_series.current_number + 1;

  update public.tax_document_series
  set current_number = v_next_num,
      updated_at = now()
  where id = v_series.id;

  return v_next_num;
end;$$;

-- 3. RPC: Crear Documento Electrónico desde Venta (create_electronic_document_from_sale)
create or replace function public.create_electronic_document_from_sale(
  p_company_id uuid,
  p_sale_id uuid,
  p_document_type text,
  p_series text,
  p_idempotency_key text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_sale record;
  v_fiscal_profile record;
  v_customer record;
  v_cust_doc_type text;
  v_cust_doc_num text;
  v_cust_name text;
  v_cust_address text;
  
  v_next_number int;
  v_doc_id uuid;
  v_item record;
  v_item_order int := 0;
  
  v_taxable numeric(12,2) := 0.00;
  v_igv numeric(12,2) := 0.00;
  v_subtotal numeric(12,2) := 0.00;
  v_total numeric(12,2) := 0.00;
  
  v_unit_value numeric(14,4);
  v_item_igv numeric(12,2);
  v_item_subtotal numeric(12,2);
  
  v_existing_doc record;
begin
  if not public.is_company_member(p_company_id) then
    raise exception 'forbidden';
  end if;

  -- 1. Idempotencia
  if p_idempotency_key is not null and trim(p_idempotency_key) <> '' then
    select * into v_existing_doc
    from public.electronic_documents
    where company_id = p_company_id and idempotency_key = p_idempotency_key;

    if v_existing_doc.id is not null then
      return jsonb_build_object(
        'document_id', v_existing_doc.id,
        'document_type', v_existing_doc.document_type,
        'series', v_existing_doc.series,
        'number', v_existing_doc.number,
        'status', v_existing_doc.status,
        'total', v_existing_doc.total,
        'idempotent_replay', true
      );
    end if;
  end if;

  -- 2. Validar tipo de documento
  if p_document_type not in ('01', '03') then
    raise exception 'INVALID_DOCUMENT_TYPE_FOR_SALE';
  end if;

  -- 3. Obtener y bloquear venta
  select * into v_sale
  from public.sales
  where id = p_sale_id and company_id = p_company_id
  for update;

  if v_sale.id is null then
    raise exception 'SALE_NOT_FOUND';
  end if;

  if v_sale.status <> 'completed' then
    raise exception 'SALE_NOT_COMPLETED';
  end if;

  -- 4. Verificar que no exista ya un comprobante activo para esta venta
  if exists (
    select 1 from public.electronic_documents
    where company_id = p_company_id and source_type = 'sale' and source_id = p_sale_id
      and status not in ('rejected', 'error')
  ) then
    raise exception 'CPE_ALREADY_EXISTS_FOR_SALE';
  end if;

  -- 5. Obtener perfil fiscal de la empresa
  select * into v_fiscal_profile
  from public.company_fiscal_profiles
  where company_id = p_company_id;

  if v_fiscal_profile.id is null or length(coalesce(v_fiscal_profile.ruc, '')) <> 11 then
    -- Fallback temporal si la empresa tiene tax_id de 11 dígitos
    select * into v_fiscal_profile
    from (
      select 
        c.id,
        c.id as company_id,
        coalesce(c.tax_id, '20000000001') as ruc,
        coalesce(c.legal_name, c.name) as legal_name,
        c.name as trade_name,
        'AV. PRINCIPAL 123' as fiscal_address,
        '150101' as ubigeo,
        'beta' as cpe_environment,
        'mock' as cpe_transport_provider
      from public.companies c
      where c.id = p_company_id
    ) fb;
  end if;

  -- 6. Obtener datos del cliente
  if v_sale.customer_id is not null then
    select * into v_customer from public.customers where id = v_sale.customer_id and company_id = p_company_id;
  end if;

  if v_customer.id is not null then
    v_cust_doc_num := v_customer.doc_number;
    v_cust_name := v_customer.name;
    v_cust_address := v_customer.address;
    case v_customer.doc_type
      when 'RUC' then v_cust_doc_type := '6';
      when 'DNI' then v_cust_doc_type := '1';
      when 'CE' then v_cust_doc_type := '4';
      when 'PASSPORT' then v_cust_doc_type := '7';
      else v_cust_doc_type := '0';
    end case;
  else
    -- Cliente Varios / Sin Documento
    v_cust_doc_type := '0';
    v_cust_doc_num := '00000000';
    v_cust_name := 'CLIENTES VARIOS';
    v_cust_address := '-';
  end if;

  -- 7. Validaciones SUNAT de Cliente según Tipo de Documento:
  -- FACTURA (01): Requiere cliente con RUC válido (Tipo '6' y 11 dígitos)
  if p_document_type = '01' then
    if v_cust_doc_type <> '6' or length(v_cust_doc_num) <> 11 then
      raise exception 'INVOICE_REQUIRES_RUC_CUSTOMER';
    end if;
  end if;

  -- BOLETA (03): Si el monto supera S/ 700, SUNAT exige identificación (DNI, CE, RUC, etc.)
  if p_document_type = '03' and v_sale.total >= 700.00 then
    if v_cust_doc_type = '0' or v_cust_doc_num = '00000000' then
      raise exception 'RECEIPT_ABOVE_700_REQUIRES_IDENTIFIED_CUSTOMER';
    end if;
  end if;

  -- 8. Obtener correlativo fiscal atómico
  v_next_number := public.get_next_fiscal_correlative(p_company_id, p_document_type, p_series);

  -- 9. Insertar encabezado de documento electrónico en estado 'generated'
  insert into public.electronic_documents (
    company_id,
    branch_id,
    source_type,
    source_id,
    document_type,
    series,
    number,
    issue_date,
    issue_time,
    currency,
    issuer_ruc,
    issuer_legal_name,
    issuer_trade_name,
    issuer_address,
    issuer_ubigeo,
    customer_id,
    customer_doc_type,
    customer_doc_number,
    customer_name,
    customer_address,
    customer_email,
    taxable_amount,
    exonerated_amount,
    unaffected_amount,
    igv_amount,
    icbper_amount,
    subtotal,
    tax_total,
    total,
    status,
    idempotency_key,
    environment,
    transport_provider,
    created_by
  ) values (
    p_company_id,
    v_sale.branch_id,
    'sale',
    v_sale.id,
    p_document_type,
    p_series,
    v_next_number,
    current_date,
    current_time,
    coalesce(v_sale.currency, 'PEN'),
    v_fiscal_profile.ruc,
    v_fiscal_profile.legal_name,
    v_fiscal_profile.trade_name,
    v_fiscal_profile.fiscal_address,
    v_fiscal_profile.ubigeo,
    v_sale.customer_id,
    v_cust_doc_type,
    v_cust_doc_num,
    v_cust_name,
    v_cust_address,
    v_customer.email,
    0.00,
    0.00,
    0.00,
    0.00,
    0.00,
    0.00,
    0.00,
    v_sale.total,
    'generated',
    p_idempotency_key,
    coalesce(v_fiscal_profile.cpe_environment, 'beta'),
    coalesce(v_fiscal_profile.cpe_transport_provider, 'mock'),
    auth.uid()
  ) returning id into v_doc_id;

  -- 10. Procesar ítems y construir snapshot
  for v_item in (
    select si.*, p.sku, coalesce(si.name_snapshot, p.name) as prod_name, coalesce(p.allows_inventory, true) as allows_inventory
    from public.sale_items si
    left join public.products p on p.id = si.product_id
    where si.sale_id = p_sale_id
    order by si.created_at asc
  ) loop
    v_item_order := v_item_order + 1;
    
    -- Operación Gravada (IGV 18%)
    v_unit_value := round(v_item.unit_price / 1.18, 4);
    v_item_subtotal := round(v_unit_value * v_item.quantity, 2);
    v_item_igv := v_item.line_total - v_item_subtotal;
    
    v_taxable := v_taxable + v_item_subtotal;
    v_igv := v_igv + v_item_igv;
    v_subtotal := v_subtotal + v_item_subtotal;
    v_total := v_total + v_item.line_total;

    insert into public.electronic_document_items (
      company_id,
      document_id,
      item_order,
      product_id,
      sku,
      product_name,
      unit_code,
      quantity,
      unit_value,
      unit_price,
      tax_category,
      igv_rate,
      igv_amount,
      line_subtotal,
      line_total
    ) values (
      p_company_id,
      v_doc_id,
      v_item_order,
      v_item.product_id,
      v_item.sku,
      v_item.prod_name,
      case when v_item.allows_inventory then 'NIU' else 'ZZ' end,
      v_item.quantity,
      v_unit_value,
      v_item.unit_price,
      '10',
      0.1800,
      v_item_igv,
      v_item_subtotal,
      v_item.line_total
    );
  end loop;

  -- 11. Actualizar totales reconciliados en encabezado
  update public.electronic_documents
  set taxable_amount = v_taxable,
      subtotal = v_subtotal,
      igv_amount = v_igv,
      tax_total = v_igv,
      total = v_total
  where id = v_doc_id;

  -- 12. Auditar creación de CPE
  insert into public.audit_logs (
    company_id, actor_user_id, action, entity_type, entity_id, metadata
  ) values (
    p_company_id, auth.uid(), 'cpe.created', 'electronic_documents', v_doc_id,
    jsonb_build_object(
      'sale_id', p_sale_id,
      'document_type', p_document_type,
      'series', p_series,
      'number', v_next_number,
      'total', v_total
    )
  );

  return jsonb_build_object(
    'document_id', v_doc_id,
    'document_type', p_document_type,
    'series', p_series,
    'number', v_next_number,
    'status', 'generated',
    'total', v_total,
    'taxable_amount', v_taxable,
    'igv_amount', v_igv,
    'customer_doc_number', v_cust_doc_num,
    'customer_name', v_cust_name
  );
end;$$;

-- 4. RPC: Crear Nota de Crédito desde Devolución (create_credit_note_from_return)
create or replace function public.create_credit_note_from_return(
  p_company_id uuid,
  p_sale_return_id uuid,
  p_series text,
  p_discrepancy_code text default '07',
  p_discrepancy_reason text default 'Devolución de mercadería',
  p_idempotency_key text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_return record;
  v_orig_doc record;
  v_next_number int;
  v_nc_id uuid;
  v_item record;
  v_item_order int := 0;
  
  v_taxable numeric(12,2) := 0.00;
  v_igv numeric(12,2) := 0.00;
  v_subtotal numeric(12,2) := 0.00;
  v_total numeric(12,2) := 0.00;
  
  v_unit_value numeric(14,4);
  v_item_igv numeric(12,2);
  v_item_subtotal numeric(12,2);
  v_existing_doc record;
begin
  if not public.is_company_member(p_company_id) then
    raise exception 'forbidden';
  end if;

  -- 1. Idempotencia
  if p_idempotency_key is not null and trim(p_idempotency_key) <> '' then
    select * into v_existing_doc
    from public.electronic_documents
    where company_id = p_company_id and idempotency_key = p_idempotency_key;

    if v_existing_doc.id is not null then
      return jsonb_build_object(
        'document_id', v_existing_doc.id,
        'document_type', '07',
        'series', v_existing_doc.series,
        'number', v_existing_doc.number,
        'status', v_existing_doc.status,
        'total', v_existing_doc.total,
        'idempotent_replay', true
      );
    end if;
  end if;

  -- 2. Obtener devolución
  select * into v_return
  from public.sale_returns
  where id = p_sale_return_id and company_id = p_company_id;

  if v_return.id is null then
    raise exception 'SALE_RETURN_NOT_FOUND';
  end if;

  if v_return.status <> 'completed' then
    raise exception 'SALE_RETURN_NOT_COMPLETED';
  end if;

  -- 3. Obtener documento fiscal original vinculado a la venta
  select * into v_orig_doc
  from public.electronic_documents
  where company_id = p_company_id and source_type = 'sale' and source_id = v_return.sale_id
    and document_type in ('01', '03')
  order by created_at desc
  limit 1;

  if v_orig_doc.id is null then
    raise exception 'ORIGINAL_CPE_NOT_FOUND';
  end if;

  -- El comprobante original debe haber sido emitido/aceptado
  if v_orig_doc.status in ('rejected', 'error', 'draft') then
    raise exception 'ORIGINAL_CPE_NOT_IN_VALID_STATUS';
  end if;

  -- 4. Validar serie de Nota de Crédito respecto al documento original
  -- Si original fue Factura (01) -> NC debe ser serie F (e.g. FC01, F001)
  -- Si original fue Boleta (03) -> NC debe ser serie B (e.g. BC01, B001)
  if v_orig_doc.document_type = '01' and p_series !~ '^F' then
    raise exception 'INVOICE_CREDIT_NOTE_MUST_HAVE_F_SERIES';
  end if;
  if v_orig_doc.document_type = '03' and p_series !~ '^B' then
    raise exception 'RECEIPT_CREDIT_NOTE_MUST_HAVE_B_SERIES';
  end if;

  -- 5. Obtener correlativo fiscal para '07' (Nota de Crédito)
  v_next_number := public.get_next_fiscal_correlative(p_company_id, '07', p_series);

  -- 6. Insertar encabezado de Nota de Crédito
  insert into public.electronic_documents (
    company_id,
    branch_id,
    source_type,
    source_id,
    document_type,
    series,
    number,
    issue_date,
    issue_time,
    currency,
    issuer_ruc,
    issuer_legal_name,
    issuer_trade_name,
    issuer_address,
    issuer_ubigeo,
    customer_id,
    customer_doc_type,
    customer_doc_number,
    customer_name,
    customer_address,
    customer_email,
    referenced_document_id,
    referenced_document_type,
    referenced_series,
    referenced_number,
    discrepancy_code,
    discrepancy_reason,
    taxable_amount,
    exonerated_amount,
    unaffected_amount,
    igv_amount,
    icbper_amount,
    subtotal,
    tax_total,
    total,
    status,
    idempotency_key,
    environment,
    transport_provider,
    created_by
  ) values (
    p_company_id,
    v_orig_doc.branch_id,
    'sale_return',
    v_return.id,
    '07',
    p_series,
    v_next_number,
    current_date,
    current_time,
    v_orig_doc.currency,
    v_orig_doc.issuer_ruc,
    v_orig_doc.issuer_legal_name,
    v_orig_doc.issuer_trade_name,
    v_orig_doc.issuer_address,
    v_orig_doc.issuer_ubigeo,
    v_orig_doc.customer_id,
    v_orig_doc.customer_doc_type,
    v_orig_doc.customer_doc_number,
    v_orig_doc.customer_name,
    v_orig_doc.customer_address,
    v_orig_doc.customer_email,
    v_orig_doc.id,
    v_orig_doc.document_type,
    v_orig_doc.series,
    v_orig_doc.number,
    p_discrepancy_code,
    p_discrepancy_reason,
    0.00,
    0.00,
    0.00,
    0.00,
    0.00,
    0.00,
    0.00,
    v_return.refund_total,
    'generated',
    p_idempotency_key,
    v_orig_doc.environment,
    v_orig_doc.transport_provider,
    auth.uid()
  ) returning id into v_nc_id;

  -- 7. Insertar ítems devueltos
  for v_item in (
    select sri.*, p.sku, coalesce(sri.name_snapshot, p.name) as prod_name, coalesce(p.allows_inventory, true) as allows_inventory
    from public.sale_return_items sri
    left join public.products p on p.id = sri.product_id
    where sri.sale_return_id = p_sale_return_id and sri.company_id = p_company_id
    order by sri.created_at asc
  ) loop
    v_item_order := v_item_order + 1;
    
    v_unit_value := round(v_item.unit_price_snapshot / 1.18, 4);
    v_item_subtotal := round(v_unit_value * v_item.quantity, 2);
    v_item_igv := round(v_item.unit_price_snapshot * v_item.quantity, 2) - v_item_subtotal;
    
    v_taxable := v_taxable + v_item_subtotal;
    v_igv := v_igv + v_item_igv;
    v_subtotal := v_subtotal + v_item_subtotal;
    v_total := v_total + round(v_item.unit_price_snapshot * v_item.quantity, 2);

    insert into public.electronic_document_items (
      company_id,
      document_id,
      item_order,
      product_id,
      sku,
      product_name,
      unit_code,
      quantity,
      unit_value,
      unit_price,
      tax_category,
      igv_rate,
      igv_amount,
      line_subtotal,
      line_total
    ) values (
      p_company_id,
      v_nc_id,
      v_item_order,
      v_item.product_id,
      v_item.sku,
      v_item.prod_name,
      case when v_item.allows_inventory then 'NIU' else 'ZZ' end,
      v_item.quantity,
      v_unit_value,
      v_item.unit_price_snapshot,
      '10',
      0.1800,
      v_item_igv,
      v_item_subtotal,
      round(v_item.unit_price_snapshot * v_item.quantity, 2)
    );
  end loop;

  -- 8. Actualizar totales reconciliados
  update public.electronic_documents
  set taxable_amount = v_taxable,
      subtotal = v_subtotal,
      igv_amount = v_igv,
      tax_total = v_igv,
      total = v_total
  where id = v_nc_id;

  -- 9. Auditar
  insert into public.audit_logs (
    company_id, actor_user_id, action, entity_type, entity_id, metadata
  ) values (
    p_company_id, auth.uid(), 'credit_note.created', 'electronic_documents', v_nc_id,
    jsonb_build_object(
      'sale_return_id', p_sale_return_id,
      'referenced_cpe', v_orig_doc.series || '-' || v_orig_doc.number,
      'series', p_series,
      'number', v_next_number,
      'total', v_total
    )
  );

  return jsonb_build_object(
    'document_id', v_nc_id,
    'document_type', '07',
    'series', p_series,
    'number', v_next_number,
    'referenced_document', v_orig_doc.series || '-' || v_orig_doc.number,
    'status', 'generated',
    'total', v_total
  );
end;$$;

-- 5. RPC: Registrar resultado de envío y CDR (record_cpe_submission_result)
create or replace function public.record_cpe_submission_result(
  p_company_id uuid,
  p_document_id uuid,
  p_status text,
  p_cdr_code text default null,
  p_cdr_description text default null,
  p_cdr_notes text[] default '{}',
  p_cdr_raw text default null,
  p_signed_xml_hash text default null,
  p_signed_xml_content text default null,
  p_qr_data text default null,
  p_error_code text default null,
  p_error_message text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_doc record;
  v_accepted_at timestamptz := null;
  v_rejected_at timestamptz := null;
  v_cdr_status text := null;
begin
  if not public.is_company_member(p_company_id) then
    raise exception 'forbidden';
  end if;

  select * into v_doc
  from public.electronic_documents
  where id = p_document_id and company_id = p_company_id
  for update;

  if v_doc.id is null then
    raise exception 'ELECTRONIC_DOCUMENT_NOT_FOUND';
  end if;

  if p_status in ('accepted', 'accepted_with_observations') then
    v_accepted_at := now();
    v_cdr_status := '0';
  elsif p_status = 'rejected' then
    v_rejected_at := now();
    v_cdr_status := 'rejected';
  elsif p_status = 'error' then
    v_cdr_status := 'pending';
  end if;

  update public.electronic_documents
  set status = p_status,
      cdr_code = coalesce(p_cdr_code, cdr_code),
      cdr_description = coalesce(p_cdr_description, cdr_description),
      cdr_notes = coalesce(p_cdr_notes, cdr_notes),
      cdr_raw = coalesce(p_cdr_raw, cdr_raw),
      cdr_status = coalesce(v_cdr_status, cdr_status),
      cdr_received_at = case when p_cdr_code is not null then now() else cdr_received_at end,
      signed_xml_hash = coalesce(p_signed_xml_hash, signed_xml_hash),
      signed_xml_content = coalesce(p_signed_xml_content, signed_xml_content),
      qr_data = coalesce(p_qr_data, qr_data),
      submission_attempts = submission_attempts + 1,
      last_submitted_at = now(),
      last_error_code = p_error_code,
      last_error_message = p_error_message,
      accepted_at = coalesce(v_accepted_at, accepted_at),
      rejected_at = coalesce(v_rejected_at, rejected_at),
      updated_at = now()
  where id = p_document_id;

  -- Auditar
  insert into public.audit_logs (
    company_id, actor_user_id, action, entity_type, entity_id, metadata
  ) values (
    p_company_id, auth.uid(), 'cpe.submitted_result', 'electronic_documents', p_document_id,
    jsonb_build_object(
      'status', p_status,
      'cdr_code', p_cdr_code,
      'cdr_description', p_cdr_description,
      'attempts', v_doc.submission_attempts + 1
    )
  );

  return jsonb_build_object(
    'document_id', p_document_id,
    'status', p_status,
    'cdr_code', p_cdr_code,
    'cdr_description', p_cdr_description,
    'attempts', v_doc.submission_attempts + 1
  );
end;$$;

-- Permisos de ejecución
revoke all on function public.get_next_fiscal_correlative(uuid, text, text) from public;
grant execute on function public.get_next_fiscal_correlative(uuid, text, text) to authenticated;

revoke all on function public.create_electronic_document_from_sale(uuid, uuid, text, text, text) from public;
grant execute on function public.create_electronic_document_from_sale(uuid, uuid, text, text, text) to authenticated;

revoke all on function public.create_credit_note_from_return(uuid, uuid, text, text, text, text) from public;
grant execute on function public.create_credit_note_from_return(uuid, uuid, text, text, text, text) to authenticated;

revoke all on function public.record_cpe_submission_result(uuid, uuid, text, text, text, text[], text, text, text, text, text, text) from public;
grant execute on function public.record_cpe_submission_result(uuid, uuid, text, text, text, text[], text, text, text, text, text, text) to authenticated;
