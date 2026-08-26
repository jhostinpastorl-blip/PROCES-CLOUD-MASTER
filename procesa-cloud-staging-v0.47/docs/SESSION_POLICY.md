# Session Policy
- Cliente normal: cierre de sesión local disponible.
- Seguridad de cuenta: opción de cerrar todas las sesiones.
- Cambio de contraseña: revoca otras sesiones.
- Session/Auth data is managed by Supabase Auth.
- Nunca almacenar access/refresh tokens en logs o Drive.
- Sensitive authenticated routes are no-store.
