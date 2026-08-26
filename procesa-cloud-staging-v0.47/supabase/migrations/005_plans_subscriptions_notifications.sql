create table if not exists public.plans(
 id uuid primary key default gen_random_uuid(),code text not null unique,name text not null,
 max_users int,max_branches int,features jsonb not null default '{}'::jsonb,is_active boolean not null default true
);
create table if not exists public.subscriptions(
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id) on delete cascade,
 plan_id uuid not null references public.plans(id),status text not null default 'trial',
 starts_at timestamptz not null default now(),ends_at timestamptz,created_at timestamptz not null default now()
);
create table if not exists public.notifications(
 id uuid primary key default gen_random_uuid(),company_id uuid references public.companies(id) on delete cascade,
 user_id uuid references auth.users(id) on delete cascade,title text not null,body text,read_at timestamptz,created_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;alter table public.notifications enable row level security;
create policy "subscription tenant read" on public.subscriptions for select using(public.is_company_member(company_id));
create policy "notification own read" on public.notifications for select using(user_id=auth.uid() and (company_id is null or public.is_company_member(company_id)));
insert into public.plans(code,name,max_users,max_branches) values
('free','Free',2,1),('lite','Lite',5,1),('pro','Pro',20,5),('business','Business',100,20),('enterprise','Enterprise',null,null)
on conflict(code) do update set name=excluded.name,max_users=excluded.max_users,max_branches=excluded.max_branches;
