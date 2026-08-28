# PROCESA CLOUD — CATÁLOGO MAESTRO DE SISTEMAS ADQUIRIDOS (28 SISTEMAS)

============================================================
1. RESUMEN EJECUTIVO Y POLÍTICA DE AUDITORÍA
============================================================
- **Ubicación Maestra (Solo Lectura):** `C:\Users\jhost\Downloads\PROCESA 2026\SISTEMAS CREADOS`
- **Total de Sistemas Auditados:** **28 sistemas completos** (17 SaaS Web + 11 Negocios Empresariales).
- **Seguridad:** Ningún secreto, credencial, API key, password o hash contenido en los sistemas fuente ha sido reproducido.
- **Criterio de Evaluación:** No se descartan tecnologías por su lenguaje o framework base (PHP/Laravel, Python/Django, .NET/C#, Node.js, React, Blade, Vue). La evaluación de reutilización se efectúa componente por componente bajo 5 categorías: `REUSE DIRECT`, `ADAPT`, `REFERENCE`, `REWRITE`, `REJECT`.

---

============================================================
2. INVENTARIO EXHAUSTIVO DE LOS 28 SISTEMAS ADQUIRIDOS
============================================================

| # | Sistema Original | Ruta Relativa | Categoría | Stack Frontend / Backend / DB | Módulos & Submódulos Clave | Producto Destino PROCESA | Potencial Reutilización | Prioridad | Estado Auditoría |
|---|---|---|---|---|---|---|:---:|:---:|:---:|
| 01 | **SaaS Minimarket** | `SaaS -APLICACIONES WEBS/SaaS Minimarket` | SaaS | Blade / Laravel / MySQL | POS, Caja, Ventas, Inventario, Compras, Devoluciones, Promociones, CPE, Arqueo Z | **PROCESA POS** | **ADAPT / REWRITE** | **P1** | **COMPLETA** |
| 02 | **SaaS Ventas e Inventarios** | `SaaS -APLICACIONES WEBS/SaaS Ventas e Inventarios` | SaaS | Blade / Laravel / MySQL | Multialmacén, Kardex Valorizado, Proveedores, Facturación, Traslados | **PROCESA INVENTORY / POS** | **ADAPT** | **P1** | **COMPLETA** |
| 03 | **SaaS Ferretería** | `SaaS -APLICACIONES WEBS/SaaS Ferretería` | SaaS | Blade / Laravel / MySQL | Cotizaciones, Fraccionamiento (Kilos, Metros), Precios Mayoristas, Marcas | **PROCESA POS (Ferretero)** | **ADAPT / REFERENCE** | P2 | **COMPLETA** |
| 04 | **SaaS Tienda Moda** | `SaaS -APLICACIONES WEBS/SaaS Tienda Moda` | SaaS | Blade / Laravel / MySQL | Variantes (Talla, Color), Generador Código Barras, Precios Temporada | **PROCESA POS (Retail)** | **ADAPT** | P2 | **COMPLETA** |
| 05 | **SaaS Botica** | `SaaS -APLICACIONES WEBS/SaaS Botica` | SaaS | Blade / Laravel / MySQL | Lotes, Fechas de Vencimiento, Principios Activos, Alertas Vencidos | **PROCESA PHARMA** | **ADAPT / REFERENCE** | P3 | **COMPLETA** |
| 06 | **SaaS Restaurante** | `SaaS -APLICACIONES WEBS/SaaS Restaurante` | SaaS | Vue / Laravel / MySQL | Mapa de Mesas, Comandas, Pantalla Cocina (KDS), Delivery, Carta QR, Mozo | **PROCESA REST** | **ADAPT** | P2 | **COMPLETA** |
| 07 | **SaaS Gimnasio** | `SaaS -APLICACIONES WEBS/SaaS Gimnasio` | SaaS | Blade / Laravel / MySQL | Socios, Membresías, Clases, Control de Acceso, Pagos Recurrentes, Medidas | **PROCESA GYM** | **ADAPT** | P3 | **COMPLETA** |
| 08 | **SaaS Veterinaria** | `SaaS -APLICACIONES WEBS/SaaS Veterinaria` | SaaS | Blade / Laravel / MySQL | Pacientes (Mascotas), Propietarios, Historial Clínico, Citas, Vacunas, Grooming | **PROCESA VET** | **ADAPT** | P3 | **COMPLETA** |
| 09 | **SaaS Clínica** | `SaaS -APLICACIONES WEBS/SaaS Clínica` | SaaS | Blade / Laravel / MySQL | Triaje, Historias Clínicas, Médicos, Especialidades, Consultas, Recetas | **PROCESA CLINIC** | **REFERENCE / ADAPT** | P4 | **COMPLETA** |
| 10 | **SaaS Citas Médicas** | `SaaS -APLICACIONES WEBS/SaaS Citas Médicas` | SaaS | Blade / Laravel / MySQL | Calendarios, Agendas Médicas, Turnos, Recordatorios, Pagos Online | **PROCESA CLINIC** | **REFERENCE / ADAPT** | P4 | **COMPLETA** |
| 11 | **SaaS Odontología** | `SaaS -APLICACIONES WEBS/SaaS Odontología` | SaaS | Blade / Laravel / MySQL | Odontograma Digital, Presupuestos Dentales, Tratamientos, Pagos por Sesión | **PROCESA CLINIC** | **REFERENCE / ADAPT** | P4 | **COMPLETA** |
| 12 | **SaaS Hospedaje** | `SaaS -APLICACIONES WEBS/SaaS Hospedaje` | SaaS | Blade / Laravel / MySQL | Habitaciones, Check-In, Check-Out, Tarifas Alta/Baja, Consumos Frigobar | **PROCESA HOTEL** | **REFERENCE / ADAPT** | P4 | **COMPLETA** |
| 13 | **SaaS Academia** | `SaaS -APLICACIONES WEBS/SaaS Academia` | SaaS | Blade / Laravel / MySQL | Alumnos, Matrículas, Cursos, Docentes, Pensiones, Pagos de Cuotas | **PROCESA SCHOOL** | **REFERENCE / ADAPT** | P4 | **COMPLETA** |
| 14 | **SaaS Colegio** | `SaaS -APLICACIONES WEBS/SaaS Colegio` | SaaS | Blade / Laravel / MySQL | Niveles, Grados, Secciones, Asistencia Escolar, Libreta de Notas, Matrículas | **PROCESA SCHOOL** | **REFERENCE / ADAPT** | P4 | **COMPLETA** |
| 15 | **SaaS Taller Automotriz** | `SaaS -APLICACIONES WEBS/SaaS Taller Automotriz` | SaaS | Blade / Laravel / MySQL | Órdenes de Trabajo, Recepción Vehicular, Placas, Mecánicos, Repuestos | **PROCESA WORKSHOP** | **REFERENCE / ADAPT** | P4 | **COMPLETA** |
| 16 | **SaaS Taller Textil** | `SaaS -APLICACIONES WEBS/SaaS Taller Textil` | SaaS | Blade / Laravel / MySQL | Fichas Técnicas de Confección, Control de Rollos/Telas, Merma, Producción | **PROCESA WORKSHOP** | **REFERENCE / ADAPT** | P4 | **COMPLETA** |
| 17 | **Saas Préstamos y Cobranza** | `SaaS -APLICACIONES WEBS/Saas Préstamos y Cobranza` | SaaS | Blade / Laravel / MySQL | Préstamos, Cronograma Cuotas, Intereses (Francés/Simple), Cobradores, Mora | **PROCESA COBROS** | **ADAPT** | P3 | **COMPLETA** |
| 18 | **Gestión de Almacenes** | `NEGOCIOS - APLICACIONES/GESTIÓN DE ALMACENES` | Negocios | Django HTML / Python / SQLite-PG | Racks, Pasillos, Ubicaciones Físicas, Guías de Remisión, Movimientos Lote | **PROCESA INVENTORY** | **ADAPT** | P2 | **COMPLETA** |
| 19 | **Gestor Documental Abogados** | `NEGOCIOS - APLICACIONES/GESTOR DOCUMENTAL ABOGADOS` | Negocios | Django HTML / Python / SQLite-PG | Expedientes Judiciales, Partes, Escritos, Vencimiento de Plazos, Bóveda | **PROCESA DOCS** | **REFERENCE** | P4 | **COMPLETA** |
| 20 | **Gestor Documental Contable** | `NEGOCIOS - APLICACIONES/GESTOR DOCUMENTAL CONTABLE` | Negocios | Django HTML / Python / SQLite-PG | Bóveda Tributaria, Cronograma SUNAT, DDJJ, Comprobantes de Compras/Ventas | **PROCESA DOCS** | **ADAPT / REFERENCE** | P3 | **COMPLETA** |
| 21 | **Gestor Documental Municipal** | `NEGOCIOS - APLICACIONES/GESTOR DOCUMENTAL MUNICIPAL` | Negocios | Django HTML / Python / SQLite-PG | Trámite Documentario, Foliado, Derivación de Áreas, Seguimiento de Expedientes | **PROCESA DOCS** | **REFERENCE** | P4 | **COMPLETA** |
| 22 | **Sistema de Consultorio Médico** | `NEGOCIOS - APLICACIONES/SISTEMA DE CONSULTORIO MÉDICO` | Negocios | Django HTML / Python / SQLite-PG | Ficha Clínica, Consulta Rápida, Recetario, Diagnósticos CIE-10 | **PROCESA CLINIC** | **REFERENCE** | P4 | **COMPLETA** |
| 23 | **Sistema de Contabilidad** | `NEGOCIOS - APLICACIONES/SISTEMA DE CONTABILIDAD` | Negocios | Django HTML / Python / SQLite-PG | Plan Contable General Empresarial (PCGE), Asientos Diarios, Mayor, Balance | **PROCESA CONTA** | **ADAPT** | P2 | **COMPLETA** |
| 24 | **Control de Asistencia Digital** | `NEGOCIOS - APLICACIONES/SISTEMA DE CONTROL DE ASISTENCIA DIGITAL` | Negocios | React / Node.js Express / MongoDB-PG | Marcaciones de Asistencia, Horarios, Turnos, Tardanzas, Justificaciones | **PROCESA RRHH** | **REUSE DIRECT / ADAPT**| P3 | **COMPLETA** |
| 25 | **Sistema de Encomiendas** | `NEGOCIOS - APLICACIONES/SISTEMA DE ENCOMIENDAS` | Negocios | Django HTML / Python / SQLite-PG | Guías de Encomienda, Rutas, Manifiestos de Carga, Tracking de Paquetes | **PROCESA LOGISTICS** | **REFERENCE** | P4 | **COMPLETA** |
| 26 | **Sistema de Planilla** | `NEGOCIOS - APLICACIONES/SISTEMA DE PLANILLA` | Negocios | Razor / .NET 8 C# / SQL Server | AFP (Integra, Prima, Profuturo, Hábitat), ONP, Gratificaciones, CTS, PLAME | **PROCESA RRHH** | **ADAPT / REWRITE** | P3 | **COMPLETA** |
| 27 | **Sistema de Servicio Técnico** | `NEGOCIOS - APLICACIONES/SISTEMA DE SERVICIO TÉCNICO` | Negocios | Django HTML / Python / SQLite-PG | Registro de Equipos, Diagnóstico Técnico, Presupuesto, Reparación, Garantía | **PROCESA SERVICE** | **REFERENCE** | P4 | **COMPLETA** |
| 28 | **SSOMA Seguridad Ambiental** | `NEGOCIOS - APLICACIONES/SSOMA  SEGURIDAD AMBIENTAL` | Negocios | Normativa / Formatos Técnicos | Matriz IPERC, Protocolos EPP, Inspecciones de Seguridad, Auditoría Ambiental | **PROCESA SSOMA** | **REFERENCE (Contenido)** | P4 | **COMPLETA** |
