-- Prevent cross-tenant role assignment at database level.
create or replace function public.assert_membership_role_same_company()
returns trigger language plpgsql set search_path=public as $$
declare membership_company uuid; role_company uuid;
begin
 select company_id into membership_company from public.company_memberships where id=new.membership_id;
 select company_id into role_company from public.roles where id=new.role_id;
 if membership_company is null or role_company is null or membership_company<>role_company then
   raise exception 'CROSS_TENANT_ROLE_ASSIGNMENT';
 end if;
 return new;
end;$$;

drop trigger if exists trg_membership_role_same_company on public.membership_roles;
create trigger trg_membership_role_same_company
before insert or update on public.membership_roles
for each row execute function public.assert_membership_role_same_company();
