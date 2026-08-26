create table if not exists public.onboarding_states(
 user_id uuid primary key references auth.users(id) on delete cascade,
 current_step text not null default 'plan',
 selected_plan_code text,
 company_id uuid references public.companies(id) on delete set null,
 selected_module_codes text[] not null default '{}',
 completed_at timestamptz,
 updated_at timestamptz not null default now(),
 constraint onboarding_step_ck check(current_step in('plan','company','modules','branch','complete'))
);
alter table public.onboarding_states enable row level security;
create policy "own onboarding read" on public.onboarding_states for select using(user_id=auth.uid());
create policy "own onboarding insert" on public.onboarding_states for insert with check(user_id=auth.uid());
create policy "own onboarding update" on public.onboarding_states for update using(user_id=auth.uid()) with check(user_id=auth.uid());
