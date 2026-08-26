# Ejecución manual RC0
1. npm ci
2. npm run typecheck
3. npm run build
4. Aplicar migraciones a Supabase QA.
5. Crear datos según docs/TEST_DATA_PLAN.md.
6. Ejecutar tests/security/tenant-isolation.md.
7. Ejecutar tests/security/rls-matrix.md.
8. Ejecutar tests/security/attack-cases.md.
9. Probar login/reset/invite/accept/revoke.
10. Probar límites Free/Lite/Pro.
11. Probar /api/health /api/ready /api/status /api/version.
12. Registrar evidencia PASS/FAIL.
