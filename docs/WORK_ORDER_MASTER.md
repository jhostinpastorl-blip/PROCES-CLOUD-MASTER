# PROCESA Cloud — Orden Maestro de Trabajo

## ETAPA 1 — CORE RC0
Objetivo: cerrar arquitectura, seguridad, onboarding, roles, planes, auditoría y límites.
Salida requerida:
- migraciones versionadas;
- auth;
- empresas/membresías;
- sucursales;
- roles/permisos;
- módulos/planes;
- onboarding;
- invitaciones;
- auditoría;
- Super Admin;
- UX premium;
- pruebas definidas.

Estado: EN PROGRESO.

## ETAPA 2 — GITHUB
Objetivo: convertir el staging actual en repositorio oficial.
Salida:
- repo procesa-cloud;
- main protegida;
- CI;
- package-lock;
- PR workflow;
- versionado real.

No saltar a producción sin esta etapa.

## ETAPA 3 — SUPABASE QA
Objetivo: ejecutar Core contra infraestructura real.
Salida:
- proyecto QA;
- env seguros;
- migraciones aplicadas;
- Auth operativo;
- seeds sintéticos;
- logs de errores reales.

## ETAPA 4 — SECURITY / MULTITENANCY QA
Objetivo: demostrar aislamiento real.
Salida:
- Empresa A / B;
- matriz RLS;
- ataques cross-tenant;
- invitaciones;
- permisos;
- límites;
- Super Admin separado;
- PASS/FAIL documentado.

Fallo cross-tenant = release blocker.

## ETAPA 5 — GOOGLE DRIVE PROVIDER
Objetivo: usar Drive para documentos/archivos.
Salida:
- credenciales server-side;
- StorageProvider real;
- upload/download/delete;
- metadata en PostgreSQL;
- auditoría;
- exportaciones y snapshots.

## ETAPA 6 — CLOUDFLARE STAGING
Objetivo: tener web pública de pruebas.
Salida:
- DNS/TLS;
- deployment;
- headers;
- rate limiting;
- staging protegido;
- health/readiness.

## ETAPA 7 — CORE BETA
Objetivo: permitir uso real de primeros clientes piloto.
Salida:
- onboarding probado;
- soporte;
- recuperación;
- backups;
- documentación;
- rollback;
- monitoreo mínimo.

## ETAPA 8 — POS CLOUD
Solo después del Core Beta.
Orden POS:
1 productos/categorías;
2 clientes/proveedores;
3 almacenes/inventario;
4 compras;
5 caja;
6 ventas;
7 comprobantes;
8 reportes;
9 configuración;
10 QA integral.

## REGLA
No iniciar REST/CONTA/FLOW antes de que POS y Core tengan contratos estables.
