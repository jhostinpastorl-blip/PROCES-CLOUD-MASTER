# PROCESA CLOUD — LÍMITES DE MÓDULOS Y DEPENDENCIAS (MODULE BOUNDARIES)

============================================================
1. REGLA FUNDAMENTAL DE ACOPLAMIENTO
============================================================

```
        ┌─────────────────────────────────────────┐
        │            PROCESA CLOUD CORE           │
        │  (Auth, Tenancy, RBAC, Subscriptions)   │
        └────────────────────┬────────────────────┘
                             │ (Heredan todos)
             ┌───────────────┴───────────────┐
             ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│   PRODUCTOS VERTICALES  │     │  MÓDULOS TRANSVERSALES  │
│  (POS, REST, GYM, VET)  │     │  (CONTA, RRHH, DOCS)    │
└────────────┬────────────┘     └────────────┬────────────┘
             │                               │
             └───────────────┬───────────────┘
                             ▼
        ┌─────────────────────────────────────────┐
        │        DOMINIO FISCAL / CPE SUNAT       │
        │  (Generador UBL, Firma XMLDSig, CDR)   │
        └─────────────────────────────────────────┘
```

### Reglas de Dependencia:
1. **Verticales dependen del Core:** PROCESA POS, REST o GYM consumen servicios del Core, pero el Core **nunca depende** de una vertical específica.
2. **Independencia entre Verticales:** PROCESA POS no debe importar código ni tablas de PROCESA REST ni de PROCESA GYM.
3. **CPE como Dominio Autónomo:** La infraestructura de Facturación Electrónica (UBL 2.1, firma digital, conexión a SUNAT) es un servicio transversal autónomo. Cualquier vertical que realice ventas comerciales puede solicitar la emisión de un comprobante electrónico sin duplicar la lógica fiscal.

---

============================================================
2. MAPA DE DOMINIOS: PROCESA POS (PRIORIDAD P1)
============================================================
PROCESA POS se estructura en los siguientes subdominios claros:
- **Cajas y Sesiones (`Cash Domain`):** Cajas físicas, apertura de turno, movimientos de ingreso/egreso, arqueo ciego, cierre y control de diferencias.
- **Ventas y Cobros (`Sales Domain`):** Carrito de ventas POS, cálculo de impuestos (IGV 18%, exonerado, inafecto), descuentos, medios de pago (Efectivo, Tarjeta, Yape/Plin, Transferencia), ticket de venta.
- **Inventario y Productos (`Inventory Domain`):** Catálogo de productos, códigos de barra, categorías, unidades de medida (Catálogo 03 SUNAT), control de stock por sucursal, alertas de stock mínimo y Kardex.
- **Compras y Proveedores (`Purchases Domain`):** Registro de compras, recepción de mercadería y actualización automática de costo promedio e inventario.
- **Devoluciones y Anulaciones (`Returns Domain`):** Devolución parcial/total de productos, reversión de stock y emisión de Notas de Crédito fiscales.
- **Integración Fiscal (`CPE Domain`):** Conversión de venta a Boleta/Factura electrónica, generación de QR canónico, firma digital y obtención de CDR de SUNAT.
