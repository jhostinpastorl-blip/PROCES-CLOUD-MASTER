# PROCESA CLOUD V2 — MATRIZ DE PRUEBAS DE CAJA Y TURNOS (ETAPA 7C)
## Arqueo Ciego, Reconciliación Inmutable y Comprobante Imprimible de Cierre

---

============================================================
1. MATRIZ DE CASOS DE PRUEBA Y CLASIFICACIÓN
============================================================

| ID Test | Categoría | Escenario de Prueba | Tipo de Ejecución | Comportamiento Esperado | Resultado |
|---|---|---|:---:|---|:---:|
| **CASH-BLIND-01** | Arqueo Ciego | Apertura de modal de cierre de turno por el cajero | **MANUAL / UI** | El cajero ingresa conteo físico a ciegas sin ver el saldo esperado por sistema ni la diferencia previa | **PASS** |
| **CASH-CLOSE-01** | Reconciliación | Cierre con efectivo declarado idéntico al esperado | **AUTOMATED (Fase 1B)** | Base de datos registra `difference = 0.00` y clasifica estado como `CUADRADA (Sin Diferencias)` | **PASS** |
| **CASH-CLOSE-02** | Reconciliación | Cierre con efectivo declarado menor al esperado (Faltante) | **AUTOMATED (Fase 1B)** | Registra `difference < 0.00` (ej. `-S/ 10.00`), inserta movimiento `CLOSING` y audita faltante | **PASS** |
| **CASH-CLOSE-03** | Reconciliación | Cierre con efectivo declarado mayor al esperado (Sobrante) | **AUTOMATED (Fase 1B)** | Registra `difference > 0.00` (ej. `+S/ 15.00`), actualiza estado de caja a `closed` | **PASS** |
| **CASH-DUP-01** | Doble Cierre | Intentos concurrentes o doble submit de cierre sobre la misma sesión | **DOCUMENTED ONLY / RPC** | Función RPC `close_cash_session` aplica `FOR UPDATE` y rechaza con `CASH_SESSION_ALREADY_CLOSED` | **PASS** |
| **CASH-PERM-01** | Seguridad | Intento de cierre de caja por usuario sin permiso `pos.cash_sessions.close` | **AUTOMATED (Fase 1B)** | Backend `actions.ts` y RPC PostgreSQL rechazan la mutación con excepción de autorización | **PASS** |
| **CASH-TENANT-01** | Multi-Tenancy | Intento de consulta o cierre de sesión de Company B por usuario de Company A | **AUTOMATED (Fase 1A/1B)** | Políticas RLS sobre `cash_sessions` y `cash_movements` aíslan 100% de los datos entre empresas | **PASS** |
| **CASH-PRINT-01** | Impresión | Carga y renderizado de `/app/pos/cash-sessions/[id]/summary` | **MANUAL / BUILD** | Muestra desglose por medio de pago (Efectivo, Tarjeta, Digital, Transferencia), arqueo y líneas de firma | **PASS** |
| **CASH-DENOM-01** | Calculadora | Uso del desglosador por denominaciones (Billetes S/ 200..10 y Monedas S/ 5..0.10) | **MANUAL / UI** | Suma física calculada reactivamente en el formulario antes de enviar el valor final a BD | **PASS** |

---

============================================================
2. TERMINOLOGÍA ADOPTADA
============================================================
* **Concepto Oficial:** **"COMPROBANTE / RESUMEN DE CIERRE DE CAJA"** (Documento operativo y de control interno).
* **Nota Conceptual:** Se evita denominarlo como obligación fiscal "Reporte Z SUNAT" ya que en el régimen peruano el comprobante de cierre de turno es un instrumento de control interno de tesorería y auditoría, mientras que la emisión electrónica fiscal se rige por los comprobantes de venta (Boletas/Facturas/Notas de Crédito).

---

============================================================
3. VERIFICACIÓN DE SEGURIDAD Y CONCURRENCIA
============================================================
* **Inmutabilidad:** Una vez asignado el estado `closed`, la sesión queda bloqueada para nuevas ventas y modificaciones de arqueo.
* **Bloqueo Pesimista:** La cláusula `FOR UPDATE` en PostgreSQL garantiza atomicidad estricta contra condiciones de carrera.
* **Audit Trail:** Inserción automática de evento `cash_session.closed` en `audit_logs` con metadatos de efectivo esperado, declarado y diferencia.
