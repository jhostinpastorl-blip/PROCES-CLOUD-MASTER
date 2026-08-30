# PROCESA CLOUD — ECOSISTEMA, VERTICALES Y TAXONOMÍA

============================================================
1. TAXONOMÍA FORMAL DEL ECOSISTEMA
============================================================

Para evitar ambigüedad en el diseño y desarrollo, se establece la siguiente clasificación:

### A. CORE SAAS (Núcleo Común Obligatorio)
Servicios transversales compartidos por todo el ecosistema:
- Autenticación Centralizada (Supabase Auth, JWTs, sesiones seguras)
- Gestión Multiempresa (`companies`, membresías, contextos activos)
- Estructura Multisucursal (`branches`)
- Control de Acceso Basado en Permisos (RBAC: `roles`, `permissions`, `role_permissions`)
- Planes, Suscripciones y Límites (`plans`, `subscriptions`, límites de usuarios/sucursales)
- Módulos y Feature Flags (`modules`, `company_modules`)
- Auditoría Inmutable (`audit_logs`)
- Centro de Notificaciones (`notifications`)
- Super Admin PROCESA CORP (`platform_admins`)

### B. PRODUCTOS VERTICALES (Specialized Vertical SaaS)
Soluciones integrales diseñadas específicamente para un sector económico:
- **PROCESA POS:** Minimarkets, Bodegas, Retail minorista, Tiendas. (Prioridad P1)
- **PROCESA REST:** Restaurantes, Cafeterías, Bares, Fast Food. (P2)
- **PROCESA GYM:** Gimnasios, Boxes de entrenamiento, Centros deportivos. (P3)
- **PROCESA VET:** Clínicas veterinarias, Consultorios de mascotas, Pet shops. (P3)
- **PROCESA CLINIC:** Consultorios médicos, Centros de salud ambulatorios. (P4)
- **PROCESA HOTEL:** Hospedajes, Hoteles boutique, Alojamientos. (P4)
- **PROCESA PHARMA:** Boticas y Farmacias independientes. (P4)
- **PROCESA WORKSHOP:** Talleres automotrices, Servicio técnico. (P4)

### C. MÓDULOS TRANSVERSALES (Cross-Functional Capabilities)
Capacidades empresariales reutilizables que pueden activarse sobre cualquier vertical:
- **PROCESA CONTA:** Contabilidad general, libros electrónicos, balances.
- **PROCESA RRHH:** Gestión de personal, planillas, control de asistencia.
- **PROCESA INVENTORY:** Almacenes avanzados, valorización de inventario, transferencias multisede.
- **PROCESA DOCS:** Gestión documental, contratos, vencimientos y firmas.
- **PROCESA FLOW:** Automatización de flujos de trabajo y aprobaciones.
- **PROCESA COBROS:** Gestión de cobranzas, cuentas por cobrar y pasarelas.
- **PROCESA SSOMA:** Seguridad y salud en el trabajo, medio ambiente.

### D. FEATURES (Características de Dominio Interno)
Componentes funcionales específicos dentro de una vertical o módulo.
*Ejemplo en POS:* Apertura de caja, ventas de mostrador, arqueo, anulación de tickets.
*Ejemplo en REST:* Mapa de mesas, comandas a cocina, división de cuentas.

---

============================================================
2. MATRIZ DE PRODUCTOS DEL ECOSISTEMA
============================================================

| Solución | Tipo | Estado | Prioridad | Core Reutilizado | Dominios Propios |
|---|---|---|:---:|---|---|
| **PROCESA POS** | Vertical | **En Desarrollo** | **P1** | Auth, Tenant, RBAC, Sub, Audit | Sales, Cash, Inventory, CPE, Customers |
| **PROCESA REST** | Vertical | Planificado | P2 | Auth, Tenant, RBAC, Sub, Audit | Tables, Orders, Kitchen, Delivery |
| **PROCESA GYM** | Vertical | Planificado | P3 | Auth, Tenant, RBAC, Sub, Audit | Memberships, Access, Trainers, Routine |
| **PROCESA VET** | Vertical | Planificado | P3 | Auth, Tenant, RBAC, Sub, Audit | Patients, Medical Records, Appointments |
| **PROCESA CONTA** | Transversal | Planificado | P2 | Auth, Tenant, RBAC, Sub, Audit | General Ledger, Taxes, P&L, Sunat Books |
| **PROCESA RRHH** | Transversal | Planificado | P3 | Auth, Tenant, RBAC, Sub, Audit | Payroll, Attendance, Employees |
| **PROCESA INVENTORY**| Transversal | Planificado | P2 | Auth, Tenant, RBAC, Sub, Audit | Multi-warehouse, Kardex, Transfers |
| **PROCESA DOCS** | Transversal | Planificado | P3 | Auth, Tenant, RBAC, Sub, Audit | Vault, OCR, Expirations, Legal |
| **PROCESA FLOW** | Transversal | Planificado | P4 | Auth, Tenant, RBAC, Sub, Audit | Workflow Engine, Triggers, Automations |
| **VIERNES AI** | Transversal | Planificado | P2 | Context, Perms, Audit | Natural Language BI, Cross-Domain Queries |

---

============================================================
3. VIERNES AI — ASISTENTE INTELIGENTE TRANSVERSAL
============================================================
Viernes es la capa de inteligencia contextual de PROCESA Cloud.
- **Regla Fundamental:** Viernes nunca consulta datos globalmente.
- **Invariante de Contexto:** Cada interacción inyecta forzosamente `company_id`, `branch_id` y valida los permisos del usuario activo (`user_id`).
- **Casos de Uso:** *"¿Cuánto vendí hoy en sucursal Arequipa?", "¿Qué productos tienen stock bajo?", "¿Qué facturas vencen esta semana?"*.
