create or replace function public.create_company_with_trial(p_name text,p_legal_name text,p_tax_id text,p_currency text,p_timezone text,p_plan_code text)
returns uuid language plpgsql security definer set search_path=public as $$
declare cid uuid;mid uuid;rid uuid;pid uuid;
begin
 if auth.uid() is null then raise exception 'unauthenticated';end if;
 select id into pid from public.plans where code=p_plan_code and is_active=true;
 if pid is null then raise exception 'invalid plan';end if;
 insert into public.companies(name,legal_name,tax_id,currency,timezone,status) values(p_name,p_legal_name,p_tax_id,p_currency,p_timezone,'active') returning id into cid;
 insert into public.company_memberships(company_id,user_id,status) values(cid,auth.uid(),'active') returning id into mid;
 insert into public.roles(company_id,name,is_system) values(cid,'Administrador',true) returning id into rid;
 insert into public.membership_roles(membership_id,role_id) values(mid,rid);
 insert into public.role_permissions(role_id,permission_id) select rid,id from public.permissions;
 insert into public.subscriptions(company_id,plan_id,status,starts_at,ends_at) values(cid,pid,'trial',now(),now()+interval '14 days');
 return cid;
end;$$;
revoke all on function public.create_company_with_trial(text,text,text,text,text,text) from public;grant execute on function public.create_company_with_trial(text,text,text,text,text,text) to authenticated;

create or replace function public.set_initial_company_modules(p_company_id uuid,p_codes text[])
returns void language plpgsql security definer set search_path=public as $$
declare allowed text[];
begin
 if not public.has_permission(p_company_id,'modules.manage') then raise exception 'forbidden';end if;
 select p.module_codes into allowed from public.subscriptions s join public.plans p on p.id=s.plan_id where s.company_id=p_company_id and s.status in('trial','active') order by s.created_at desc limit 1;
 if allowed is null then raise exception 'no active plan';end if;
 if exists(select 1 from unnest(p_codes) x where not(x=any(allowed))) then raise exception 'module not entitled';end if;
 insert into public.company_modules(company_id,module_id,enabled)
 select p_company_id,m.id,true from public.modules m where m.code=any(p_codes)
 on conflict(company_id,module_id) do update set enabled=true;
end;$$;
revoke all on function public.set_initial_company_modules(uuid,text[]) from public;grant execute on function public.set_initial_company_modules(uuid,text[]) to authenticated;
