# PROCESA Cloud — Handoff de implementación
**Prototipo:** `PROCESA_CLOUD_PUBLIC_WEBSITE_PROTOTYPE.html`
**Alcance de esta etapa:** producto + UX/UI + prototipo navegable. Sin backend, sin Supabase, sin pagos, sin auth real.

---

## 1. Cómo está construido el prototipo

Un único HTML con **router simulado en JS** (`goTo(pageId, anchor)`): cada "página" es un `<div class="page" id="page-{id}">`, oculto/mostrado por JS. No hay rutas reales ni recarga. Para Next.js, cada `page-{id}` es candidato directo a una ruta:

| id del prototipo | Ruta sugerida Next.js |
|---|---|
| `inicio` | `/` |
| `producto` | `/producto` |
| `soluciones` | `/soluciones` (con anchors por módulo: `/soluciones#pos`, `#rest`, `#conta`, `#rrhh`, `#docs`, `#gymvet`) |
| `como-funciona` | `/como-funciona` |
| `precios` | `/precios` |
| `seguridad` | `/seguridad` |
| `recursos` | `/recursos` |
| `procesa-corp` | `/procesa-corp` |
| `demo` | `/demo` |
| `crear-cuenta` | `/crear-cuenta` |
| `iniciar-sesion` | `/iniciar-sesion` |

El navbar, mega-menú "Módulos", menú móvil y footer están duplicados dentro del único HTML porque no hay layout compartido en un prototipo estático. En Next.js deben convertirse en un `Layout`/`Header`/`Footer` únicos.

---

## 2. Acción esperada por cada botón / CTA / formulario

Todo elemento accionable relevante tiene un atributo `data-action` en el HTML para ubicarlo por búsqueda de texto.

| `data-action` | Dónde aparece | Acción real esperada (implementación posterior) |
|---|---|---|
| `signup-trial` | Navbar, hero, CTA bands, página Crear cuenta | Registro self-service: crea empresa (tenant), usuario admin, sesión, redirige a onboarding (`app.procesacloud.com`). Sin tarjeta. |
| `request-demo` | Navbar, hero, CTA bands, página Solicitar demo | Envía formulario comercial → crea **lead** en CRM interno (no crea cuenta, no cobra). Confirmación por correo al usuario. |
| `login-link` / formulario Iniciar sesión | Navbar, página Iniciar sesión | Autenticación real contra backend (Supabase Auth u equivalente) → redirige a `app.procesacloud.com`. |
| `password-reset` | Página Iniciar sesión | Flujo de recuperación de contraseña (correo con link de reseteo). |
| Botones "Ver módulo" / mega-menú | Navbar, página Soluciones | Navegación interna (anchor), no requiere backend. |
| Botones de plan ("Comenzar gratis" / "Hablar con ventas") en Precios | Página Precios | Mismos flujos que `signup-trial` / `request-demo`, pasando el plan elegido como parámetro (para precargar el plan en el onboarding o en el lead). |
| Links a `procesacorp.com` (footer, página PROCESA CORP) | Footer, página PROCESA CORP | Enlaces externos reales `target="_blank"` — **no** son parte del build de Cloud. |
| Links legales (Privacidad/Términos/Cookies) | Footer | Apuntan temporalmente a las páginas legales existentes en `procesacorp.com/privacidad/`, `/terminos/`, `/cookies/`. Definir si Cloud publica sus propias políticas o mantiene estas como fuente única (evitar duplicar/legal desalineado). |

**Formularios del prototipo** (`formDemo`, `formSignup`, `formLogin`) solo hacen `preventDefault()` y muestran un estado de éxito simulado (`.form-success`). No validan más allá de HTML5 `required`. No hay conexión a ningún servicio.

---

## 3. Clasificación de contenido de procesacorp.com

Basado en revisión pública de **procesacorp.com** (Inicio, `/procesa-pos/`, `/nosotros/`). El resto de subpáginas (`/automatizacion-rpa/`, `/software/`, `/como-trabajamos/`, `/casos-de-uso/`, `/tecnologias/`, `/contacto/`, `/privacidad/`, `/terminos/`, `/cookies/`) **no fueron auditadas en detalle en este prototipo** — se infiere su naturaleza por el menú y footer del sitio, pero deben revisarse antes de la migración final.

