# Matriz RLS v0.6
Recursos: companies, memberships, branches, roles, role_permissions, membership_roles, company_modules, subscriptions, notifications, storage_objects, audit_logs.
Para cada recurso probar SELECT/INSERT/UPDATE/DELETE con:
1. usuario miembro con permiso;
2. usuario miembro sin permiso;
3. usuario de otra empresa;
4. usuario autenticado sin membresía;
5. anónimo;
6. platform_admin (no debe heredar acceso empresarial automáticamente salvo operación global explícita).
Resultado esperado: deny-by-default en mutaciones; acceso mínimo necesario.
