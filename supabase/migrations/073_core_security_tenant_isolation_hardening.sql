-- PROCESA Cloud · P0 CORE security and tenant-isolation hardening
-- Forward-only. Removes implicit RPC exposure and fixes unsafe definer defaults.

-- These authorization tables already have tenant policies, but the historical
-- chain never enabled RLS on a fresh database. QA masked the omission through
-- out-of-band drift.
alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;

revoke create on schema public from public, anon, authenticated, service_role;

-- Legacy Supabase projects auto-granted every table privilege to API roles.
-- Rebuild the authenticated table contract from the RLS policy commands and
-- leave anon with no direct table or sequence access. SECURITY DEFINER APIs
-- continue to own the mutations that intentionally bypass direct DML.
do $table_grants$
declare
  rel record;
  allowed text[];
begin
  for rel in
    select c.oid, n.nspname, c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r','p','v','m')
  loop
    execute format('revoke all on table %I.%I from anon, authenticated', rel.nspname, rel.relname);

    select array_agg(distinct privilege order by privilege)
      into allowed
    from (
      select unnest(case p.cmd
        when 'SELECT' then array['select']
        when 'INSERT' then array['insert']
        when 'UPDATE' then array['update']
        when 'DELETE' then array['delete']
        when 'ALL' then array['select','insert','update','delete']
        else array[]::text[]
      end) privilege
      from pg_policies p
      where p.schemaname = rel.nspname
        and p.tablename = rel.relname
        and (p.roles @> array['public']::name[] or p.roles @> array['authenticated']::name[])
    ) policy_privileges;

    if cardinality(allowed) > 0 then
      execute format(
        'grant %s on table %I.%I to authenticated',
        array_to_string(allowed,','), rel.nspname, rel.relname
      );
    end if;
  end loop;

  for rel in
    select c.oid, n.nspname, c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'S'
  loop
    execute format('revoke all on sequence %I.%I from anon, authenticated', rel.nspname, rel.relname);
  end loop;
end
$table_grants$;

do $hardening$
declare
  fn record;
  is_trigger boolean;
begin
  for fn in
    select p.oid,
           n.nspname,
           p.proname,
           pg_get_function_identity_arguments(p.oid) as identity_args,
           p.prosecdef,
           coalesce(p.proconfig, array[]::text[]) as config
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
  loop
    -- PostgreSQL grants EXECUTE to PUBLIC on new functions by default. No
    -- public-schema routine in CORE is an unauthenticated API.
    execute format(
      'revoke execute on function %I.%I(%s) from public, anon',
      fn.nspname, fn.proname, fn.identity_args
    );

    select exists(
      select 1 from pg_trigger t
      where t.tgfoid = fn.oid and not t.tgisinternal
    ) into is_trigger;

    -- Trigger entry points must only be reached by their owning trigger.
    if is_trigger then
      execute format(
        'revoke execute on function %I.%I(%s) from authenticated, service_role',
        fn.nspname, fn.proname, fn.identity_args
      );
    end if;

    -- Definer routines inherited from the legacy chain used either an
    -- implicit search_path or only `public`. `public` is intentionally not
    -- writable by API roles; pg_catalog is made explicit and first.
    if fn.prosecdef and (
      not exists(select 1 from unnest(fn.config) c where c like 'search_path=%')
      or exists(select 1 from unnest(fn.config) c where c = 'search_path=public')
    ) then
      execute format(
        'alter function %I.%I(%s) set search_path = pg_catalog, public',
        fn.nspname, fn.proname, fn.identity_args
      );
    end if;
  end loop;
end
$hardening$;

-- Migration/bootstrap helpers are not client APIs. They remain callable by
-- the database owner and service_role, but not by an authenticated browser.
revoke execute on function public.bootstrap_company_roles(uuid) from authenticated;
revoke execute on function public.sync_system_admin_permissions(uuid) from authenticated;

-- Explicitly preserve the authenticated RLS/RBAC helper contract.
grant execute on function public.is_company_member(uuid) to authenticated;
grant execute on function public.has_permission(uuid,text) to authenticated;
grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.company_has_module(uuid,text) to authenticated;
grant execute on function public.membership_can_access_branch(uuid,uuid) to authenticated;
