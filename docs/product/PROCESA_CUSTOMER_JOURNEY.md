# PROCESA Cloud — Customer Journey SaaS

**Fecha de auditoría:** 2026-08-28

**Rama auditada:** `develop/procesacloudv2`

**Alcance:** Core SaaS, activación comercial y entrada a PROCESA POS.
**Naturaleza:** documento de auditoría y diseño; no implementa producto ni base de datos.

## 1. Resumen ejecutivo

PROCESA Cloud dispone de una base Core real: registro e inicio de sesión con Supabase Auth, tenancy por empresa, selector de contexto, sucursales, RBAC, RLS, catálogo de módulos, entitlements por plan, trial, invitaciones, notificaciones, auditoría y consola Super Admin. PROCESA POS ya ofrece una ruta operativa extensa.

La experiencia, sin embargo, todavía no constituye un journey SaaS comercial continuo. El usuario pasa de la propuesta de valor a un onboarding técnico de plan → empresa → módulos → sucursal, sin capturar el tipo de negocio, sin recomendar una solución, sin agrupar capacidades en paquetes comerciales y sin una activación guiada específica para POS. El login tampoco deriva al usuario nuevo al onboarding. Billing sigue siendo asistido y no existe checkout real.

**Veredicto del journey:** base funcional parcial; activación comercial end-to-end **no lista**.

## 2. Personas y resultados esperados

| Persona | Objetivo principal | Resultado de éxito |
|---|---|---|
| Dueño / fundador | Empezar rápido sin conocer la arquitectura de módulos | Selecciona su tipo de negocio, recibe una recomendación, crea su empresa y realiza su primera operación |
| Administrador de empresa | Configurar estructura, equipo y controles | Empresa, sucursal, roles, usuarios y módulos listos con trazabilidad |
| Operador de sucursal | Entrar únicamente a su ámbito operativo | Contexto de sucursal y permisos efectivos aplicados a navegación y backend |
| Super Admin PROCESA | Activar y asistir el ciclo comercial | Ve tenants, trials, planes y estado; puede intervenir de forma auditada |

## 3. Journey objetivo

```text
Descubrir → Registrarse → Verificar identidad → Completar perfil
→ Identificar negocio → Recomendar solución → Revisar paquete/plan
→ Crear empresa → Crear sucursal → Activar solución
→ Checklist específico → Importar/configurar datos → Invitar equipo
→ Asignar roles y alcance → Entrar al módulo → Operar
→ Medir uso → Convertir trial → Expandir empresa/soluciones
```

Principio rector: el cliente elige un **resultado empresarial** (por ejemplo, “Punto de venta para minimarket”), no una colección de tablas o módulos técnicos. Plan, módulos y entitlements se resuelven detrás de esa elección.

## 4. Matriz integral de 20 pasos

Estados permitidos: `FUNCTIONAL`, `PARTIAL`, `UI ONLY`, `NOT IMPLEMENTED`, `BLOCKED`, `N/A`.

