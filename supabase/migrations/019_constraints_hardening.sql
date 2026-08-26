alter table public.company_memberships add constraint memberships_status_ck check(status in('invited','active','suspended','removed')) not valid;
alter table public.subscriptions add constraint subscriptions_status_ck check(status in('trial','active','past_due','cancelled','expired')) not valid;
alter table public.modules add constraint modules_status_ck check(status in('available','development','planned','disabled')) not valid;
alter table public.storage_objects add constraint storage_size_ck check(size_bytes is null or size_bytes>=0) not valid;
create index if not exists company_modules_enabled_idx on public.company_modules(company_id,enabled);
create index if not exists audit_actor_created_idx on public.audit_logs(actor_user_id,created_at desc);
