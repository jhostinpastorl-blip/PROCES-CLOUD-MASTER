# Action Contracts v0.36

Objetivo: Server Actions y APIs deben converger a respuestas previsibles.

Formato recomendado:
- éxito: `{ ok: true, data }`
- error de negocio: `{ ok: false, code, message }`

Reglas:
- `message` debe ser seguro para UI;
- logs internos pueden contener contexto técnico sin secretos;
- nunca devolver SQL, stack trace, token o service role;
- empresa/usuario autorizado se resuelve server-side, no se confía en campos ocultos como única protección;
- Zod valida formato, permisos/RLS validan autorización.
