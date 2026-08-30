-- Reproducible per-function P0 inventory. Read-only.
with routines as (
  select p.oid,
         n.nspname as schema_name,
         p.proname as function_name,
         pg_get_function_identity_arguments(p.oid) as signature,
         pg_get_userbyid(p.proowner) as owner,
         case when p.prosecdef then 'DEFINER' else 'INVOKER' end as security_mode,
         coalesce((select replace(c,'search_path=','') from unnest(coalesce(p.proconfig,array[]::text[])) c where c like 'search_path=%'),'IMPLICIT') as search_path,
         pg_get_functiondef(p.oid) as body,
         exists(select 1 from pg_trigger t where t.tgfoid=p.oid and not t.tgisinternal) as is_trigger
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
), classified as (
  select r.*,
         case
           when is_trigger then 'TRIGGER_ONLY'
           when function_name in('is_company_member','has_permission','is_platform_admin','company_has_module','membership_can_access_branch') then 'AUTHENTICATED_API:RLS_RBAC_HELPER'
           when function_name in('assert_company_branch_capacity','assert_company_can_operate','assert_company_user_capacity','assert_not_last_admin','bootstrap_company_roles','sync_system_admin_permissions') then 'INTERNAL_ONLY'
           else 'AUTHENTICATED_API'
         end as classification
  from routines r
)
select c.schema_name,
       c.function_name,
       c.signature,
       c.owner,
       c.security_mode,
       c.search_path,
       c.classification,
       has_function_privilege('public',c.oid,'execute') as public_execute,
       has_function_privilege('anon',c.oid,'execute') as anon_execute,
       has_function_privilege('authenticated',c.oid,'execute') as authenticated_execute,
       has_function_privilege('service_role',c.oid,'execute') as service_role_execute,
       case when c.function_name = any(array[
         'accept_company_invitation','activate_solution_package','assign_role_to_member','can_company_operate',
         'check_module_entitlement','close_cash_session','complete_activation_foundation','company_has_module',
         'create_company_invitation','create_company_with_trial','create_core_notification','create_credit_note_from_return',
         'create_electronic_document_from_sale','create_first_branch','create_inventory_adjustment','create_inventory_transfer',
         'create_pos_purchase','create_pos_sale','create_purchase_return','create_sale_return','get_company_plan',
         'get_my_company_contexts','get_next_fiscal_correlative','get_pos_cash_report','get_pos_dashboard_kpis',
         'get_pos_inventory_report','get_pos_product_report','get_pos_purchases_report','get_pos_sales_report',
         'get_product_kardex','get_x_report','get_z_report','is_platform_admin','mark_all_notifications_read',
         'mark_notification_read','membership_can_access_branch','open_cash_session','platform_change_plan',
         'platform_extend_trial','platform_reactivate_subscription','platform_suspend_subscription',
         'record_cpe_submission_result','remove_company_member','revoke_company_invitation',
         'set_initial_company_modules','set_initial_stock','set_membership_branch_scope','suspend_company_member','void_sale'
       ]) then 'DIRECT_APP_OR_QA_CALL' else 'DB_INTERNAL' end as application_usage,
       coalesce((select string_agg(relname,',' order by relname) from pg_class rel join pg_namespace rn on rn.oid=rel.relnamespace
                 where rn.nspname='public' and rel.relkind in('r','p') and c.body ilike '%public.'||rel.relname||'%'),'') as referenced_tables,
       coalesce((select string_agg(relname,',' order by relname) from pg_class rel join pg_namespace rn on rn.oid=rel.relnamespace
                 where rn.nspname='public' and rel.relkind in('r','p') and (
                   c.body ilike '%insert into public.'||rel.relname||'%'
                   or c.body ilike '%update public.'||rel.relname||'%'
                   or c.body ilike '%delete from public.'||rel.relname||'%'
                 )),'') as modified_tables,
       c.body ilike '%auth.uid()%' as validates_auth_uid,
       c.body ilike '%company_id%' as handles_company_context,
       (c.body ilike '%is_company_member%' or c.body ilike '%company_memberships%') as validates_membership,
       (c.body ilike '%has_permission%' or c.body ilike '%is_platform_admin%') as validates_permission,
       (c.body ilike '%company_has_module%' or c.body ilike '%entitle%' or c.body ilike '%module_codes%') as validates_entitlement,
       case
         when c.is_trigger then 'TRIGGER_CONTROLLED'
         when has_function_privilege('anon',c.oid,'execute') then 'HIGH_ANON_EXPOSURE'
         when c.security_mode='DEFINER' and c.search_path='IMPLICIT' then 'HIGH_UNSAFE_DEFINER_PATH'
         when c.security_mode='DEFINER' and not(c.body ilike '%auth.uid()%' or c.body ilike '%is_platform_admin%') then 'REVIEW_CALL_CHAIN'
         else 'CONTROLLED_BY_ROUTINE_GUARDS'
       end as cross_tenant_risk
from classified c
order by c.classification,c.function_name,c.signature;
