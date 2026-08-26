create index if not exists idx_company_invitations_company_status on public.company_invitations(company_id,status);
create index if not exists idx_company_invitations_email_status on public.company_invitations(lower(email),status);
create unique index if not exists uq_company_invitation_token_hash on public.company_invitations(token_hash) where token_hash is not null;
create index if not exists idx_memberships_company_status on public.company_memberships(company_id,status);
create index if not exists idx_branches_company_active on public.branches(company_id,is_active);
create index if not exists idx_subscriptions_company_status_created on public.subscriptions(company_id,status,created_at desc);
