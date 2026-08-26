# Ataques que RC0 debe intentar
- Cambiar company_id en POST.
- Cambiar membershipId por uno de otro tenant.
- Asignar roleId de otra empresa.
- Reusar token de invitación.
- Aceptar token con correo diferente.
- Forzar branchId de otra empresa en cookie.
- Abrir storage_object de otra empresa.
- Llamar RPC directamente sin permiso.
- Intentar INSERT/UPDATE audit_logs desde cliente.
- Acceder /procesa-admin como administrador de cliente.
- Manipular moduleId para habilitar módulo de otra empresa.
- CSRF desde origen externo en mutaciones.
Todo fallo de aislamiento es release blocker.
