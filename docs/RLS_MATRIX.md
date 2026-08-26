# PROCESA CLOUD — MATRIZ DE SEGURIDAD RLS

| Tabla | SELECT | INSERT | UPDATE | DELETE | Control Plane |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `companies` | Miembros activos | Registro/Onboarding | Admin empresa (`company.edit`) | Inhabilitado (Soft) | Lectura / Modificación |
| `company_memberships` | Miembros activos | Invitación aceptada | Admin empresa | Prohibido último admin | Lectura global |
| `branches` | Miembros activos | Admin (`branches.manage`) | Admin (`branches.manage`) | Prohibido (is_active=false) | Lectura global |
| `roles` | Miembros activos | Admin (`roles.manage`) | Admin (`roles.manage`) | Prohibido roles default | Lectura global |
| `company_modules` | Miembros activos | Admin (`modules.manage`) | Admin (`modules.manage`) | Prohibido | Lectura global |
| `subscriptions` | Miembros activos | Prohibido tenant | Prohibido tenant | Prohibido | Lectura / Modificación |
| `plans` | Todos autenticados | Prohibido tenant | Prohibido tenant | Prohibido | Modificación |
| `notifications` | Propietario / Empresa | Sistema (`SECURITY DEFINER`)| Marcar leída (`read_at`) | Prohibido | Lectura global |
| `audit_logs` | Admin (`audit.read`) | Sistema (Solo Append) | Prohibido (Trigger) | Prohibido (Trigger) | Prohibido |
| `platform_admins` | Platform Admins | Prohibido tenant | Prohibido tenant | Prohibido último admin | Modificación Super Admin |
| `platform_audit_logs`| Platform Admins | Sistema (Solo Append) | Prohibido | Prohibido | Prohibido |
| `user_onboarding_states`| Propietario (`user_id`)| Propietario (`user_id`)| Propietario (`user_id`)| Prohibido | Lectura global |
| `system_jobs` | Platform Admins | Sistema / Background | Worker de jobs | Prohibido | Lectura global |
| `sent_emails_log` | Platform Admins | Servicio de Email | Prohibido | Prohibido | Lectura global |
| `feature_flags` | Todos autenticados | Platform Admins | Platform Admins | Prohibido | Modificación Super Admin |
| `notification_preferences`| Propietario (`user_id`)| Propietario (`user_id`)| Propietario (`user_id`)| Prohibido | Lectura global |
| `billing_customers` | Platform Admins | Platform Admins | Platform Admins | Prohibido | Modificación |
| `billing_webhook_events`| Platform Admins | Webhook Handler | Webhook Handler | Prohibido | Lectura global |
