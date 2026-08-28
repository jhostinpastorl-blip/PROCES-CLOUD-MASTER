# PROCESA POS — FUNCTIONAL BLUEPRINT MAESTRO
## Contrato Funcional, Arquitectura de Dominio y Guía de Implementación

---

## A. VISIÓN DEL PRODUCTO
**PROCESA POS** es la solución vertical prioritaria (P1) del ecosistema PROCESA Cloud. Está orientada inicialmente a **Minimarkets, Bodegas, Tiendas de Conveniencia y Pequeño Retail**, con una arquitectura extensible para soportar **Ferreterías, Tiendas de Moda y otros comercios**.

---

## B. MAPA COMPLETO DE MÓDULOS Y SUBMÓDULOS (BASADO EN EVIDENCIA REAL)

```
PROCESA POS
│
├── 1. DASHBOARD COMERCIAL
│   ├── Métricas del Día (Ventas Totales, Ticket Promedio, Margen Bruto Estimado)
│   ├── Estado de Cajas Activas en la Sucursal
│   ├── Alertas de Inventario (Productos sin stock / Productos por agotarse)
│   └── Comprobantes SUNAT Pendientes de Envío / Rechazados
│
├── 2. TERMINAL PUNTO DE VENTA (POS OPERATIVO)
│   ├── Modo Rápido (Escáner de Código de Barras / Búsqueda Instantánea con Teclado)
│   ├── Carrito Reactivo (Cantidades, Modificadores de Precio, Descuentos por Línea/Global)
│   ├── Selector Rápido de Cliente (DNI, RUC con autocompletado, Cliente Varios)
│   ├── Venta en Espera (Pausar y recuperar carritos de compra)
│   └── Cobro Rápido y Pago Mixto (Efectivo con cálculo de vuelto, Yape/Plin, Tarjeta, Crédito)
│
├── 3. GESTIÓN DE CAJA Y TURNOS
│   ├── Apertura de Caja (Selección de caja física + Monto inicial de efectivo)
│   ├── Movimientos Extraordinarios (Ingresos manuales / Egresos / Gastos menores / Retiros)
│   ├── Arqueo Ciego (Conteo de efectivo sin mostrar el sistema antes de cuadrar)
│   └── Cierre de Turno (Cálculo de sobrante/faltante, resumen por forma de pago, Ticket Z)
│
├── 4. CATÁLOGO Y PRODUCTOS
│   ├── Maestro de Productos (SKU, Código de Barras EAN-13, Nombre, Precio Venta, Costo, IGV)
│   ├── Categorías, Subcategorías y Marcas
│   ├── Unidades de Medida y Fracciones (Unidad, Kilo, Litro, Metro - Catálogo 03 SUNAT)
│   ├── Variantes de Producto (Talla / Color / Presentación) [Extensión Retail]
│   └── Promociones y Precios Especiales (2x1, Descuentos por Volumen, Lista Mayorista)
│
├── 5. INVENTARIO Y ALMACENES
│   ├── Stock en Tiempo Real por Sucursal (`branch_id`)
│   ├── Kardex Físico y Valorizado (Método de Costo Promedio Ponderado)
│   ├── Ajustes Manuales de Inventario (Entradas/Salidas por merma, conteo físico, donación)
│   └── Transferencias entre Sucursales (Guías internas de traslado)
│
├── 6. COMPRAS Y PROVEEDORES
│   ├── Directorio de Proveedores (RUC, Razón Social, Teléfono, Contacto comercial)
│   ├── Registro de Compras (Facturas/Boletas de compra con desglose de costos e impuestos)
│   └── Recepción de Mercadería (Actualización automática de stock y costo promedio)
│
├── 7. DEVOLUCIONES Y ANULACIONES
│   ├── Devolución de Mercadería (Total o Parcial con reintegro automático al Kardex)
│   ├── Anulación de Venta (Bloqueo de transacción y reversión completa)
│   ├── Emisión de Nota de Crédito Electrónica SUNAT (Tipo 07)
│   └── Reintegro de Dinero en Caja
│
├── 8. FACTURACIÓN ELECTRÓNICA CPE SUNAT
│   ├── Configuración de Series y Numeraciones (B001, F001, NC01, NV01)
│   ├── Generación UBL 2.1 y Firma Digital XMLDSig en segundo plano
│   ├── Impresión Térmica de Comprobantes (Formato 80mm / 58mm) con QR Canónico
│   └── Reintento Automático y Descarga de XML y CDR oficial
│
├── 9. REPORTES Y ANÁLISIS COMERCIAL
│   ├── Reporte Diario de Ventas por Sucursal, Cajero y Medio de Pago
│   ├── Reporte de Productos Más Vendidos (Ranking Pareto 80/20)
│   ├── Reporte de Rentabilidad Bruta (Ventas vs Costo de Mercadería Vendida)
│   └── Libro de Ventas Formato SUNAT (Exportación a Excel / CSV)
│
└── 10. CONFIGURACIÓN Y HARDWARE POS
    ├── Parámetros de Ticket (Logo, RUC, Dirección, Pie de Página, Redes Sociales)
    ├── Configuración de Impresoras Térmicas y Gaveta de Dinero (Comandos ESC/POS)
    └── Parámetros de Balanza Digital (Lectura de peso por puerto serie/código de barras)
```

