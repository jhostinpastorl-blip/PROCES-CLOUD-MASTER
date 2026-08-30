# PROCESA CLOUD V2 — ARQUITECTURA TÉCNICA MAESTRA

============================================================
1. PRINCIPIO ARQUITECTÓNICO: MODULAR MONOLITH
============================================================
PROCESA Cloud adopta la arquitectura de **Modular Monolith** (Monolito Modular):
- **Fundamento:** Máxima eficiencia de costos y simplicidad operativa durante las fases iniciales de crecimiento comercial, evitando la complejidad prematura y la sobrecarga de latencia/costos de microservicios o Kubernetes.
- **Límites de Dominio Estrictos:** El código se organiza en dominios desacoplados (`src/lib/auth`, `src/lib/cpe`, `src/lib/plans`, etc.) comunicados mediante interfaces y contratos de tipos tipados en TypeScript.
- **Preparación para Extracción:** Dominios de cómputo intensivo o alta concurrencia (como firma digital de CPE SUNAT, generador de reportes pesados, procesamiento de colas o Viernes AI) están aislados conceptualmente para poder extraerse a workers independientes cuando las métricas de tráfico e ingresos lo justifiquen.

---

============================================================
2. STACK TECNOLÓGICO Y CAPAS DE EJECUCIÓN
============================================================
```
┌─────────────────────────────────────────────────────────────────┐
│ CAPA DE PRESENTACIÓN & EDGE RUNTIME (Next.js 15 App Router)     │
│ Cloudflare Workers (SSR con nodejs_compat) / CDN Edge Caching   │
├─────────────────────────────────────────────────────────────────┤
│ CAPA DE APLICACIÓN & SERVER ACTIONS (Node / Edge Execution)     │
│ Zod Validation · Context Resolvers · Entitlement Checks · Auth  │
├─────────────────────────────────────────────────────────────────┤
│ CAPA DE DOMINIO & SERVICIOS EMPRESARIALES                      │
│ POS Engine · CPE Signer · Inventory · Billing · Audit Logger   │
├─────────────────────────────────────────────────────────────────┤
│ CAPA DE PERSISTENCIA & SEGURIDAD EN MOTOR (PostgreSQL Supabase) │
│ Multi-Tenant RLS · RBAC Procedures · Triggers de Inmutabilidad  │
└─────────────────────────────────────────────────────────────────┘
```

---

============================================================
3. ESTRUCTURA DE CÓDIGO PROPUESTA (FRONTEND & DOMINIOS)
============================================================
```
src/
├── app/                       # Rutas públicas, SaaS (/app) y Super Admin (/procesa-admin)
├── components/
│   ├── ui/                    # Componentes base atómicos accesibles (Button, Chip, Modal)
│   ├── landing/               # Componentes especializados de Landing V2 (Hero Carousel)
│   └── layout/                # Sidebars, Topbars y Navegación contextual
├── config/                    # Configuraciones de productos, planes y metadatos
│   └── products.ts            # Matriz tipada del ecosistema para Landing y Módulos
├── lib/                       # Librerías de dominio y utilitarios
│   ├── auth/                  # Sesiones, membresías, permisos y contextos
│   ├── company/               # Resolución de empresa y sucursal activa
│   ├── cpe/                   # Generación UBL 2.1, firma XMLDSig y parsing CDR SUNAT
│   ├── plans/                 # Límites de plan, validaciones de capacidad y suscripción
│   ├── audit/                 # Logger de auditoría inmutable
│   └── supabase/              # Clientes de base de datos SSR y Server
└── middleware.ts              # Headers HTTP de seguridad, CORS y políticas de cache
```

---

============================================================
4. ESTRATEGIA DE ESCALABILIDAD INCREMENTAL
============================================================
1. **Fase Inicial (Actual):**
   - Base de datos relacional única PostgreSQL con índices compuestos `(company_id, created_at desc)`.
   - Consultas filtradas siempre por `company_id`.
   - Ejecución Serverless en Cloudflare Workers sin costos de servidores inactivos.
2. **Fase de Crecimiento:**
   - Implementación de Redis / Cloudflare KV para caché de sesiones y feature flags.
   - Paginación estricta (`limit/offset` o basada en cursor) en todos los listados transaccionales.
   - Background jobs asíncronos para tareas no bloqueantes (emails, alertas, sincronizaciones).
3. **Fase de Alta Escala:**
   - Read Replicas para reportes analíticos pesados.
   - Particionamiento de tablas masivas (`audit_logs`, `inventory_movements`, `sales`) por rango de fechas o tenant.
