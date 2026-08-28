# PROCESA CLOUD V2 — MATRIZ DE PRUEBAS DE TERMINAL POS (ETAPA 7B)
## Velocidad Operativa, Scanner Continuo, Atajos de Teclado y Cobro Mixto

---

============================================================
1. MATRIZ DE CASOS DE PRUEBA Y RESULTADOS
============================================================

| ID Test | Categoría | Escenario de Prueba | Comportamiento Esperado | Resultado |
|---|---|---|---|:---:|
| **SCANNER-01** | Scanner | Escaneo de código de barras exacto (ej. `7751234567890` + Enter) | Agrega producto al ticket y mantiene el foco en el input para el siguiente escaneo sin requerir mouse | **PASS** |
| **SCANNER-02** | Scanner | Escaneo consecutivo del mismo código de barras | Incrementa la cantidad existente en la línea del carrito en lugar de duplicar la fila | **PASS** |
| **SCANNER-03** | Scanner | Escaneo de código inexistente o no encontrado | Muestra banner de advertencia claro ("Código no encontrado") sin romper el carrito ni perder el foco | **PASS** |
| **KEYBOARD-01** | Teclado | Presionar tecla `F2` en cualquier parte de la pantalla | Enfoca inmediatamente la caja de búsqueda / escáner de código de barras | **PASS** |
| **KEYBOARD-02** | Teclado | Presionar tecla `F4` con productos en el carrito y turno abierto | Abre inmediatamente el modal de cobro y pago | **PASS** |
| **KEYBOARD-03** | Teclado | Presionar tecla `Escape` con modal abierto | Cierra el modal activo y regresa el foco al flujo operativo de la terminal | **PASS** |
| **SALE-MIXED-01** | Cobro Mixto | Venta de S/ 100 con Efectivo S/ 40 + Tarjeta S/ 60 | Backend `create_pos_sale` registra 2 filas en `payment_records` y cuadre exacto de saldo | **PASS** |
| **SALE-MIXED-02** | Cobro Mixto | Venta con Efectivo S/ 50 + Billetera Digital (Yape) S/ 50 | Registra métodos `cash` y `digital` vinculados al comprobante con saldo restante S/ 0.00 | **PASS** |
| **SALE-MIXED-03** | Validación | Intento de confirmación con sumatoria de pagos desigual al total | Botón de confirmar deshabilitado y mensaje de advertencia ("Diferencia: S/ X.XX") | **PASS** |
| **SALE-STOCK-01** | Concurrencia | Intento de venta cuando el stock fue agotado por otro cajero | RPC `create_pos_sale` arroja error de stock insuficiente; la UI muestra el error y **conserva el carrito intacto** | **PASS** |
| **SALE-DUP-01** | Idempotencia | Doble click rápido o doble Enter al confirmar cobro | `isSubmittingSale` deshabilita el botón instantáneamente y el backend utiliza `idempotency_key` única | **PASS** |
| **PARKED-01** | Ventas en Espera | Alternar entre Ticket 1, Ticket 2 y Ticket 3 | Permite atender a un cliente nuevo sin perder los productos agregados del cliente anterior | **PASS** |

---

============================================================
2. VERIFICACIÓN DE SEGURIDAD Y MULTI-TENANCY
============================================================
* **Inyección de IDs:** NO CRITICAL RISK DETECTED. El frontend no envía `company_id` ajenos; toda llamada a `createPosSale` pasa por `requireModule(companyId, "pos")` y `requirePermission(companyId, "pos.sales.create")`.
* **Manejo de Transacciones:** Atómico en PostgreSQL mediante la función PL/pgSQL `create_pos_sale`.
* **Aislamiento Multi-Tenant:** RLS validado y activo en todas las tablas (`sales`, `sale_items`, `payment_records`, `cash_sessions`, `inventory_levels`).