---

## C. TERMINAL POS: NAVEGACIÓN Y SECUENCIA OPERATIVA
1. **Atajos de Teclado:** `F2` Búsqueda de productos, `F4` Asignar cliente, `F8` Venta en espera, `F9` Cobrar, `ESC` Limpiar carrito.
2. **Búsqueda Inteligente:** Búsqueda instantánea por escáner de código de barras (EAN-13), SKU o coincidencia parcial de texto en nombre de producto.
3. **Manejo de Carrito:** Actualización inmediata de cantidades (`+`, `-` o ingreso directo), cálculo de subtotales, discriminación automática de gravadas/exoneradas/inafectas y aplicación de promociones automáticas.
4. **Selector de Cliente:** Modal ultrarrápido con autocompletado de RUC/DNI contra padrón local y creación rápida sin salir de la pantalla de venta.
5. **Proceso de Cobro:** Soporte de pago combinado (ej. S/ 50 en Efectivo + S/ 35 en Yape), cálculo automático de vuelto y apertura de gaveta de dinero.

---

## D. PRODUCTOS: CORE POS VS EXTENSIONES VERTICALES

| Campo / Atributo | Pertenece a Core POS | Pertenece a Extensión Vertical | Tipo de Negocio donde Aplica |
|---|:---:|:---:|---|
| **ID, SKU, Barcode, Nombre, Descripción** | **SÍ** | - | Todos (Bodega, Minimarket, Moda, Ferretería) |
| **Precio Venta, Costo Compra, IGV Type** | **SÍ** | - | Todos |
| **Stock Actual, Stock Mínimo** | **SÍ** | - | Todos |
| **Categoría, Marca** | **SÍ** | - | Todos |
| **Unidad de Medida (Unidad, Kilo, Litro)** | **SÍ** | - | Minimarket, Bodega, Ferretería |
| **Fraccionamiento y Venta a Granel** | - | **Extensión Granel** | Ferretería, Bodegas, Fruterías |
| **Variantes (Talla, Color, Presentación)** | - | **Extensión Moda/Retail**| Tiendas de Ropa, Calzado, Boutiques |
| **Lote y Fecha de Vencimiento** | - | **Extensión Pharma** | Boticas, Farmacias, Alimentos perecibles |

---

## E. INVENTARIO Y ALMACENES
- **Multisede:** El stock se registra por `(company_id, branch_id, product_id)`.
- **Kardex Valorizado:** Toda entrada (Compra, Ajuste Positivo, Devolución de Cliente) y salida (Venta, Ajuste Negativo, Merma, Traslado) genera una línea de Kardex con saldo físico y saldo valorizado bajo Costo Promedio Ponderado.
- **Inventario Físico:** Módulo de auditoría de inventario a ciegas para ingreso de conteos físicos y generación automática de ajustes de cuadre.

---

