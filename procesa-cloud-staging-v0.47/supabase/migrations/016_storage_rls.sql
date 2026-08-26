alter table public.storage_objects enable row level security;
create policy "storage tenant read" on public.storage_objects for select using(public.has_permission(company_id,'storage.read'));
create policy "storage tenant insert" on public.storage_objects for insert with check(public.has_permission(company_id,'storage.manage'));
create policy "storage tenant update" on public.storage_objects for update using(public.has_permission(company_id,'storage.manage')) with check(public.has_permission(company_id,'storage.manage'));
