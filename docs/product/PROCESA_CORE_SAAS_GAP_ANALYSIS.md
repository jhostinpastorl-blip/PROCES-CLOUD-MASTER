# PROCESA Cloud — Core SaaS Gap Analysis

**Corte:** 2026-08-28

**Decisión de etapa:** auditoría concluida; no iniciar migración 072 ni Etapa 7E sin aprobación.

## 1. Dictamen

| Dimensión | Resultado |
|---|---|
| Core técnico | **TECHNICAL PASS** con defectos puntuales |
| Journey SaaS comercial | **PARTIAL / NO END-TO-END** |
| PROCESA POS | **Funcionalmente avanzado**, no integrado a activación guiada |
| Billing autoservicio | **NOT IMPLEMENTED** |
| Viernes | **UI ONLY / placeholder** |
| Calidad visual premium | **TECHNICAL PASS** |
| Aceptación visual | **FAIL / OPEN** |
| Listo para activar comercialmente sin asistencia | **NO** |

La plataforma no debe presentarse todavía como una experiencia SaaS de autoservicio completa. Sí puede sostener pilotos asistidos y controlados, siempre que se expliciten módulos en roadmap, limitaciones de billing y verificación de correo.

## 2. Scorecard por subsistema

| Subsistema | Estado | Evidencia | Riesgo principal |
|---|---|---|---|
| Registro/Auth | PARTIAL | `src/app/registro/actions.ts`, `src/app/login/actions.ts` | Verificación y destino de primer login incompletos |
| Recuperación de contraseña | FUNCTIONAL | `/recuperar-contrasena`, `/actualizar-contrasena` | Falta QA de enlaces productivos y política fuerte |
| Onboarding | PARTIAL | `/onboarding/*`, `onboarding_states` | Flujo técnico, duplicidad de estados y sin discovery |
| Tenancy/contexto | FUNCTIONAL | `get_my_company_contexts`, cookies HTTP-only, `requireCompany` | Contexto de sucursal no equivale a autorización por sucursal |
| Empresa | FUNCTIONAL | `/app/company`, `company.update`, RLS | Falta sector/tipo de negocio |
| Sucursales | PARTIAL | `/app/branches`, `create_first_branch` | Toggle roto por contrato de formulario; sin scopes por usuario |
| Roles/permisos | PARTIAL | roles, role_permissions, membership_roles | UI incompleta para revocar/asignar y sin matriz efectiva |
| Invitaciones | PARTIAL | tokens hasheados, RPC y Auth invite | Error SMTP silenciado; no hay reenvío/estado de entrega |
| Planes/trial | PARTIAL | plans, subscriptions, trial 14 días, límites | Plan hardcodeado en onboarding; sin precios definitivos |
| Módulos/entitlements | FUNCTIONAL/PARTIAL | plan `module_codes`, `company_modules`, assertions | No existe capa comercial de soluciones/paquetes |
| Notificaciones | PARTIAL | centro, RPCs, preferencias en DB | Preferencias no conectadas; cobertura de eventos limitada |
| Configuración | PARTIAL | perfil persiste | Idioma/fecha/moneda/zona y tabs son UI sin acción |
| Seguridad | PARTIAL | cierre local/global, RLS, auditoría | Sin MFA, sesiones visibles ni políticas productivas verificadas |
| Dashboard | FUNCTIONAL | KPIs reales, contexto, suscripción, audit feed | Sin orientación de siguiente mejor acción ni readiness |
| POS | FUNCTIONAL/PARTIAL | catálogo, inventario, caja, venta, compras, devoluciones, reportes, CPE | Sin importación/onboarding; readiness operativo no guiado |
| Viernes | UI ONLY | `/app/viernes` | Copy sugiere capacidad mayor que la implementación |
| Super Admin | FUNCTIONAL/PARTIAL | `/procesa-admin/*`, `requirePlatformAdmin` | Billing y MRR no reales; vistas premium inconsistentes |

## 3. Hallazgos críticos por los 20 pasos

