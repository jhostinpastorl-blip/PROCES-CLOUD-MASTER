# Criterios de aceptación Core RC0
PASS obligatorio:
1. Build y typecheck sin errores.
2. Login/logout/reset password.
3. Empresa A no puede leer ni mutar B.
4. Branch/user limits respetan plan.
5. Invitación válida crea membresía/rol; inválida/expirada/reutilizada falla.
6. Roles y permisos no cruzan tenant.
7. Modules respetan entitlement.
8. Audit se consulta por permiso y no se altera desde cliente.
9. Storage metadata queda tenant-bound.
10. Super Admin separado.
11. Health/readiness/status responden correctamente.
12. UX usable en móvil/tablet/escritorio.
Cualquier fallo cross-tenant, auth o privilegios bloquea release.
