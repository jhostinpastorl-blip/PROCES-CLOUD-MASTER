# PROCESA CLOUD — MATRIZ DE REUTILIZACIÓN COMPONENTE POR COMPONENTE

============================================================
1. CRITERIOS TÉCNICOS Y NIVELES DE DECISIÓN
============================================================
- **`REUSE DIRECT`:** Algoritmos, contratos de datos TypeScript/JSON, componentes UI modernos o fórmulas matemáticas que pueden incorporarse directamente al stack de PROCESA Cloud V2 con cambios mínimos.
- **`ADAPT`:** Lógica de negocio de alto valor, flujos transaccionales y estructuras de datos que deben integrarse dentro del modelo multi-tenant (`company_id`, `branch_id`, RLS, Server Actions).
- **`REFERENCE`:** Pantallas, terminología, catálogos normativos y flujos que sirven como especificación funcional sin migración de código directo.
- **`REWRITE`:** Reglas de negocio críticas cuya implementación histórica presenta acoplamiento a frameworks monolíticos obsoletos, reescribiéndose limpiamente en TypeScript / Next.js 15.
- **`REJECT`:** Prácticas inseguras, secretos embebidos, dependencias vulnerables, consultas SQL concatenadas o controladores con acceso cruzado.

---

============================================================
2. EVALUACIÓN GRANULAR POR MÓDULO Y COMPONENTE
============================================================

| Dominio / Componente Fuente | Sistema de Origen | Decisión | Destino en PROCESA Cloud V2 | Justificación Técnica & Criterio de Seguridad |
|---|---|:---:|---|---|
| **Cálculo de Impuestos y Totales POS** | `SaaS Minimarket` / `Ventas e Inv.` | **REWRITE / ADAPT** | `src/lib/pos/pricing.ts` | Lógica de base imponible, IGV (18%), exoneración, inafectación e ICBPER. Se reescribe en funciones puras TypeScript con precisión decimal fija (`cents` / `bignumber`). |
| **Flujo de Apertura, Arqueo y Cierre de Caja** | `SaaS Minimarket` | **ADAPT** | `src/app/app/pos/cash/` | Flujo comercial excelente (Apertura con saldo inicial, registro de gastos/ingresos, arqueo ciego, cálculo de sobrantes/faltantes). Se adapta a Server Actions multi-tenant con `branch_id`. |
| **Kardex Valorizado (Costo Promedio)** | `SaaS Ventas e Inventarios` | **ADAPT** | `src/lib/inventory/kardex.ts` | Algoritmo de Costo Promedio Ponderado para compras sucesivas y salidas valorizadas. Se traslada a transacciones atómicas PostgreSQL. |
| **Matriz de Tallas, Colores y Variantes** | `SaaS Tienda Moda` | **ADAPT** | `src/lib/pos/variants.ts` | Modelo de entidad `ProductVariant` con generación de códigos de barra automáticos por combinación. Se adapta como extensión modular activable. |
| **Fraccionamiento y Conversión de Medidas** | `SaaS Ferretería` | **ADAPT** | `src/lib/inventory/units.ts` | Soporte de unidades fraccionadas (metros, kilos, paquetes) y listas de precios por volumen/mayorista. Se adapta a catálogo de unidades SUNAT. |
| **Gestor de Comandas y Pantalla de Cocina (KDS)** | `SaaS Restaurante` | **ADAPT** | `PROCESA REST` (Fase 2) | Flujo de pedidos por mesa, asignación de mozo, división de cuentas y estados de cocina. Excelente UX de hostelería para la Fase 2. |
| **Control de Membresías y Asistencias** | `SaaS Gimnasio` | **ADAPT** | `PROCESA GYM` (Fase 3) | Lógica de cálculo de vencimiento de membresías, congelamiento de días y cupón de descuento. |
| **Ficha Clínica y Vacunas Veterinarias** | `SaaS Veterinaria` | **ADAPT** | `PROCESA VET` (Fase 3) | Estructura de historia clínica por mascota y calendario de revacunación. |
| **Cálculo de Planilla y Retenciones Laborales** | `SISTEMA DE PLANILLA` | **ADAPT / REWRITE** | `PROCESA RRHH` (Fase 3) | Fórmulas peruanas de AFP, ONP, Essalud, Gratificaciones, CTS y Renta de 5ta Categoría. Se rescata el algoritmo matemático legal. |
| **Componentes de Marcación y Asistencia** | `CONTROL DE ASISTENCIA DIGITAL` | **REUSE DIRECT / ADAPT** | `PROCESA RRHH` (Fase 3) | Componentes React de registro biométrico/web y visualización de horarios. Portables directamente a Next.js App Router. |
| **Plan Contable General Empresarial (PCGE)** | `SISTEMA DE CONTABILIDAD` | **REUSE DIRECT (Datos)** | `src/lib/accounting/pcge.ts` | Catálogo maestro de cuentas contables peruanas a 2, 3, 4 y 5 dígitos con su dinámica contable. |
| **Matriz IPERC y Formatos de Seguridad** | `SSOMA SEGURIDAD AMBIENTAL` | **REFERENCE (Contenido)** | `PROCESA SSOMA` (Fase 4) | Banco de datos normativo para evaluación de riesgos de trabajo y salud ocupacional. |
| **Motor de Facturación SUNAT UBL 2.1** | `PROCESA Cloud V1` | **REUSE DIRECT** | `src/lib/cpe/` | El motor nativo de firma XMLDSig y UBL 2.1 ya existente en PROCESA Cloud supera técnicamente a los conectores históricos de los zips. Se mantiene como fuente principal. |
| **Sistemas de Autenticación de los ZIPs** | Todos los sistemas | **REJECT** | N/A | Descartados totalmente. PROCESA Cloud utiliza exclusivamente Supabase Auth con JWTs y cookies seguras. |
| **Credenciales y Archivos `.env` Antiguos** | Todos los sistemas | **REJECT** | N/A | Aislados y descartados por seguridad. Cero tolerancia a secretos históricos. |
