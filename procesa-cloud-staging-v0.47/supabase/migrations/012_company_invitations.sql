create table if not exists public.company_invitations(
 id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id) on delete cascade,
 email text not null,role_id uuid references public.roles(id) on delete set null,status text not null default 'pending',
 token_hash text not null unique,expires_at timestamptz not null,invited_by uuid references auth.users(id) on delete set null,
 accepted_by uuid references auth.users(id) on delete set null,accepted_at timestamptz,created_at timestamptz not null default now(),
 constraint invitation_status_ck check(status in('pending','accepted','revoked','expired'))
);
create unique index if not exists company_invite_pending_email_uq on public.company_invitations(company_id,lower(email)) where status='pending';
alter table public.company_invitations enable row level security;
create policy "invites tenant read" on public.company_invitations for select using(public.has_permission(company_id,'users.read') or public.has_permission(company_id,'users.invite'));
create policy "invites tenant insert" on public.company_invitations for insert with check(public.has_permission(company_id,'users.invite'));
create policy "invites tenant update" on public.company_invitations for update using(public.has_permission(company_id,'users.invite'));
