# Deployment checklist
## QA
1. Crear Supabase QA.
2. Configurar variables sin subir secretos al repo.
3. Ejecutar migraciones en orden.
4. Crear Tenant A y Tenant B.
5. Ejecutar matriz RLS y flujos Auth/Invitations.
6. Ejecutar npm ci, typecheck y build.
7. Probar /api/health y /api/ready.
## Staging público
1. Conectar GitHub.
2. Conectar Cloudflare/DNS/TLS.
3. Rate limit login, demo y endpoints sensibles.
4. Revisar CSP/headers y cookies secure.
5. Conectar Google Drive API server-side.
6. Probar upload/metadata/delete lógico.
## Producción
No promover si falla una prueba cross-tenant, autorización, recuperación, invitación o build.
