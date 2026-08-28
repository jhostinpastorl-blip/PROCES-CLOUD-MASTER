# PROCESA CLOUD — MATRIZ DE EVALUACIÓN Y REUTILIZACIÓN (REUSE MATRIX)

============================================================
1. CRITERIOS DE CLASIFICACIÓN
============================================================
- **`REUSE` (Reutilización Directa de Concepto/Lógica):** Lógica de cálculo, contratos de datos, validaciones fiscales o estructuras que encajan directamente en la arquitectura TypeScript/Next.js/PostgreSQL de PROCESA Cloud.
- **`ADAPT` (Adaptación Arquitectónica):** Reglas de negocio y flujos valiosos que deben reescribirse en Server Components / Server Actions con aislamiento multi-tenant `company_id` / `branch_id`.
- **`REFERENCE` (Referencia Funcional):** Pantallas, vocabularios y listados útiles para documentar requisitos de futuras verticales sin migrar código.
- **`REJECT` (Descarte Técnico Obligatorio):** Código antiguo PHP/Blade/Django/C#, conexiones MySQL monolíticas, archivos con secretos hardcodeados o componentes sin soporte multiempresa.

---

============================================================
2. MATRIZ DE REUTILIZACIÓN POR CAPA
============================================================

| Capa / Activo | Decisión | Justificación Técnica |
|---|:---:|---|
| **Estructuras de Base de Datos Originales** | **REJECT / ADAPT** | Las tablas históricas usan esquemas MySQL o mono-empresa con IDs autoincrementales (`bigint`). En PROCESA Cloud se adaptan los campos a PostgreSQL con `UUID`, `company_id`, `branch_id`, timestamps e inmutabilidad RLS. |
| **Lógica de Caja y Turnos (POS)** | **ADAPT** | Se rescata el flujo completo: Apertura con monto base → Registro de movimientos con categoría (Ingreso/Egreso) → Arqueo ciego → Cierre con cálculo de diferencias y balance esperado. |
| **Lógica de Venta y Carrito (POS)** | **ADAPT** | Se rescata el cálculo tributario (IGV 18%, Gravada/Exonerada/Inafecta, Descuento global o por ítem) y medios de pago combinados (Efectivo + Digital). |
| **Lógica de Kardex e Inventario** | **ADAPT** | Se rescata el método de costeo promedio ponderado y tipos de movimiento (Venta, Compra, Devolución, Ajuste positivo/negativo, Transferencia entre sedes). |
| **Lógica de Comprobantes SUNAT (CPE)** | **REUSE (Existente en V1)** | PROCESA Cloud ya cuenta con su motor nativo de firma XMLDSig y UBL 2.1 (Migración 070). Se integra directamente como servicio backend para POS. |
| **Interfaces Visuales Blade / Django** | **REJECT / REFERENCE** | Las vistas PHP/Blade o Django HTML están obsoletas. La UI se implementa en React 19 / Server Components con tokens CSS de diseño y accesibilidad de PROCESA Cloud. |
| **Lógica de Devoluciones y Anulaciones** | **ADAPT** | Se rescata la regla de reversión de stock condicionada al estado del comprobante y la emisión obligatoria de Nota de Crédito. |
| **Lógica de Promociones y Descuentos** | **ADAPT** | Se rescata la estructura de promociones `2x1`, porcentaje de descuento por categoría y precios por volumen. |
| **Sistemas de Autenticación Históricos** | **REJECT** | Descartados totalmente. PROCESA Cloud utiliza Supabase Auth con JWTs criptográficos y cookies seguras `httpOnly`. |
| **Archivos de Configuración y Secretos Antiguos** | **REJECT** | Descartados y aislados en solo lectura. Ningún secreto antiguo ingresa a PROCESA Cloud V2. |
