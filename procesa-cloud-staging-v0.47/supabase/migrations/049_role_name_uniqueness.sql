-- Prevent duplicate active role names within the same tenant.
create unique index if not exists uq_roles_company_name
on public.roles(company_id,lower(name));
