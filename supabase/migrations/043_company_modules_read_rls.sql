alter table public.company_modules enable row level security;
drop policy if exists "company modules tenant read" on public.company_modules;
create policy "company modules tenant read" on public.company_modules
for select using(public.is_company_member(company_id));
