# RC0 Data Integrity v0.32

Reglas reforzadas:
- membresías activas son la única fuente de acceso tenant;
- suspensión/retiro revocan acceso efectivo;
- membership_roles no puede relacionar empresas distintas;
- permisos se asignan a roles, no directamente por nombre de usuario;
- repositorio oficial normalizado a `PROCESA-CLOUDE`.

Estas reglas deben verificarse en Supabase QA con intentos directos de INSERT/UPDATE.
