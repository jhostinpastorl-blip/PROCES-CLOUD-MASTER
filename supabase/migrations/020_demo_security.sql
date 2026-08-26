alter table public.demo_requests enable row level security;
-- Public/anon submission is intentionally not granted directly.
-- Production demo intake should run through a trusted server endpoint/function with rate limiting.
revoke insert,update,delete,select on public.demo_requests from anon;
