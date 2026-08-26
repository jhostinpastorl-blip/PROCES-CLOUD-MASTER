-- role_permissions is global permission catalog + tenant role.
-- Ensure referenced permission exists and role is valid; FK remains primary guard.
create index if not exists idx_role_permissions_role on public.role_permissions(role_id);
create index if not exists idx_role_permissions_permission on public.role_permissions(permission_id);
create index if not exists idx_roles_company_system on public.roles(company_id,is_system);
