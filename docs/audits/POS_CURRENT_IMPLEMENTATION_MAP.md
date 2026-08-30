# PROCESA CLOUD V2 — MAPA DE IMPLEMENTACIÓN ACTUAL DE PROCESA POS
## Auditoría Profunda de Archivos, Server Actions, Permisos, Tablas y Riesgos (Etapa 7A)

---

============================================================
1. RESUMEN EJECUTIVO DE ARQUITECTURA POS
============================================================
* **Ubicación Principal:** `src/app/app/pos/`
* **Total Archivos POS:** 34 archivos (Páginas, Componentes de Cliente, Server Actions).
* **Total Server Actions POS:** 26 Server Actions autenticadas con Zod y validación de permisos.
* **Motor Transaccional Backend:** Funciones RPC PostgreSQL Security Definer (`create_pos_sale`, `open_cash_session`, `close_cash_session`, `create_pos_purchase`, `process_inventory_adjustment`, `process_inventory_transfer`, `process_sale_return`, `void_pos_sale`).
* **Seguridad y Tenancy:** Validación estricta en base de datos mediante `is_company_member(p_company_id)` y `has_permission(p_company_id, permission)`.
* **Inmutabilidad y Auditoría:** Registro automático de eventos en `audit_logs` y `inventory_movements` (Kardex).

---

============================================================
2. MAPA DETALLADO POR DOMINIO
============================================================

### DOMINIO: TERMINAL PUNTO DE VENTA (POS TERMINAL)
| Atributo | Detalle |
|---|---|
| **Archivo Principal UI** | `src/app/app/pos/terminal/page.tsx` |
| **Componente Cliente** | `src/app/app/pos/terminal/terminal-client.tsx` (701 líneas) |
| **Server Actions** | `src/app/app/pos/terminal/actions.ts` (`createPosSale`, `openCashSession`, `closeCashSession`) |
| **Propósito** | Interfaz de mostrador para cajeros: búsqueda de productos, carrito, cálculo de IGV, cobro y emisión. |
| **Permisos Requeridos** | `pos.sales.create`, `pos.cash_sessions.open`, `pos.cash_sessions.close` |
| **Tablas Afectadas** | `sales`, `sale_items`, `payment_records`, `inventory_levels`, `inventory_movements`, `cash_sessions`, `audit_logs` |
| **Estado Actual** | **FUNCTIONAL / NEEDS HARDENING** |
| **Gaps Detectados** | 1. Falta captura global de lector de código de barras sin foco manual.<br>2. Faltan atajos de teclado (`F2-F9`).<br>3. UI de cobro solo envía 1 medio de pago aunque el backend soporta cobro mixto.<br>4. Falta selector de venta en espera en la UI. |
| **Riesgos** | **MEDIUM:** Lentitud en caja de alta velocidad si el cajero debe usar ratón constantemente. |

---

### DOMINIO: CAJA Y TURNOS (CASH MANAGEMENT)
| Atributo | Detalle |
|---|---|
| **Archivos** | `src/app/app/pos/cash-registers/page.tsx`, `src/app/app/pos/cash-registers/actions.ts`, `src/app/app/pos/cash-sessions/page.tsx` |
| **Server Actions** | `createCashRegister`, `toggleCashRegisterStatus`, `openCashSession`, `closeCashSession` |
| **Propósito** | Apertura de turno con monto inicial, supervisión de saldo acumulado y cierre de turno. |
| **Permisos Requeridos** | `pos.cash_registers.read`, `pos.cash_registers.manage`, `pos.cash_sessions.open`, `pos.cash_sessions.close` |
| **Tablas Afectadas** | `cash_registers`, `cash_sessions`, `cash_movements`, `audit_logs` |
| **Estado Actual** | **FUNCTIONAL / PARTIAL** |
| **Gaps Detectados** | 1. El cierre de caja actual muestra el monto teórico al cajero (no es **Arqueo Ciego** estricto).<br>2. Falta plantilla de impresión de Ticket Z de cierre de turno. |
| **Riesgos** | **HIGH (Control Interno):** Posibilidad de cuadres forzados por el cajero al conocer el saldo teórico previo. |

---

