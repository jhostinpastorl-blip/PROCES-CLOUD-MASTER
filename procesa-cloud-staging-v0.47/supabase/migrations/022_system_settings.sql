create table if not exists public.system_settings(
 key text primary key,value jsonb not null default '{}'::jsonb,is_public boolean not null default false,updated_at timestamptz not null default now()
);
alter table public.system_settings enable row level security;
create policy "public settings read" on public.system_settings for select using(is_public=true or public.is_platform_admin());
insert into public.system_settings(key,value,is_public) values
('brand','{"name":"PROCESA Cloud","company":"PROCESA CORP","primaryColor":"#1b2c54","slogan":"El futuro se procesa hoy."}'::jsonb,true),
('maintenance','{"enabled":false}'::jsonb,true)
on conflict(key) do nothing;
