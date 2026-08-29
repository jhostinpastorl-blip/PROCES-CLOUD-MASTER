# CORE SaaS 1 — Activation Foundation

## Estado

**IMPLEMENTED:** código y migraciones 072/073 en `develop/procesacloudv2`.

**STATICALLY VERIFIED:** compatibilidad, dependencias, RLS, grants y regresión de
aplicación revisados en repositorio.

**DATABASE VERIFIED:** Core CI #18 creó PostgreSQL 17 desde cero, aplicó 001–073
en orden y completó pgTAP 26/26. Además, 071, 072 y el estado combinado 072+073
ejecutaron en PROCESA CLOUD QA dentro de transacciones revertidas.

**PRODUCTION VERIFIED:** no. Producción no fue modificada. 072/073 tampoco se
persistieron en QA porque esa base no registra el historial 001–071. El gate de
cadena limpia autoriza planificar una reconstrucción QA paralela, no modificar
la base con drift ni desplegar MAIN.

## Decisiones

- `onboarding_states` es la única fuente canónica V1. `user_onboarding_states` queda deprecada para compatibilidad, sin borrado ni backfill obligatorio.
- El first-entry resolver server-side aplica esta precedencia: autenticación, invitación, confirmación real de email, reanudación, empresa, contexto y destino seguro.
- Business type, Solution, Package, Plan, Capability, Subscription y Activation permanecen separados. Una empresa puede activar varias soluciones.
- V1 usa catálogo tipado para copy/reglas y catálogo DB versionado para lifecycle, paquetes y activaciones auditables.
- `PROCESA POS / POS Starter` es PILOT y activable. REST, CONTA, GYM y VET son ROADMAP y no activables.
- La API `getEffectiveEntitlements` combina suscripción, plan, activaciones y módulos autorizados; los helpers antiguos no se eliminan todavía.
- La ausencia de scope de sucursal conserva `ALL_BRANCHES`. Un scope explícito restringe selector, cookie, resolver y lectura RLS de `branches`.

## Flujo implementado

Cuenta/identidad → Perfil → Negocio → Recomendación → Oferta → Empresa → Sucursal → Activación → Siguiente acción → Dashboard.

El estado persistido incluye `status`, `current_step`, `last_completed_step`, `workflow_version`, `company_id`, metadata sin secretos y timestamps. Las rutas legacy de plan/módulos/completado redirigen al flujo canónico.

## Email

- Política local observada: `enable_confirmations=false` en `supabase/config.toml`.
- Staging/producción: no observada ni modificada en esta etapa.
- La aplicación consulta `email_confirmed_at`; no inventa un bloqueo si el proveedor entrega sesión confirmada.
- Callback compatible con PKCE (`exchangeCodeForSession`) y token hash (`verifyOtp`). Reenvío con límite local, feedback no enumerable y estados enviado/confirmado/expirado/inválido.
- Antes de habilitar confirmación remota deben configurarse Site URL, redirect allowlist y plantillas en Supabase.

## Seguridad y multi-tenant

Las acciones validan usuario, compañía, permiso y/o entitlement en backend. Las RPC nuevas son `security definer` con `search_path=''`, permisos explícitos y auditoría. `company_id` forma parte de activaciones y scopes; las relaciones compuestas impiden asignar membresía o sucursal de otro tenant. El parámetro `next` acepta solo rutas relativas allowlisted.

El P0 de 073 revoca EXECUTE de `PUBLIC`/`anon`, elimina RPC accidentales de
triggers, retira acceso browser a helpers bootstrap, fija el `search_path` de
definers legacy y reconstruye grants de tabla de `authenticated` desde las
operaciones realmente cubiertas por RLS. El inventario completo está en
`docs/security/CORE_P0_RPC_RLS_INVENTORY.md`.

El scope por sucursal de esta etapa es una foundation: restringe `branches` y el contexto efectivo. CORE SaaS 2 deberá propagar la comprobación a cada agregado POS branch-bound y añadir pruebas RLS de integración sobre Postgres local.

## Compatibilidad, rollback y feature flag

- Forward-only y no destructiva; no edita 001–071.
- El flag `activation_foundation` permite coexistencia. Usuarios existentes con empresa operativa no son forzados a discovery.
- No se requiere backfill: onboarding y scopes legacy conservan comportamiento.
- Rollback lógico: desactivar el flag, mantener las tablas/columnas, restaurar el read policy legacy de branches si fuera necesario y dejar de llamar las RPC nuevas. No se propone `DROP` como rollback automático.

## Validación

Core CI #18 pasó suite estática, lockfile, cadena limpia, pgTAP 26/26,
`npm ci`, typecheck y build. La misma suite de seguridad también ejecutó en QA
con rollback y sin cambios persistentes.

## Siguiente etapa (no iniciada)

CORE SaaS 2 — POS Activation permanece **NO-GO** hasta recrear QA en paralelo
desde 001–073, validarla y efectuar el cutover bajo el plan de rollback aprobado.

El portafolio histórico `TODOS LOS PORTAFOLIOS APLICACIONES WEBS` queda
**PENDIENTE DE AUDITORÍA FUNCIONAL POSTERIOR** y no fue revisado en este gate.
