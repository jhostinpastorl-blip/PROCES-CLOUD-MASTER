create table if not exists public.membership_roles(
 membership_id uuid references public.company_memberships(id) on delete cascade,
 role_id uuid references public.roles(id) on delete cascade,
 primary key(membership_id,role_id)
);
alter table public.membership_roles enable row level security;

create or replace function public.get_my_company_contexts()
returns table("membershipId" uuid,"companyId" uuid,"companyName" text,"roleCodes" text[],"permissions" text[])
language sql stable security definer set search_path=public as $$
 select cm.id, c.id, c.name,
 coalesce(array_agg(distinct r.name) filter(where r.id is not null),'{}'),
 coalesce(array_agg(distinct p.code) filter(where p.id is not null),'{}')
 from public.company_memberships cm
 join public.companies c on c.id=cm.company_id
 left join public.membership_roles mr on mr.membership_id=cm.id
 left join public.roles r on r.id=mr.role_id
 left join public.role_permissions rp on rp.role_id=r.id
 left join public.permissions p on p.id=rp.permission_id
 where cm.user_id=auth.uid() and cm.status='active'
 group by cm.id,c.id,c.name;
$$;
revoke all on function public.get_my_company_contexts() from public;
grant execute on function public.get_my_company_contexts() to authenticated;

insert into public.permissions(code,description) values
('company.read','Ver empresa'),('company.update','Editar empresa'),('branches.read','Ver sucursales'),
('branches.manage','Administrar sucursales'),('users.read','Ver usuarios'),('users.invite','Invitar usuarios'),
('roles.read','Ver roles'),('roles.manage','Administrar roles'),('modules.read','Ver módulos'),
('modules.manage','Administrar módulos'),('audit.read','Ver auditoría'),('subscription.read','Ver suscripción')
on conflict(code) do nothing;
