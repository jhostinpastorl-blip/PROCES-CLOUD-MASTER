create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text not null,
  trade_name text,
  status text not null default 'active' check (status in ('active','suspended','archived')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_memberships (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('invited','active','suspended')),
  created_at timestamptz not null default now(),
  unique(company_id,user_id)
);
create index if not exists idx_memberships_user on public.company_memberships(user_id, company_id);

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  code text,
  active boolean not null default true,
  is_active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  unique(company_id, code)
);
create index if not exists idx_branches_company on public.branches(company_id);

create table if not exists public.demo_requests (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_name text not null,
  email text not null,
  phone text,
  modules text[] not null default '{}',
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create table if not exists public.storage_objects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  provider text not null,
  provider_object_id text not null,
  logical_path text not null,
  original_name text not null,
  mime_type text,
  size_bytes bigint,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_storage_company on public.storage_objects(company_id, created_at desc);
