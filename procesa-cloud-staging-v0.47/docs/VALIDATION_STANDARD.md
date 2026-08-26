# Validation Standard v0.36

Capas:
1. HTML/UI para ergonomía;
2. Zod/server para formato y límites;
3. autorización backend para capacidad;
4. PostgreSQL constraints/RLS para integridad final.

Nunca considerar `required`, `disabled` o esconder un botón como control de seguridad.
Esquemas comunes viven en `src/lib/forms/schemas.ts`.