| STEP | USER ACTION | ROUTE | COMPONENTS | BACKEND | TABLES | RPC/API | RLS | PERMISSIONS | CURRENT STATUS | GAP | RECOMMENDED IMPLEMENTATION |
|---:|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Explora producto, sectores y soluciones | `/`, `/#soluciones`, `/demo` | Landing, carrusel, catálogo, planes, formulario demo | Server action de demo | `demo_requests` | Inserción de demo | Política pública endurecida | N/A público | PARTIAL | Hay catálogo informativo, pero no comparación ni CTA contextual por solución; varias capacidades son roadmap | Mantener estados honestos y añadir ficha comercial por solución con CTA “Configurar mi solución” |
| 2 | Crea cuenta | `/registro` | Formulario nombre, email, contraseña, términos | `signUp` | `auth.users`, `profiles` indirecto | Supabase Auth `signUp` | Auth administrado por Supabase; perfil propio | Usuario autenticado para perfil | FUNCTIONAL | Password mínimo local de 6 y requisitos vacíos; no hay feedback robusto de fortaleza | Política de contraseña coherente con producción, estados de envío y errores accionables |
| 3 | Verifica correo | Enlace proveedor → ruta no implementada; `/login?check_email=1` | Aviso genérico en login | No hay callback, `verifyOtp`, `exchangeCodeForSession` ni resend | `auth.users` | Email de Supabase, dependiente de entorno | N/A | N/A | PARTIAL | `supabase/config.toml` local tiene `enable_confirmations=false`; configuración productiva desconocida; sin reenvío, expiración ni éxito explícito | Definir política productiva, callback seguro, reenvío con rate limit y estados confirmado/expirado/ya usado |
| 4 | Inicia sesión por primera vez | `/login` → `/app/dashboard` | Login premium | `signInWithPassword` | `auth.sessions` | Supabase Auth | Layout `/app` exige usuario | Usuario autenticado | PARTIAL | Siempre redirige al dashboard; no consulta estado de onboarding ni `next` de forma visible en la acción auditada | Resolver destino server-side: invitación pendiente, onboarding incompleto, contexto o dashboard |
| 5 | Completa perfil inicial | `/app/settings` | Perfil de usuario | Upsert de perfil | `profiles` | Supabase query | Políticas own insert/update | Usuario autenticado | PARTIAL | Solo nombre; no integra teléfono, cargo, consentimiento comercial ni paso inicial | Perfil mínimo dentro de onboarding y edición posterior; no bloquear por datos no esenciales |
| 6 | Indica tipo de negocio y necesidad | No existe | No existe | No existe | No existe | No existe | N/A | N/A | NOT IMPLEMENTED | Falta clasificación de sector, tamaño, número de sedes y problema principal; tampoco opción “Otro” | Paso de discovery data-driven con taxonomía versionada y salida segura “Otro / necesito asesoría” |
| 7 | Recibe recomendación de solución | No existe | No existe | No existe | No existe | No existe | N/A | N/A | NOT IMPLEMENTED | No hay motor de recomendación ni explicación del porqué | Reglas V1 determinísticas y auditables; mostrar recomendación, alternativas y posibilidad de cambiar |
| 8 | Revisa solución, paquete y capacidades | `/onboarding/plan`, `/app/modules`, `/app/subscription` | Cards de plan y módulos | Lecturas de plan/entitlements | `plans`, `subscriptions`, `modules`, `company_modules` | Queries; `get_company_plan` existe en resolver alterno | Catálogos públicos; suscripción solo miembros | `modules.manage` para mutación | PARTIAL | Plan y módulos están separados; precios son placeholders; no existe entidad de solución/paquete | Introducir catálogo comercial conceptual de solución + paquete + versión; resolver a plan/entitlements sin duplicar verticales |
| 9 | Selecciona plan o trial | `/onboarding/plan` | Free, Pro y Business hardcodeados | Guarda estado; empresa crea trial de 14 días | `onboarding_states`, `plans`, `subscriptions` | `create_company_with_trial` en paso posterior | Estado propio; suscripción visible a miembros | Usuario autenticado | PARTIAL | UI omite Lite/Enterprise aunque enum los acepta; sin precios, términos, checkout ni consentimiento de trial | Catálogo servido desde backend; separar decisión de paquete, plan y método de pago; resumen antes de confirmar |
| 10 | Crea empresa | `/onboarding/company` | Formulario comercial/legal | Crea tenant, owner, admin, permisos y trial | `companies`, `company_memberships`, `roles`, `membership_roles`, `role_permissions`, `subscriptions` | `create_company_with_trial` | RPC SECURITY DEFINER con usuario autenticado | Owner recibe rol Administrador | FUNCTIONAL | No hay idempotencia explícita ni recuperación UI ante fallo parcial/reintento; no captura sector | Idempotency key y pantalla de recuperación; enlazar la empresa con el discovery aprobado |
| 11 | Crea primera sucursal | `/onboarding/branch` | Nombre y código | Crea sede y valida capacidad | `branches`, `subscriptions`, `plans` | `create_first_branch` | RPC y políticas tenant | Owner/admin vía RPC | PARTIAL | Acción no hace `requireCompany` explícito; depende totalmente del RPC; solo nombre/código | Validación explícita de contexto y formulario mínimo ampliable (dirección, zona, tipo de sede) |
| 12 | Activa solución/capacidades | `/onboarding/modules`, `/app/modules` | Selector de módulos | Valida entitlement y upsert | `modules`, `company_modules`, `plans`, `subscriptions` | `set_initial_company_modules`, `company_has_module` | Lectura tenant; mutación por permiso | `modules.manage` | PARTIAL | Se eligen módulos sueltos; el default depende del orden del catálogo; no existe activación atómica de solución | Resolver paquete a entitlements determinísticos; Core obligatorio; confirmación y rollback lógico de activación |
| 13 | Completa onboarding específico de solución | No existe | Solo pantalla genérica “listo” | No existe orquestación | No existe entidad canónica | No existe | N/A | N/A | NOT IMPLEMENTED | POS no recibe checklist de productos, almacén, caja, impuestos y comprobantes | Checklist versionado por solución con requisitos, opcionales, progreso y reanudación |
| 14 | Importa datos iniciales | No existe en onboarding | Formularios unitarios POS | CRUD unitario | `products`, `categories`, `customers`, `suppliers`, etc. | Acciones POS/RPC existentes | RLS POS por empresa | Permisos POS específicos | NOT IMPLEMENTED | No hay CSV/XLSX, plantilla, validación previa, preview, reporte de errores o idempotencia | Importador asíncrono por lotes con dry-run, mapping, validación y archivo de errores; etapa posterior aprobada |
| 15 | Configura caja y operación POS | `/app/pos/cash-registers`, `/app/pos/warehouses`, `/app/pos/categories`, `/app/pos/products`, `/app/pos/settings/electronic-invoicing` | CRUD y terminal POS | Acciones server y RPC POS | Catálogos, almacenes, cajas, sesiones, CPE | RPC de caja, ventas, inventario y CPE | RLS tenant/módulo | Permisos `pos.*` | PARTIAL | Capacidades reales, pero no hay secuencia guiada ni readiness gate antes de abrir terminal; configuración CPE debe verificarse funcionalmente | Wizard/checklist POS que reutilice pantallas existentes y habilite terminal cuando mínimos estén completos |
| 16 | Invita equipo | `/app/users`, `/aceptar-invitacion` | Formulario, listado, revocación, aceptación | Token hasheado + email admin | `company_invitations`, `company_memberships`, `membership_roles` | `create_company_invitation`, `accept_company_invitation`, `revoke_company_invitation` | Políticas tenant y validación de destinatario | `users.invite`; límites de plan | PARTIAL | SMTP puede fallar y se ignora; UI no muestra envío fallido/reenvío; miembros muestran ID, no identidad útil | Estado de entrega, reenvío, email log, perfil legible y manejo de cuenta existente/nueva |
| 17 | Asigna roles y acceso por sucursal | `/app/roles`, acciones no expuestas completamente en `/app/users` | Crear rol y añadir permiso | Validaciones cross-tenant y protección último admin | `roles`, `permissions`, `role_permissions`, `membership_roles`, `company_memberships` | Queries/RPC de lifecycle | RLS tenant y permiso | `roles.manage`, `users.invite` | PARTIAL | No hay UI completa para ver/quitar permisos o asignar roles a miembro; no existe modelo de acceso por sucursal | Matriz rol-permiso legible, asignación/revocación completa y nueva capa de scope por sucursal sin usar la cookie como autorización |
| 18 | Entra a un módulo y trabaja | `/app/dashboard`, `/app/pos/*` | Sidebar dinámico, dashboard, terminal y hubs POS | `requireModule`, contexto y permisos | Core + dominio POS | `company_has_module` y RPC POS | RLS por empresa | Permisos Core/POS | PARTIAL | POS es sustancial; REST/CONTA/FLOW/DOCS son rutas reservadas o no equivalentes; Viernes es placeholder. El buscador `⌘K` es solo un link a módulos | Launcher por capacidades reales, command palette funcional, guardas consistentes de contexto/sucursal y estados de “próximamente” honestos |
| 19 | Recibe avisos, administra seguridad y soporte | `/app/notifications`, `/app/settings`, `/app/security`, `/app/audit`, `/app/viernes` | Centro de avisos, perfil, cierre global, auditoría, placeholder Viernes | RPC notificaciones; Auth signOut global | `notifications`, `notification_preferences`, `audit_logs`, `profiles` | `create_core_notification`, `mark_all_notifications_read` | RLS usuario/tenant | `audit.read` donde aplica | PARTIAL | Preferencias existen en DB pero no están conectadas a UI; settings tiene controles sin persistencia; no hay MFA ni sesiones listadas; Viernes no funciona | Unificar settings reales, preferencias persistidas, seguridad de cuenta gradual y soporte contextual sin prometer IA activa |
| 20 | Convierte trial, cambia plan o expande | `/app/subscription`, `/app/branches`, `/app/modules`, `/procesa-admin/*` | Capacidad/estado, administración asistida | Límites, estados, adaptadores mock, Super Admin | `subscriptions`, `plans`, `billing_customers`, `billing_webhook_events`, Core | `get_company_plan`, assertions, acciones admin | Tenant read; plataforma admin mutate | Platform Admin / permisos tenant | PARTIAL | No checkout, cobro, factura, portal, proration ni autoservicio; adaptadores y firma son mock; expansión no ofrece cross-sell por necesidad | Primero flujo comercial asistido trazable; después checkout provider real, webhook criptográfico e idempotente, portal y ofertas de expansión |