### DOMINIO: VENTAS Y COMPROBANTES (SALES)
| Atributo | Detalle |
|---|---|
| **Archivos** | `src/app/app/pos/sales/page.tsx`, `src/app/app/pos/sales/[id]/page.tsx`, `src/app/app/pos/sales/[id]/receipt/page.tsx`, `src/app/app/pos/sales/actions.ts` |
| **Server Actions** | `createSaleReturnAction`, `voidSaleAction` |
| **Propósito** | Historial de ventas, visor de detalle de comprobante, ticket térmico imprimible y acciones de post-venta. |
| **Permisos Requeridos** | `pos.sales.read`, `pos.sales.return`, `pos.sales.void` |
| **Tablas Afectadas** | `sales`, `sale_items`, `sale_returns`, `payment_records`, `inventory_movements`, `audit_logs` |
| **Estado Actual** | **PRODUCTION READY** |
| **Gaps Detectados** | El ticket térmico se imprime vía `window.print()` con CSS `@media print`; falta conector directo a impresoras térmicas ESC/POS en red. |
| **Riesgos** | **LOW:** Dependencia del diálogo de impresión del navegador. |

---

### DOMINIO: PRODUCTOS Y CATEGORÍAS (CATALOG)
| Atributo | Detalle |
|---|---|
| **Archivos** | `src/app/app/pos/products/page.tsx`, `src/app/app/pos/products/actions.ts`, `src/app/app/pos/categories/page.tsx`, `src/app/app/pos/categories/actions.ts` |
| **Server Actions** | `createProduct`, `updateProduct`, `toggleProductStatus`, `createCategory`, `updateCategory`, `toggleCategoryStatus` |
| **Propósito** | Mantenimiento del maestro de artículos: código, SKU, código de barras EAN-13, precio, costo, impuestos y categorías. |
| **Permisos Requeridos** | `pos.products.read`, `pos.products.manage`, `pos.categories.read`, `pos.categories.manage` |
| **Tablas Afectadas** | `products`, `categories`, `audit_logs` |
| **Estado Actual** | **PRODUCTION READY (Retail Estándar)** |
| **Gaps Detectados** | Catálogo plano; no soporta matriz de variantes multidimensionales (talla/color) para retail moda (Fase posterior). |
| **Riesgos** | **NONE** para Minimarkets y Bodegas. |

---

### DOMINIO: INVENTARIO, ALMACENES Y KARDEX
| Atributo | Detalle |
|---|---|
| **Archivos** | `src/app/app/pos/inventory/page.tsx`, `src/app/app/pos/inventory/inventory-hub-client.tsx`, `src/app/app/pos/inventory/actions.ts`, `src/app/app/pos/warehouses/page.tsx`, `src/app/app/pos/warehouses/actions.ts` |
| **Server Actions** | `createInventoryAdjustmentAction`, `createInventoryTransferAction`, `createWarehouse`, `updateWarehouse`, `toggleWarehouseStatus` |
| **Propósito** | Control multialmacén, transferencias entre sedes, ajustes de stock por merma/sobrante y visualización de Kardex valorizado. |
| **Permisos Requeridos** | `pos.inventory.read`, `pos.inventory.manage`, `pos.inventory.adjust`, `pos.inventory.transfer`, `pos.inventory.kardex`, `pos.warehouses.manage` |
| **Tablas Afectadas** | `warehouses`, `inventory_levels`, `inventory_movements`, `inventory_adjustments`, `inventory_transfers`, `audit_logs` |
| **Estado Actual** | **PRODUCTION READY** |
| **Gaps Detectados** | La visualización de Kardex está completamente implementada; falta incorporar alerta automática de punto de reorden vía email. |
| **Riesgos** | **LOW.** |

---