## F. GESTIÓN DE CAJA Y ARQUEO CIEGO
- **Regla Operativa:** Un usuario no puede realizar ventas si no tiene una sesión de caja abierta en su sucursal activa.
- **Arqueo Ciego:** En el cierre de turno, el cajero debe ingresar el conteo físico de billetes y monedas **sin ver el saldo esperado del sistema**. Una vez guardado el conteo, el sistema genera la comparativa y determina el sobrante o faltante.

---

## G. COMPRAS Y RECEPCIÓN DE MERCADERÍA
- **Documento de Compra:** Registro de compras con número de serie y correlativo de proveedor (Factura, Boleta, Guía).
- **Actualización de Costo:** Al confirmar la compra, el costo del producto se actualiza mediante la fórmula:
  $$\text{Nuevo Costo} = \frac{(\text{Stock Actual} \times \text{Costo Actual}) + (\text{Cantidad Comprada} \times \text{Precio Compra})}{\text{Stock Actual} + \text{Cantidad Comprada}}$$

---

## H. ESTADOS DEL CICLO DE VIDA DE LA VENTA
```
[DRAFT] -> [CONFIRMED] -> [PAID] -> [ISSUED_CPE] -> [COMPLETED]
                |
                +-> [VOIDED] / [RETURNED]
```

---

## I. DEVOLUCIONES, ANULACIONES Y NOTAS DE CRÉDITO
- **Anulación:** Aplica a ventas del mismo día antes del cierre de caja o del envío del resumen diario SUNAT. Reversa el dinero de caja, restituye el stock y marca la venta como anulada.
- **Devolución:** Aplica a ventas de días anteriores o cuando el cliente devuelve parte de los ítems. Requiere obligatoriamente la emisión de una **Nota de Crédito Electrónica (Tipo 07)** ante SUNAT para justificar tributariamente el reintegro de stock y dinero.

---

## J. INTEGRACIÓN CON CPE SUNAT
```
Venta Confirmada ──> UBL 2.1 Generator ──> XMLDSig Signer ──> SUNAT API ──> CDR (Aceptado/Rechazado)
                          │
                          └──> Impresión Ticket con QR Canónico
```

---

## K. GESTIÓN DE CLIENTES
- **Core POS:** Documento (DNI/RUC/CE), Razón Social / Nombres, Dirección fiscal, Teléfono, Email.
- **Extensión Créditos (PROCESA COBROS):** Línea de crédito aprobada, saldo adeudado, días de crédito y bloqueo por morosidad.

---

## L. GESTIÓN DE PROVEEDORES
- Directorio de proveedores con RUC, Razón Social, Condición de Pago (Contado / Crédito 15, 30, 60 días), Cuentas bancarias y Contacto comercial.

---

## M. MODALIDADES DE PAGO EXTENSIBLES
- `cash`: Efectivo en Soles (con cálculo de vuelto).
- `yape_plin`: Billeteras digitales móviles (con captura opcional de número de operación).
- `card`: Tarjeta Débito/Crédito (Visa, Mastercard con 4 últimos dígitos).
- `transfer`: Transferencia bancaria directa.
- `credit`: Venta al crédito con cargo a cuenta corriente del cliente.
- `mixed`: Combinación de dos o más métodos de pago en una sola transacción.

---

## N. ESTRUCTURA DE PRECIOS Y DESCUENTOS
- **Precio Estándar:** Precio de venta al público con IGV incluido.
- **Precio Mayorista:** Aplicable automáticamente al superar un umbral de unidades (ej. a partir de 6 unidades).
- **Descuentos:** Descuento porcentual o monto fijo por línea o al total de la venta, protegido por el permiso `pos.discounts.apply`.

---

## O. EXTENSIÓN RETAIL MODA (TALLAS Y COLORES)
- Matriz bidimensional de atributos (ej. Talla: S, M, L, XL x Color: Negro, Azul, Blanco).
- Cada variante genera su propio SKU y código de barras único para escaneo directo en caja.

---

## P. EXTENSIÓN FERRETERÍA Y GRANEL
- Unidades de medida continuas (metros, kilogramos, litros, bolsas).
- Soporte para cotizaciones rápidas convertibles en ventas con un solo clic.

---

