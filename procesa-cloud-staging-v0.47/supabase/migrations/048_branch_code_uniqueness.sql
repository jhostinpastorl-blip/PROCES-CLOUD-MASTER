-- Branch code must be unique inside a tenant, not globally.
create unique index if not exists uq_branches_company_code
on public.branches(company_id,upper(code))
where is_active=true;
