alter table public.notifications enable row level security;
drop policy if exists "notifications tenant read" on public.notifications;
create policy "notifications tenant read" on public.notifications
for select using(
  public.is_company_member(company_id)
  and (user_id is null or user_id=auth.uid())
);
drop policy if exists "notifications own update" on public.notifications;
create policy "notifications own update" on public.notifications
for update using(
  public.is_company_member(company_id)
  and (user_id is null or user_id=auth.uid())
) with check(
  public.is_company_member(company_id)
  and (user_id is null or user_id=auth.uid())
);
