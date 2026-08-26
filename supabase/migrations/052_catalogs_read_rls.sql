-- Migration 052: Enable catalog read policies for modules, plans, and permissions, plus user self profile management
alter table if exists public.modules enable row level security;
alter table if exists public.plans enable row level security;
alter table if exists public.permissions enable row level security;
alter table if exists public.profiles enable row level security;

drop policy if exists "modules catalog read" on public.modules;
create policy "modules catalog read" on public.modules for select using (true);

drop policy if exists "plans catalog read" on public.plans;
create policy "plans catalog read" on public.plans for select using (true);

drop policy if exists "permissions catalog read" on public.permissions;
create policy "permissions catalog read" on public.permissions for select using (true);

drop policy if exists "profiles own insert" on public.profiles;
create policy "profiles own insert" on public.profiles for insert with check (id = auth.uid());

drop policy if exists "profiles own update" on public.profiles;
create policy "profiles own update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
