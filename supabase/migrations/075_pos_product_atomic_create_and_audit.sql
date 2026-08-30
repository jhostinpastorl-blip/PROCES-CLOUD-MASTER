-- Product creation and its audit event are one transaction. The browser role
-- cannot write audit_logs directly, so this narrow RPC is the trusted boundary.
create or replace function public.create_pos_product(
  p_company_id uuid,
  p_category_id uuid,
  p_code text,
  p_sku text,
  p_barcode text,
  p_name text,
  p_description text,
  p_type text,
  p_unit text,
  p_price numeric,
  p_cost numeric,
  p_tax_type text,
  p_allows_inventory boolean
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_product_id uuid;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  if not public.is_company_member(p_company_id)
     or not public.has_permission(p_company_id, 'pos.products.manage') then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if p_category_id is not null and not exists (
    select 1
    from public.categories
    where id = p_category_id
      and company_id = p_company_id
      and deleted_at is null
  ) then
    raise exception 'INVALID_CATEGORY' using errcode = '23503';
  end if;

  insert into public.products (
    company_id, category_id, code, sku, barcode, name, description,
    type, unit, price, cost, tax_type, allows_inventory, is_active
  ) values (
    p_company_id, p_category_id, p_code, nullif(p_sku, ''), nullif(p_barcode, ''),
    p_name, nullif(p_description, ''), p_type, p_unit, p_price, p_cost,
    p_tax_type, p_allows_inventory, true
  )
  returning id into v_product_id;

  insert into public.audit_logs (
    company_id, actor_user_id, action, entity_type, entity_id, metadata
  ) values (
    p_company_id,
    auth.uid(),
    'product.created',
    'product',
    v_product_id,
    jsonb_build_object(
      'code', p_code,
      'name', p_name,
      'type', p_type,
      'price', p_price
    )
  );

  return v_product_id;
end;
$$;

revoke all on function public.create_pos_product(
  uuid, uuid, text, text, text, text, text, text, text, numeric, numeric, text, boolean
) from public, anon;
grant execute on function public.create_pos_product(
  uuid, uuid, text, text, text, text, text, text, text, numeric, numeric, text, boolean
) to authenticated;

comment on function public.create_pos_product(
  uuid, uuid, text, text, text, text, text, text, text, numeric, numeric, text, boolean
) is 'Atomically creates a tenant-scoped POS product and its immutable audit event.';
