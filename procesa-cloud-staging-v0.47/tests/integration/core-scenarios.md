# Core integration scenarios v0.8
1. Admin A crea sucursal dentro del límite -> éxito + audit.
2. Admin A excede max_branches -> PLAN_BRANCH_LIMIT.
3. Admin A invita correo con rol de Empresa A -> invitation pending.
4. Usuario con correo distinto intenta token -> rechazo.
5. Token expirado -> rechazo y estado expired.
6. Token válido -> membership activa + rol + accepted.
7. Reuso de token aceptado -> rechazo.
8. Empresa B no puede listar invitaciones de A.
9. Usuario sin users.invite no puede insertar invitaciones.
10. Límite max_users bloquea nueva invitación.
11. Cambio settings sin company.update -> rechazo.
12. Rol de otra empresa no puede asignarse a invitación.
13. Cliente no accede procesa-admin.
14. platform_admin no obtiene datos internos de tenant por defecto.