1. **Descubrimiento:** la landing comunica ecosistema y roadmap con honestidad razonable, pero el carrusel y catálogo no conducen a una configuración contextual.
2. **Registro:** `signUp` funciona y contempla la ausencia de sesión, pero no hay experiencia completa de confirmación.
3. **Email:** no existe callback de Auth, verificación OTP ni resend. La configuración local desactiva confirmación; producción queda **UNKNOWN** y debe verificarse sin inferencias.
4. **Primer login:** la acción redirige a `/app/dashboard`; no consulta onboarding ni respeta un destino seguro de reanudación en el código auditado.
5. **Perfil:** solo el nombre se persiste. El resto de preferencias visibles no tiene acción.
6. **Tipo de negocio:** ausente en UI, backend y modelo.
7. **Recomendación:** ausente; la selección depende del conocimiento previo del cliente.
8. **Paquete comercial:** ausente; plan y módulo son primitivas técnicas separadas.
9. **Plan/trial:** trial real de 14 días, pero catálogo inicial está hardcodeado y sin términos/precio final.
10. **Empresa:** creación transaccional en RPC con owner/admin y permisos; necesita idempotencia de workflow y recuperación UX.
11. **Sucursal:** creación inicial existe. En administración, la UI envía `isActive` y la acción lee `enable`; el toggle interpreta siempre `false`.
12. **Activación:** entitlements se validan en backend y DB, pero el primer checkbox depende del orden alfabético del catálogo y no de una solución elegida.
13. **Onboarding de solución:** no existe; “Tu espacio está listo” se muestra antes de preparar POS.
14. **Importación:** no hay carga CSV/XLSX, mapping, preview ni job de importación.
15. **Configuración POS:** existen pantallas y RPCs, pero el usuario debe descubrir el orden correcto.
16. **Equipo:** invitación y aceptación son reales; fallo de correo se captura con `console.warn` y la UI no distingue entrega de creación del token.
17. **Roles/sucursal:** backend de roles es sólido en aislamiento; la UI no expone el ciclo completo y no hay asociación miembro-sucursal.
18. **Entrada a módulo:** sidebar consulta módulos habilitados y `requireModule` protege POS. Otros módulos y Viernes no tienen paridad funcional.
19. **Retención/soporte:** notificaciones y auditoría existen; preferencias, seguridad avanzada y asistencia contextual están incompletas.
20. **Conversión/expansión:** Super Admin puede asistir estados y límites; no hay checkout, cobro, portal ni webhook con firma real.

## 4. Hallazgos de arquitectura y consistencia

### 4.1 Doble fuente de estado de onboarding

El flujo activo usa `onboarding_states` (`current_step` textual). La migración 055 y `src/lib/onboarding/state.ts` introducen `user_onboarding_states` (`current_step` numérico y `status`). No hay una decisión canónica visible entre ambas. Mantenerlas en paralelo generará reanudaciones contradictorias, métricas dobles y fallos de soporte.

**Recomendación:** escoger una única fuente antes de ampliar el onboarding; diseñar migración y compatibilidad solo tras aprobación explícita.

### 4.2 Resolución de suscripción duplicada

Existen `src/lib/plans/limits.ts`, `src/lib/subscriptions/current.ts` y `src/lib/subscriptions/resolver.ts`. Sus criterios no son idénticos: algunos toman la última suscripción sin filtrar, otros solo trial/active y otro delega en `get_company_plan`.

**Recomendación:** una única API de dominio para estado, operación, límites y módulos; todas las pantallas y acciones deben usarla.

### 4.3 Scope de sucursal incompleto

La cookie `procesa_branch` selecciona contexto, y `getResolvedContext` verifica que la sucursal pertenezca a la empresa. No existe tabla/política que limite qué sucursales puede usar cada miembro. El copy de producto afirma acceso por sucursal, pero el modelo actual concede el ámbito empresarial completo según permisos.

**Recomendación:** diseñar scopes efectivos por membresía/rol/sucursal y reflejarlos en RLS/RPC antes de prometer aislamiento por sede.

### 4.4 Contratos UI/backend no cerrados

- Sucursales: `isActive` versus `enable` rompe el toggle.
- Settings: tabs y preferencias visibles no persisten salvo `fullName`.
- Topbar: “Buscar en PROCESA ⌘K” navega a módulos; no es buscador ni command palette.
- Miembros: se muestra UUID truncado en vez de nombre/email; las acciones de roles existentes no están integradas en la vista principal.

## 5. Auditoría visual premium

### 5.1 Resultado

**VISUAL PREMIUM: TECHNICAL PASS**

**VISUAL ACCEPTANCE: FAIL / OPEN**

**Calidad percibida actual:** media e inconsistente; la landing está por encima del producto interno, pero el sistema completo no alcanza un estándar premium homogéneo.

La evaluación se realizó sobre la landing de staging y las rutas `/design-preview/dashboard`, `company`, `branches`, `modules`, `settings`, `states`, `users`, `roles`, `super-admin`, `onboarding` y `login`.

### 5.2 Qué funciona visualmente

- La landing tiene identidad reconocible: azul profundo, acentos cian/magenta, logo consistente y hero con mockup de producto.
- Login presenta composición clara, marca sobria y formulario legible.
- Sidebar, grids y tablas ofrecen una base repetible.
- Los estados y chips usan un lenguaje visual común.

### 5.3 Por qué todavía se percibe barata o incompleta

1. **Tema roto entre superficies:** dashboard, sucursales, usuarios, roles y estados insertan paneles blancos intensos dentro de una carcasa oscura; parece ensamblaje de dos sistemas.
2. **Contraste insuficiente:** títulos y labels azul oscuro casi desaparecen sobre fondos navy; no cumplen jerarquía ni legibilidad percibida.
3. **Pérdida de CSS severa:** previews de onboarding y Super Admin aparecen casi sin layout, con texto corrido, controles grises nativos y bloques blancos vacíos.
4. **Exceso de tarjetas rectangulares:** cada contenido se encierra en cards, reduciendo jerarquía y densidad informativa.
5. **Jerarquía tipográfica monótona:** pesos muy fuertes en hero y títulos, pero metadatos demasiado pequeños/tenues; falta un sistema intermedio.
6. **Iconografía provisional:** glifos Unicode (`◆`, `◎`, `▦`, `⌘`) y avatares genéricos transmiten prototipo.
7. **Acentos sin disciplina:** gradientes y glows son efectivos en la landing, pero repetidos como CTA universal pierden significado.
8. **Estados falsamente interactivos:** botones/tabs visuales sin acción hacen que el producto parezca maqueta.
9. **Densidad inconsistente:** landing densa y expresiva; pantallas internas con grandes áreas muertas o datos flotantes.
10. **Desalineación entre preview y producto real:** la calidad de la maqueta no es una garantía del route real; algunos previews incluso contradicen estados de módulos.

