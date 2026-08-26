create index if not exists memberships_company_status_idx on public.company_memberships(company_id,status);
create index if not exists invitations_company_status_idx on public.company_invitations(company_id,status,created_at desc);
create index if not exists notifications_user_read_idx on public.notifications(user_id,read_at,created_at desc);
create index if not exists branches_company_active_idx on public.branches(company_id,is_active);
create index if not exists storage_company_created_idx on public.storage_objects(company_id,created_at desc);