## 5. Ramas de excepción obligatorias

| Evento | Comportamiento esperado |
|---|---|
| Correo ya registrado | Ofrecer login o recuperación sin revelar información sensible adicional |
| Enlace de verificación vencido | Explicar estado y permitir reenvío con rate limit |
| Invitación a cuenta existente | Login y retorno seguro al token pendiente |
| Usuario abandona onboarding | Reanudar exactamente desde el último paso canónico |
| Reintento tras crear empresa | No duplicar tenant, membresía, trial ni sucursal |
| Plan no permite solución | Explicar qué capacidad falta y ofrecer alternativa, sin botón habilitado que luego falle |
| Trial vencido | Mantener acceso de lectura/recuperación definido; bloquear mutaciones con mensaje y canal comercial |
| Sin contexto | Llevar al selector; nunca asumir una empresa por query string sin persistir y validar |
| Sin acceso a sucursal | No mostrar ni consultar datos de esa sucursal; cookie no debe conceder alcance |
| SMTP caído | Registrar entrega fallida y ofrecer reenvío; no presentar “enviado” como éxito silencioso |

## 6. Puntos de verdad actuales

- Identidad: Supabase Auth y `requireUser`/`getUser`.
- Tenancy efectivo: `get_my_company_contexts`, `requireCompany`, `company_memberships` y RLS.
- Contexto de UI: cookies HTTP-only `procesa_company` y `procesa_branch`, revalidadas contra empresa/sucursal.
- Autorización: roles, permisos, `requirePermission`, `has_permission` y RLS.
- Capacidad comercial: `plans`, `subscriptions`, `module_codes`, `company_modules` y assertions.
- Operación POS: módulo habilitado + permisos + contexto activo + RLS/RPC.
- Plataforma: `platform_admins` y layout aislado `/procesa-admin`.

## 7. Métricas de activación propuestas

1. Registro completado.
2. Identidad verificada cuando la política productiva lo requiera.
3. Discovery completado.
4. Solución recomendada y aceptada/cambiada.
5. Empresa y primera sucursal creadas.
6. Solución activada.
7. Checklist mínimo completado.
8. Primera invitación aceptada.
9. Primera caja abierta.
10. Primera venta completada.
11. Conversión de trial o contacto comercial calificado.

No se propone instrumentación en esta etapa; las métricas definen el contrato de producto para una fase posterior aprobada.
