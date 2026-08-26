# Supabase QA Bootstrap v0.45

## Objetivo
Conectar primero un proyecto **QA**, nunca producción directa.

## Orden
1. Crear proyecto Supabase QA.
2. Configurar variables locales.
3. Aplicar migraciones en orden.
4. Crear usuario Auth inicial.
5. Registrar ese user_id en `public.platform_admins`.
6. Probar `/login`.
7. Probar `/procesa-admin`.
8. Ejecutar matriz Tenant A/B.
9. Solo después preparar producción.

## Variables
- NEXT_PUBLIC_APP_URL
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY (server only)

Nunca subir `.env*` reales a Git.
