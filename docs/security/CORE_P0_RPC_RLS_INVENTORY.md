# CORE P0 — RPC, RLS and tenant-isolation inventory

Audit date: 2026-08-28  
Target inspected: **PROCESA CLOUD QA** (`mejdlosvafeklzqqdudh`)  
Production target: protected; no write was performed.

## Gate evidence

- QA contains the functional schema through CPE/returns but has no
  `supabase_migrations.schema_migrations` relation and the management API
  reports zero migrations. This is migration-history drift, not a clean 001–072 chain.
- Before hardening QA exposed 68 public-schema functions: 66 were
  `SECURITY DEFINER`, all 68 were executable by `anon` and `authenticated`,
  and 14 definers had no explicit `search_path`.
- Legacy automatic table grants also gave `anon` broad privileges on CORE
  tables. RLS limited row visibility, but minimum privilege was not satisfied.
- Migrations 071 and 072 each executed successfully in a real QA PostgreSQL
  transaction and were rolled back. The combined 072 + 073 security state and
  26 tenant-isolation assertions also executed successfully and were rolled back.

## Function classification after 072

The intended role is authoritative. `PUBLIC` and `anon` receive EXECUTE on none
of these functions. Trigger-only functions also receive no API-role EXECUTE.

| Class | Count | Intended grant | Functions (every public-schema function) |
|---|---:|---|---|
| PUBLIC_API | 0 | none | None. Demo intake remains a trusted-server concern. |
| AUTHENTICATED_API | 43 | `authenticated`, `service_role` | `accept_company_invitation`, `activate_solution_package`, `assign_role_to_member`, `can_company_operate`, `check_module_entitlement`, `close_cash_session`, `complete_activation_foundation`, `create_company_invitation`, `create_company_with_owner`, `create_company_with_trial`, `create_core_notification`, `create_credit_note_from_return`, `create_electronic_document_from_sale`, `create_first_branch`, `create_inventory_adjustment`, `create_inventory_transfer`, `create_pos_purchase`, `create_pos_sale`, `create_purchase_return`, `create_sale_return`, `get_company_plan`, `get_my_company_contexts`, `get_next_fiscal_correlative`, `get_pos_cash_report`, `get_pos_dashboard_kpis`, `get_pos_inventory_report`, `get_pos_product_report`, `get_pos_purchases_report`, `get_pos_sales_report`, `get_product_kardex`, `get_x_report`, `get_z_report`, `mark_all_notifications_read`, `mark_notification_read`, `open_cash_session`, `record_cpe_submission_result`, `remove_company_member`, `revoke_company_invitation`, `set_initial_company_modules`, `set_initial_stock`, `set_membership_branch_scope`, `suspend_company_member`, `void_sale` |
| RLS_RBAC_HELPER | 5 | `authenticated`, `service_role` | `company_has_module`, `has_permission`, `is_company_member`, `is_platform_admin`, `membership_can_access_branch` |
| INTERNAL_ONLY | 6 | owner / `service_role`; no browser grant for bootstrap helpers | `assert_company_branch_capacity`, `assert_company_can_operate`, `assert_company_user_capacity`, `assert_not_last_admin`, `bootstrap_company_roles`, `sync_system_admin_permissions` |
| TRIGGER_ONLY | 18 | owner through trigger only | `assert_membership_role_same_company`, `check_company_module_entitlement`, `protect_last_platform_admin`, `touch_onboarding_updated_at`, `trg_check_cpe_immutability`, `trg_prevent_adjustment_item_mutation`, `trg_prevent_adjustment_mutation`, `trg_prevent_completed_purchase_return_mutation`, `trg_prevent_completed_sale_mutation`, `trg_prevent_completed_sale_return_mutation`, `trg_prevent_confirmed_purchase_item_mutation`, `trg_prevent_confirmed_purchase_mutation`, `trg_prevent_cpe_delete`, `trg_prevent_inventory_movement_mutation`, `trg_prevent_purchase_return_item_mutation`, `trg_prevent_sale_return_item_mutation`, `trg_prevent_transfer_item_mutation`, `trg_prevent_transfer_mutation` |

`check_module_entitlement` is retained as an authenticated API because the live
application calls it. The two bootstrap helpers have their browser grant revoked.
All other authenticated APIs still enforce membership, permission, entitlement,
or platform-admin checks in their bodies; this gate does not convert them to
anonymous or public entry points.

## Table and policy contract

Migration 073 applies these invariants:

1. `anon` has no direct public-schema table, sequence or function privileges.
2. `authenticated` table privileges are regenerated only for operations that
   have a matching `authenticated` or legacy `public` RLS policy.
3. All public tables remain RLS-enabled.
4. Trigger functions are not callable as RPCs.
5. Legacy definers with missing or `public`-only paths use
   `pg_catalog, public`; 072 functions retain the stricter empty path.
6. `public` schema CREATE stays revoked from `PUBLIC`, `anon`,
   `authenticated`, and `service_role`.

## Executed tenant matrix

| Case | Result |
|---|---|
| Tenant A reads Tenant B branches, business profile, activation or branch scope | denied / zero rows |
| Tenant A activates a package for Tenant B | `FORBIDDEN_PERMISSION` |
| Tenant A assigns a Tenant B branch into Tenant A scope | `BRANCH_NOT_IN_COMPANY` |
| `SPECIFIC_BRANCHES` with one allowed branch | only that branch visible |
| `ALL_BRANCHES` | all active branches in the same company visible |
| Legacy membership without a scope row | backward-compatible all-branch access |
| Suspended membership | denied |
| Authenticated outsider | denied |
| RBAC and module checks against another tenant | false / no disclosure |

## Remaining gate

072 and 073 are repository-ready and transaction-verified, but are deliberately
not persisted to QA while the historical 001–070 migration baseline is absent.
A maintainer must first establish an evidence-backed baseline or rebuild QA from
the repository chain. Faking migration rows or applying only the tail would make
the drift harder to recover.

The supplied Google Drive portfolio is explicitly recorded as **pending future
portfolio audit** and was not reviewed in this gate.