### A. MIGRAR A PROCESA CLOUD
- **PROCESA POS** (contenido completo de `/procesa-pos/`): funciones de caja rápida, inventario, clientes/créditos, control de caja, reportes, roles de usuario, y el asistente **Viernes** (Enterprise). Es la base real del módulo **POS** en el prototipo.
- Estructura de planes **Lite / Pro / Enterprise** de PROCESA POS → inspiró la lógica de planes por módulo en la página Precios (adaptada, no copiada 1:1).
- El patrón de FAQ de producto ("¿Para qué tipo de negocios está pensado...", "¿Qué es Viernes?") → adaptado en Recursos/Ayuda y Precios.

### B. ADAPTAR
- **Formulario de contacto** (`/contacto/`: nombre, empresa, correo, teléfono, tema, mensaje, checkbox de privacidad) → adaptado a **Solicitar demo**, cambiando "tema" (RPA/Software/POS) por "módulo de interés" (POS/REST/CONTA/RRHH/DOCS/GYM-VET).
- Mensaje de confirmación *"la solicitud no agenda una fecha automáticamente"* → reutilizado tal cual en el prototipo de Cloud (es información honesta y útil, no una promesa no verificable).
- Identidad de marca (isotipo, RUC, razón social PROCESA CORP S.A.C.) → footer de Cloud referencia a PROCESA CORP como matriz, sin duplicar el diseño visual del sitio corporativo.

### C. MANTENER SOLO EN PROCESA CORP
- **Automatización RPA** (página completa, plataformas UiPath/Automation Anywhere/Blue Prism/Power Automate/Rocketbot).
- **Software a medida**.
- **Cómo trabajamos** (metodología consultiva: Descubrir → Evaluar → Diseñar → Implementar → Validar → Desplegar → Acompañar) — es un proceso de consultoría B2B, no aplica al onboarding self-service de un SaaS.
- **Casos de uso** (Finanzas/Operaciones/RRHH/Comercial/TI, orientados a automatización, no a los módulos de Cloud).
- **Tecnologías** (stack de entrega de RPA/desarrollo) — irrelevante para un comprador de Cloud.
- **Nosotros** (narrativa corporativa completa, operación remota Perú/Chile/LatAm).
- CTA "Agenda una reunión" de consultoría — distinto en propósito y ciclo de venta al "Solicitar demo" de Cloud.

### D. DESCARTAR / DUPLICADO
- No mantener dos páginas de "PROCESA POS" con features/precios potencialmente distintos entre ambos sitios. A partir de la migración, el módulo POS vive en Cloud; `procesacorp.com/procesa-pos/` debería redirigir o quedar como referencia histórica (decisión de negocio, no técnica de este prototipo).
- No duplicar el formulario de "Agenda una reunión" (consultoría) dentro de Cloud — ya existe como "Solicitar demo", con propósito distinto.
- No forkear páginas legales nuevas para Cloud mientras no haya razón contractual distinta — evitar Términos/Privacidad desalineados entre ambos dominios.

### Pendiente de confirmar (no auditado)
`/automatizacion-rpa/`, `/software/`, `/como-trabajamos/`, `/casos-de-uso/`, `/tecnologias/`, `/contacto/` (flujo completo), `/privacidad/`, `/terminos/`, `/cookies/`. Revisar antes de la migración final para confirmar que ningún contenido de estas páginas debía migrar a Cloud.

---

## 4. Notas de diseño para mantener consistencia

- Paleta, tipografía (Sora/Inter/IBM Plex Mono), radios, sombras y componentes (`.btn`, `.chip`, `.mod-card`, `.plan-card`, etc.) están definidos como variables CSS en `:root` del prototipo — reutilizar tal cual, no reinterpretar.
- El navbar flotante (glass, sticky) y el mega-menú de "Módulos" ya están resueltos en CSS puro + JS mínimo; portan directamente a componentes React.
- Los precios en la página Precios son **referenciales de este prototipo** (S/ 49 / S/ 99 / Personalizado) — no están validados comercialmente. Confirmar montos reales antes de publicar.
- El copy evita explícitamente: estadísticas falsas, testimonios, logos de clientes y certificaciones de seguridad no verificadas — mantener ese criterio al escribir copy real.