### 5.4 Referentes conceptuales

| Referente | Principio aplicable | Brecha PROCESA actual |
|---|---|---|
| Linear | Jerarquía compacta y estados precisos | Mucha card, poco contraste semántico y acciones ambiguas |
| Stripe | Explicación de complejidad con progresión clara | Plan, trial, módulos y activación aparecen fragmentados |
| Vercel | Superficies sobrias y feedback de sistema | Superficies mezcladas y estados de carga/error no integrados |
| Raycast | Densidad, comandos y teclado reales | `⌘K` es decorativo; iconografía provisional |
| Ramp | Onboarding orientado a resultado | Onboarding orientado a entidades técnicas |
| Notion | Contenido respirable sin cardificar todo | Exceso de contenedores y bordes |
| Cloudflare Dashboard | Navegación profunda con contexto persistente | Contexto existe, pero jerarquía y alcance por sucursal son incompletos |

### 5.5 Top 10 correcciones visuales

1. Reparar tokens de color y contraste en todos los previews/rutas dark y light; ningún título debe fundirse con el fondo.
2. Eliminar los bloques blancos no intencionales en dark mode y definir niveles de superficie 0/1/2.
3. Corregir inmediatamente la carga/alcance de estilos de onboarding y Super Admin.
4. Consolidar escala tipográfica, line-height, ancho de lectura y pesos por rol semántico.
5. Reemplazar glifos Unicode por un set de iconos único, ópticamente alineado.
6. Reducir cards: usar divisores, grupos y tablas cuando la relación sea estructural.
7. Reservar gradiente magenta/cian para la acción primaria comercial, no para todo botón.
8. Diseñar estados vacíos, loading, error y success dentro del mismo tema, con acción real y copy específico.
9. Convertir command search y tabs en controles reales o retirar la apariencia interactiva.
10. Someter landing, Auth, onboarding, Core, POS y Super Admin al mismo screenshot matrix responsive antes de cerrar aceptación.

## 6. Prioridades de implementación recomendadas

### P0 — Bloqueadores de activación

- Definir política productiva de verificación de email y callback.
- Derivar primer login al estado correcto.
- Elegir fuente canónica de onboarding.
- Corregir contrato de toggle de sucursal.
- Reparar estilos rotos, contraste y paridad visual de onboarding/Super Admin.
- Alinear claims de sucursal y Viernes con capacidad real.

### P1 — Journey comercial mínimo

- Discovery de tipo de negocio.
- Recomendación determinística V1.
- Catálogo de soluciones/paquetes y resolución a entitlements.
- Onboarding POS guiado con readiness mínimo.
- Entrega/reenvío de invitaciones observable.
- UI completa de roles y scopes por sucursal.

### P2 — Activación y conversión

- Importación inicial con dry-run.
- Eventos/métricas de activation funnel.
- Trial lifecycle y conversión asistida auditable.
- Preferencias de notificación y settings reales.
- Portal de seguridad/sesiones gradual.

### P3 — Autoservicio y expansión

- Billing provider real, checkout, portal y webhooks verificados.
- Upgrade/downgrade/proration.
- Cross-sell contextual por uso/necesidad.
- Viernes funcional con autorización y trazabilidad completas.

## 7. Roadmap exacto propuesto

1. **Decision gate:** aprobar taxonomía de soluciones, fuente canónica de onboarding, política email y modelo de scope por sucursal.
2. **Design gate:** prototipo navegable del journey y matriz visual; sin DB.
3. **Contract gate:** contratos de dominio/API/RLS y plan de migración; revisión de seguridad.
4. **Core activation slice:** primer login + discovery + recomendación + paquete + empresa/sucursal, detrás de feature flag.
5. **POS activation slice:** checklist y readiness reutilizando pantallas POS.
6. **Team slice:** invitaciones observables, roles y scopes.
7. **Pilot:** cohortes asistidas, métricas y rollback lógico.
8. **Commercial conversion:** primero asistido; checkout automático solo tras provider y webhook reales.
9. **Visual acceptance:** cerrar únicamente después de QA desktop/mobile, dark/light y estados de sistema.

## 8. Decisión final

**No iniciar 7E ni crear migración 072.** La siguiente acción correcta es aprobar/rechazar los contratos conceptuales de los otros tres documentos. Tras esa aprobación debe emitirse una nueva orden de implementación con alcance, migraciones, RLS, QA y rollback explícitos.
