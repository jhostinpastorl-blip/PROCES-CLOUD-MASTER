# Auth / session matrix v0.30

PASS requerido:
1. Login válido crea sesión.
2. Login inválido no revela si el correo existe.
3. Password reset siempre responde de forma neutral.
4. Link de reset permite cambiar contraseña.
5. Cambiar contraseña cierra otras sesiones.
6. "Cerrar todas mis sesiones" revoca sesiones globales.
7. Rutas `/app/*` no se cachean.
8. Rutas `/procesa-admin/*` no se cachean.
9. Usuario suspendido no obtiene contexto activo válido.
10. Usuario removido no obtiene acceso a tenant.
11. Headers no revelan secretos.
12. Error público no contiene SQL/stack trace.