### DOMINIO: COMPRAS A PROVEEDORES (PURCHASES)
| Atributo | Detalle |
|---|---|
| **Archivos** | `src/app/app/pos/purchases/page.tsx`, `src/app/app/pos/purchases/new/page.tsx`, `src/app/app/pos/purchases/new/purchase-form-client.tsx`, `src/app/app/pos/purchases/[id]/page.tsx`, `src/app/app/pos/purchases/[id]/purchase-reversals-client.tsx`, `src/app/app/pos/purchases/actions.ts` |
| **Server Actions** | `createPosPurchase`, `createPurchaseReturnAction` |
| **Propósito** | Registro de facturas/boletas de compra de mercadería, ingreso a stock de almacén y cálculo de costo unitario. |
| **Permisos Requeridos** | `pos.purchases.read`, `pos.purchases.create`, `pos.purchases.return` |
| **Tablas Afectadas** | `purchases`, `purchase_items`, `purchase_returns`, `inventory_levels`, `inventory_movements`, `products`, `audit_logs` |
| **Estado Actual** | **FUNCTIONAL** |
| **Gaps Detectados** | La función de costeo actualiza `products.cost`, pero se debe asegurar la fórmula de **Costo Promedio Ponderado** formal: `C_nuevo = ((Stock_ant * Costo_ant) + (Cant_compra * Costo_compra)) / (Stock_ant + Cant_compra)`. |
| **Riesgos** | **MEDIUM:** Distorsión de margen bruto si se ingresan compras a precios volátiles sin ponderación de stock anterior. |

---

### DOMINIO: DEVOLUCIONES Y ANULACIONES (RETURNS & VOIDS)
| Atributo | Detalle |
|---|---|
| **Archivos** | `src/app/app/pos/sales/[id]/sale-reversals-client.tsx`, `src/app/app/pos/sales/actions.ts` |
| **Server Actions** | `createSaleReturnAction`, `voidSaleAction` |
| **Propósito** | Devolución parcial de ítems o anulación total de venta con reversión de inventario y caja. |
| **Permisos Requeridos** | `pos.sales.return`, `pos.sales.void` |
| **Tablas Afectadas** | `sale_returns`, `sale_return_items`, `sales`, `inventory_levels`, `inventory_movements`, `cash_sessions`, `audit_logs` |
| **Estado Actual** | **FUNCTIONAL / PARTIAL** |
| **Gaps Detectados** | La devolución reingresa stock y registra el egreso en caja, pero **NO está conectada automáticamente** al servicio `pos.cpe.credit_note` para emitir la Nota de Crédito Electrónica Tipo 07 a SUNAT. |
| **Riesgos** | **HIGH (Fiscal):** Descalce tributario si se devuelve mercadería sin emitir el comprobante electrónico de ajuste. |

---

### DOMINIO: FACTURACIÓN ELECTRÓNICA SUNAT (CPE & UBL 2.1)
| Atributo | Detalle |
|---|---|
| **Archivos** | `src/lib/cpe/types.ts`, `src/lib/cpe/catalogs.ts`, `src/lib/cpe/ubl/builder.ts`, `src/lib/cpe/signer/signer.ts`, `src/lib/cpe/transport/transport.ts`, `src/lib/cpe/cdr/parser.ts`, `src/lib/cpe/qr/generator.ts`, `src/app/app/pos/settings/electronic-invoicing/page.tsx` |
| **Propósito** | Motor transversal de emisión fiscal: generación de XML UBL 2.1, firma digital XMLDSig, envío SOAP/REST a SUNAT, recepción y parsing de CDR y generación de QR canónico. |
| **Permisos Requeridos** | `pos.cpe.read`, `pos.cpe.issue`, `pos.cpe.retry`, `pos.cpe.credit_note`, `pos.cpe.config.manage` |
| **Tablas Afectadas** | `electronic_documents`, `electronic_document_events`, `company_cpe_configs`, `cpe_series` |
| **Estado Actual** | **PRODUCTION READY (Motor Base)** |
| **Gaps Detectados** | Conexión automática pendiente desde el Server Action de devoluciones. |
| **Riesgos** | **LOW:** Motor robusto y probado. |

---

### DOMINIO: REPORTES Y BUSINESS INTELLIGENCE
| Atributo | Detalle |
|---|---|
| **Archivos** | `src/app/app/pos/reports/page.tsx` |
| **Propósito** | Reportes de ventas por cajero, ventas por medio de pago, ranking de productos más vendidos y valorización de stock. |
| **Permisos Requeridos** | `pos.reports.sales`, `pos.reports.cash`, `pos.reports.inventory`, `pos.reports.purchases`, `pos.reports.cost` |
| **Tablas Consultadas** | `sales`, `sale_items`, `payment_records`, `cash_sessions`, `inventory_levels`, `products` |
| **Estado Actual** | **FUNCTIONAL** |
| **Gaps Detectados** | Falta exportación formal a formato SIRE SUNAT (Registro de Ventas e Ingresos Electrónicos). |
| **Riesgos** | **LOW.** |
