# Gate para declarar Core MVP
No pasar a POS como dependencia estable hasta cumplir:
- Migraciones aplicadas en entorno Supabase de QA.
- 2 empresas, 3 usuarios y roles de prueba.
- Matriz RLS ejecutada.
- Invitación/aceptación probada.
- límites de usuarios/sucursales probados.
- recuperación de contraseña probada.
- Super Admin aislado.
- auditoría visible para acciones críticas.
- DriveProvider probado con archivos no sensibles.
- build/typecheck/tests en CI.
- rate limiting login/demo.
- revisión responsive.
Se puede diseñar POS en paralelo, pero no acoplarlo a un Core no validado.
