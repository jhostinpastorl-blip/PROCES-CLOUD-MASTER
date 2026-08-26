alter table public.plans add column if not exists module_codes text[] not null default array['core']::text[];
update public.plans set module_codes=array['core'] where code='free';
update public.plans set module_codes=array['core','pos'] where code='lite';
update public.plans set module_codes=array['core','pos','inventory'] where code='pro';
update public.plans set module_codes=array['core','pos','inventory','rest','docs','cobros'] where code='business';
update public.plans set module_codes=array['core','pos','inventory','rest','docs','cobros','conta','flow','rrhh','tickets','forms','viernes'] where code='enterprise';
create or replace function public.company_has_module(p_company_id uuid,p_code text) returns boolean language sql stable security definer set search_path=public as $$
 select public.is_company_member(p_company_id) and (
 exists(select 1 from public.company_modules cm join public.modules m on m.id=cm.module_id where cm.company_id=p_company_id and cm.enabled=true and m.code=p_code)
 or exists(select 1 from public.subscriptions s join public.plans p on p.id=s.plan_id where s.company_id=p_company_id and s.status in('trial','active') and p_code=any(p.module_codes))
 );
$$;
revoke all on function public.company_has_module(uuid,text) from public;grant execute on function public.company_has_module(uuid,text) to authenticated;
