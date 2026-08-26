create table if not exists public.platform_admins(user_id uuid primary key references auth.users(id) on delete cascade,is_active boolean not null default true,created_at timestamptz not null default now());
alter table public.platform_admins enable row level security;
create or replace function public.is_platform_admin() returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from public.platform_admins p where p.user_id=auth.uid() and p.is_active=true)$$;
revoke all on function public.is_platform_admin() from public;grant execute on function public.is_platform_admin() to authenticated;
create policy "platform admin self read" on public.platform_admins for select using(user_id=auth.uid() and is_active=true);
