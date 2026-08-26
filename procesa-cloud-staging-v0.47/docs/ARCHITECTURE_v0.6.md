# Arquitectura Core v0.6
El contexto de empresa/sucursal mejora UX pero no es autorización. Se almacena en cookie HTTP-only y cada operación vuelve a validar membresía/permisos. PostgreSQL/RLS sigue siendo la barrera de datos.
Flujo: sesión -> contexto solicitado -> membresía -> permisos -> límites del plan -> RLS -> mutación -> auditoría.
Super Admin permanece separado. Una cuenta platform_admin no obtiene automáticamente permisos internos de clientes.
