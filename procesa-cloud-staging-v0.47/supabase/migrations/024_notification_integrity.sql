alter table public.notifications add column if not exists type text not null default 'info';
alter table public.notifications add constraint notifications_type_ck check(type in('info','success','warning','error','action')) not valid;
create index if not exists notifications_company_created_idx on public.notifications(company_id,created_at desc);
