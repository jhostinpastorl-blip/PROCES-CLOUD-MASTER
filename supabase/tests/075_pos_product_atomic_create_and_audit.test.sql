begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(5);

select extensions.ok(
  to_regprocedure('public.create_pos_product(uuid,uuid,text,text,text,text,text,text,text,numeric,numeric,text,boolean)') is not null,
  'atomic POS product creation RPC exists'
);

select extensions.is(
  has_function_privilege('authenticated', 'public.create_pos_product(uuid,uuid,text,text,text,text,text,text,text,numeric,numeric,text,boolean)', 'EXECUTE'),
  true,
  'authenticated users can execute the guarded product RPC'
);

select extensions.is(
  has_function_privilege('anon', 'public.create_pos_product(uuid,uuid,text,text,text,text,text,text,text,numeric,numeric,text,boolean)', 'EXECUTE'),
  false,
  'anonymous users cannot execute the product RPC'
);

select extensions.ok(
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'create_pos_product'
      and p.prosecdef
      and p.proconfig @> array['search_path=pg_catalog, public']::text[]
  ),
  'product RPC is SECURITY DEFINER with a safe explicit search_path'
);

select extensions.ok(
  to_regprocedure('public.append_tenant_audit_event(uuid,text,text,uuid,jsonb)') is null,
  'no generic browser-callable audit appender remains exposed'
);

select * from extensions.finish();

rollback;
