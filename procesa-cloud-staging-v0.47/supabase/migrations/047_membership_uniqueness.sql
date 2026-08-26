-- One logical membership per user/company.
create unique index if not exists uq_company_memberships_company_user
on public.company_memberships(company_id,user_id);

-- Avoid duplicate role bindings.
create unique index if not exists uq_membership_roles_pair
on public.membership_roles(membership_id,role_id);

-- Avoid duplicate role permissions.
create unique index if not exists uq_role_permissions_pair
on public.role_permissions(role_id,permission_id);