## Q. CATÁLOGO DE REPORTES DE PROCESA POS
1. **Operativos:** Resumen de Caja Z, Ventas por Cajero, Detalle de Movimientos de Caja.
2. **Comerciales:** Ventas Diarias / Mensuales, Ranking de Productos Más Vendidos, Ventas por Categoría.
3. **Inventario:** Valorización de Stock por Sucursal, Alertas de Stock Mínimo, Reporte de Kardex.
4. **Tributarios:** Libro de Ventas Electrónico (PLE / SIRE), Resumen de Comprobantes Emitidos y Anulados.

---

## R. MATRIZ DE PERMISOS GRANULARES DE POS (RBAC)

| Permiso | Descripción | Rol Típico |
|---|---|---|
| `pos.terminal.access` | Acceder a la pantalla del terminal de ventas | Cajero, Supervisor, Admin, Owner |
| `pos.sales.create` | Procesar ventas y cobrar a clientes | Cajero, Supervisor, Admin, Owner |
| `pos.sales.cancel` | Anular ventas emitidas | Supervisor, Admin, Owner |
| `pos.cash.open` | Abrir turno de caja con saldo inicial | Cajero, Supervisor, Admin, Owner |
| `pos.cash.movement` | Registrar entradas y salidas de dinero extraordinarias | Supervisor, Admin, Owner |
| `pos.cash.close` | Realizar arqueo y cierre de turno | Cajero, Supervisor, Admin, Owner |
| `pos.discounts.apply` | Aplicar descuentos por encima del límite estándar | Supervisor, Admin, Owner |
| `pos.returns.manage` | Procesar devoluciones de mercadería y emitir Notas de Crédito | Supervisor, Admin, Owner |
| `pos.reports.view` | Visualizar reportes de rentabilidad y estadísticas | Admin, Owner |
| `inventory.kardex.read` | Consultar movimientos y costo promedio | Almacenero, Admin, Owner |
| `inventory.stock.adjust`| Realizar ajustes manuales de stock por merma | Supervisor, Admin, Owner |

---

## S. MATRIZ DE CONFIGURACIÓN DE FEATURES POR TIPO DE COMERCIO

| Feature / Capacidad | Minimarket / Bodega | Retail Moda | Ferretería | Botica / Farmacia |
|---|:---:|:---:|:---:|:---:|
| **Escaneo de Código de Barras** | **OBLIGATORIO** | **OBLIGATORIO** | **OBLIGATORIO** | **OBLIGATORIO** |
| **Venta Rápida con Teclado** | **OBLIGATORIO** | OPCIONAL | **OBLIGATORIO** | **OBLIGATORIO** |
| **Arqueo Ciego de Caja** | **OBLIGATORIO** | **OBLIGATORIO** | **OBLIGATORIO** | **OBLIGATORIO** |
| **Variantes de Talla y Color** | NO | **OBLIGATORIO** | NO | NO |
| **Unidades Fraccionadas (Kg/M)** | OPCIONAL | NO | **OBLIGATORIO** | OPCIONAL |
| **Control de Lotes y Vencimientos**| NO | NO | NO | **OBLIGATORIO** |
| **Facturación Electrónica SUNAT** | **OBLIGATORIO** | **OBLIGATORIO** | **OBLIGATORIO** | **OBLIGATORIO** |

---

## T. REUTILIZACIÓN DE LO MEJOR DE CADA SISTEMA AUDITADO
1. **De `SaaS Minimarket`:** Se adopta el diseño del flujo de caja (apertura, movimientos, arqueo, cierre) y el flujo de carrito rápido.
2. **De `SaaS Ventas e Inventarios`:** Se adopta la estructura de Kardex valorizado con costo promedio ponderado y transferencias multisede.
3. **De `SaaS Tienda Moda`:** Se adopta el modelo de variantes y generador de etiquetas de código de barras.
4. **De `SaaS Ferretería`:** Se adopta el fraccionamiento de unidades y el módulo de cotizaciones convertibles.
5. **De `PROCESA Cloud V1`:** Se conserva el 100% del motor nativo de firma digital XMLDSig y generación UBL 2.1 SUNAT.
