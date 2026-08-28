# PROCESA CLOUD V2 — GAP ANALYSIS (PROCESA POS VS SISTEMAS ADQUIRIDOS)

============================================================
1. RESUMEN DEL ANÁLISIS DE BRECHAS (GAP ANALYSIS)
============================================================
Este documento compara el estado actual de implementación en **PROCESA Cloud (Fases 1A a 1F)** frente a las funcionalidades y capacidades operativas observadas en los sistemas adquiridos (`SaaS Minimarket`, `SaaS Ventas e Inventarios`, `SaaS Tienda Moda`, `SaaS Ferretería`).

---

============================================================
2. MATRIZ DE COMPARACIÓN DE CAPACIDADES
============================================================

| Capacidad / Módulo | Estado en PROCESA Cloud Actual | Estado en Sistemas Adquiridos | Brecha Identificada (GAP) | Recomendación de Evolución | Prioridad |
|---|---|---|---|---|:---:|
| **Infraestructura Multi-Tenant & RLS** | **100% IMPLEMENTADO** (PostgreSQL RLS, migración 070) | Parcial / Mono-empresa | PROCESA Cloud supera ampliamente a los sistemas adquiridos en seguridad y aislamiento multiempresa. | Mantener y blindar la infraestructura actual de PROCESA Cloud. | - |
| **Facturación Electrónica SUNAT (CPE)** | **100% IMPLEMENTADO** (UBL 2.1, XMLDSig, CDR) | Conectores PHP externos | PROCESA Cloud cuenta con motor nativo de firma digital y parsing de CDR en TypeScript. | Conservar el motor actual de PROCESA Cloud como servicio de emisión fiscal transversal. | - |
| **Terminal de Ventas POS (UI & Carrito)** | **PARCIALMENTE IMPLEMENTADO** (`src/app/app/pos/terminal/`) | Completo en `SaaS Minimarket` | Falta soporte nativo para venta en espera, atajos rápidos de teclado (`F2-F9`) y cobro mixto (efectivo + digital). | Incorporar la UX rápida y el modal de cobro mixto adaptado a Server Actions. | **P1** |
| **Gestión de Caja y Turnos** | **PARCIALMENTE IMPLEMENTADO** (`src/app/app/pos/cash/`) | Completo en `SaaS Minimarket` | El flujo actual requiere incorporar el **Arqueo Ciego** obligatorio y el Ticket Z impreso de cierre. | Adaptar el flujo de arqueo ciego y reporte Z en el módulo de caja. | **P1** |
| **Kardex Valorizado y Costo Promedio** | **PARCIALMENTE IMPLEMENTADO** (`src/app/app/pos/inventory/`) | Completo en `SaaS Ventas e Inv.` | Falta cálculo automatizado de costo promedio ponderado tras la confirmación de compras. | Incorporar el trigger/función de actualización de costo promedio ponderado en transacciones de compra. | **P1** |
| **Módulo de Compras a Proveedores** | **PARCIALMENTE IMPLEMENTADO** (`src/app/app/pos/purchases/`) | Completo en `SaaS Minimarket` | El formulario de compras debe permitir desglosar productos con precio unitario de costo y actualizar stock directo. | Mejorar el formulario de compras de PROCESA POS con validación de RUC de proveedor. | **P1** |
| **Devoluciones y Notas de Crédito** | **PARCIALMENTE IMPLEMENTADO** (`src/app/app/pos/returns/`) | Completo en `SaaS Minimarket` | Se requiere vincular la devolución directamente con la emisión automática de Nota de Crédito Electrónica Tipo 07. | Conectar el Server Action de devolución con el servicio `createCreditNoteCpe()`. | **P1** |
| **Variantes de Producto (Talla / Color)**| **NO IMPLEMENTADO** (Catálogo plano) | Completo en `SaaS Tienda Moda` | No existe soporte para productos con variantes combinadas y código de barras individual por variante. | Incorporar como extensión modular `ProductVariant` para comercios de retail y moda. | P2 |
| **Fraccionamiento y Cotizaciones** | **NO IMPLEMENTADO** | Completo en `SaaS Ferretería` | No existe venta por fracciones (kilos/metros) ni conversión rápida de cotización a venta. | Añadir soporte para unidades fraccionadas en catálogo y módulo de cotizaciones. | P2 |
| **Reportes Analíticos de Retail** | **PARCIALMENTE IMPLEMENTADO** (`src/app/app/pos/reports/`) | Completo en `SaaS Minimarket` | Se requiere reporte de productos más vendidos (Pareto), margen bruto por producto y libro de ventas SUNAT. | Enriquecer las consultas de reportes con agregaciones SQL optimizadas indexadas por `company_id`. | **P1** |

---

============================================================
3. SÍNTESIS DE ACCIÓN PARA PROCESA POS
============================================================

1. **QUÉ YA TIENE PROCESA CLOUD (SUPERIOR A LO ADQUIRIDO):**
   - Arquitectura Multi-Tenant real con RLS a nivel de motor PostgreSQL.
   - RBAC granular de 54 permisos y contextos de empresa/sucursal resueltos.
   - Motor de Facturación Electrónica SUNAT UBL 2.1 con firma digital XMLDSig nativa.
   - Auditoría inmutable en tabla `audit_logs` blindada contra mutaciones.

2. **QUÉ DEBEMOS MEJORAR (RESCATADO DE LOS SISTEMAS FUENTE):**
   - Terminal POS: Soporte de atajos de teclado, venta en espera y pagos mixtos.
   - Caja: Implementación estricta de Arqueo Ciego y reporte Z de cierre de turno.
   - Inventario: Automatización del Kardex Valorizado bajo Costo Promedio Ponderado en compras.

3. **QUÉ DEBEMOS INCORPORAR COMO EXTENSIONES FUTURAS:**
   - Variantes de talla y color (Retail Moda).
   - Unidades fraccionadas y cotizaciones rápidas (Ferretería).
   - Control de lotes y fechas de vencimiento (Botica / Pharma).

4. **QUÉ DEBEMOS RECHAZAR OBLIGATORIAMENTE:**
   - Todo código con secretos hardcodeados o sesiones mono-empresa sin JWT.
   - Tablas MySQL con claves autoincrementales sin `company_id` ni `branch_id`.
