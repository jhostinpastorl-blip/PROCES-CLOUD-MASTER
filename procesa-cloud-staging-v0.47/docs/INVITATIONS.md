# Invitaciones
Las invitaciones usan SUPABASE_SERVICE_ROLE_KEY exclusivamente en servidor. Nunca usar NEXT_PUBLIC para esa clave.
Antes de producción debe completarse el callback que convierte la invitación aceptada en company_membership activa y elimina/valida pending_company_id. La metadata de invitación no es autorización: el backend debe validar un registro de invitación persistente.
