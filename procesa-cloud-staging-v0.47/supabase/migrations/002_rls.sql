create or replace function public.is_company_member(target_company uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.company_memberships m
    where m.company_id = target_company and m.user_id = auth.uid() and m.status = 'active'
  );
$$;

alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.company_memberships enable row level security;
alter table public.branches enable row level security;
alter table public.storage_objects enable row level security;

create policy profiles_self_select on public.profiles for select using (id = auth.uid());
create policy companies_member_select on public.companies for select using (public.is_company_member(id));
create policy memberships_member_select on public.company_memberships for select using (user_id = auth.uid() or public.is_company_member(company_id));
create policy branches_member_select on public.branches for select using (public.is_company_member(company_id));
create policy storage_member_select on public.storage_objects for select using (public.is_company_member(company_id));
