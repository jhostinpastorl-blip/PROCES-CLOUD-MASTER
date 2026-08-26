create or replace function public.assert_company_user_capacity(p_company_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare maxu int; currentu int;
begin
 select p.max_users into maxu
 from public.subscriptions s join public.plans p on p.id=s.plan_id
 where s.company_id=p_company_id and s.status in('trial','active')
 order by s.created_at desc limit 1;
 if maxu is null then return; end if;
 select count(*) into currentu from public.company_memberships where company_id=p_company_id and status='active';
 if currentu>=maxu then raise exception 'PLAN_USER_LIMIT';end if;
end;$$;
revoke all on function public.assert_company_user_capacity(uuid) from public;
grant execute on function public.assert_company_user_capacity(uuid) to authenticated;

create or replace function public.assert_company_branch_capacity(p_company_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare maxb int; currentb int;
begin
 select p.max_branches into maxb
 from public.subscriptions s join public.plans p on p.id=s.plan_id
 where s.company_id=p_company_id and s.status in('trial','active')
 order by s.created_at desc limit 1;
 if maxb is null then return; end if;
 select count(*) into currentb from public.branches where company_id=p_company_id and is_active=true;
 if currentb>=maxb then raise exception 'PLAN_BRANCH_LIMIT';end if;
end;$$;
revoke all on function public.assert_company_branch_capacity(uuid) from public;
grant execute on function public.assert_company_branch_capacity(uuid) to authenticated;
