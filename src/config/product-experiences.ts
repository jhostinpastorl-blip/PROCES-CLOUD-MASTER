export type ProductStatus = "available" | "in_development" | "roadmap" | "planned";

export interface ProductVisualData {
  title: string;
  subtitle: string;
  badgeText: string;
  metricMain: { label: string; value: string; delta?: string };
  metricSecondary: { label: string; value: string };
  metricTertiary: { label: string; value: string };
  streamItems: Array<{ tag: string; text: string; time: string }>;
}

export interface ProductExperience {
  id: "pos" | "rest" | "conta" | "gym" | "vet" | "rrhh" | "docs";
  name: string;
  shortName: string;
  sector: string;
  headline: string;
  headlineEmphasis: string;
  description: string;
  accentColor: string;
  accentGlow: string;
  accentBadge: string;
  status: ProductStatus;
  statusLabel: string;
  statusTone: "success" | "info" | "warning" | "neutral";
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  features: string[];
  visual: ProductVisualData;
}

export interface CatalogCategory {
  title: string;
  description: string;
  products: Array<{
    code: string;
    name: string;
    description: string;
    targetIndustries: string;
    statusLabel: string;
    statusTone: "success" | "info" | "warning" | "neutral";
  }>;
}

/**
 * 7 Strategic Products displayed in the Landing V2 Hero Carousel
 * PROCESA POS is the first slide and commercial priority.
 */
export const HERO_PRODUCT_EXPERIENCES: ProductExperience[] = [
  {
    id: "pos",
    name: "PROCESA POS",
    shortName: "POS",
    sector: "Minimarkets · Bodegas · Tiendas · Retail",
    headline: "Tu negocio.",
    headlineEmphasis: "Vendiendo sin detenerse.",
    description: "Ventas, caja, productos, inventario y facturación conectados en una sola plataforma.",
    accentColor: "#0ea5e9",
    accentGlow: "rgba(14, 165, 233, 0.2)",
    accentBadge: "rgba(14, 165, 233, 0.15)",
    status: "in_development",
    statusLabel: "Fase 1 · En Desarrollo Prioritario",
    statusTone: "info",
    primaryCta: { label: "Conocer PROCESA POS", href: "#modulos" },
    secondaryCta: { label: "Empezar gratis", href: "/registro" },
    features: ["Ventas", "Caja", "Inventario", "Facturación electrónica"],
    visual: {
      title: "PROCESA POS · Terminal de Mostrador",
      subtitle: "Minimarket Los Cedros · Sede Principal",
      badgeText: "Simulación POS en tiempo real",
      metricMain: { label: "Ventas acumuladas hoy", value: "S/ 3,428.50", delta: "+14.8% vs ayer" },
      metricSecondary: { label: "Caja en turno", value: "S/ 850.00 inicial · Turno Mañana" },
      metricTertiary: { label: "Stock crítico", value: "2 ítems por reponer" },
      streamItems: [
        { tag: "VENTA", text: "Boleta B001-00249 emitida · S/ 48.50 (Yape + Efectivo)", time: "hace 4s" },
        { tag: "STOCK", text: "Arroz Extra 5kg: stock actualizado a 24 unid.", time: "hace 18s" },
        { tag: "CAJA", text: "Arqueo de turno validado por Supervisor", time: "hace 42s" },
      ],
    },
  },
  {
    id: "rest",
    name: "PROCESA REST",
    shortName: "REST",
    sector: "Restaurantes · Cafeterías · Fast Food",
    headline: "Tu restaurante.",
    headlineEmphasis: "Todo bajo control.",
    description: "Mesas, pedidos, cocina, caja, delivery e inventario trabajando como uno solo.",
    accentColor: "#f97316",
    accentGlow: "rgba(249, 115, 22, 0.2)",
    accentBadge: "rgba(249, 115, 22, 0.15)",
    status: "roadmap",
    statusLabel: "Fase 2 · Roadmap Gastronómico",
    statusTone: "neutral",
    primaryCta: { label: "Conocer PROCESA REST", href: "#modulos" },
    secondaryCta: { label: "Solicitar demo", href: "/demo" },
    features: ["Mesas", "Pedidos", "Cocina", "Delivery"],
    visual: {
      title: "PROCESA REST · Comandas & Cocina KDS",
      subtitle: "Restaurante Andino · Salón Central",
      badgeText: "Simulación gastronómica",
      metricMain: { label: "Mesas en atención", value: "8 / 12 ocupadas", delta: "67% ocupación" },
      metricSecondary: { label: "En cocina", value: "4 comandas en preparación" },
      metricTertiary: { label: "Delivery activo", value: "3 pedidos en ruta" },
      streamItems: [
        { tag: "COMANDA", text: "Mesa 04: 2 Lomo Saltado, 1 Maracuyá enviada a cocina", time: "hace 2s" },
        { tag: "KDS", text: "Mesa 02: Platos terminados, lista para entrega", time: "hace 15s" },
        { tag: "COBRO", text: "Mesa 06: Cuenta cerrada con Factura F001-0089", time: "hace 1m" },
      ],
    },
  },
  {
    id: "conta",
    name: "PROCESA CONTA",
    shortName: "CONTA",
    sector: "Contabilidad · Finanzas · Gestión empresarial",
    headline: "Tu contabilidad.",
    headlineEmphasis: "Siempre al día.",
    description: "Operaciones, asientos, libros y control financiero conectados con tu empresa.",
    accentColor: "#10b981",
    accentGlow: "rgba(16, 185, 129, 0.2)",
    accentBadge: "rgba(16, 185, 129, 0.15)",
    status: "roadmap",
    statusLabel: "Fase 3 · Roadmap Financiero",
    statusTone: "neutral",
    primaryCta: { label: "Conocer PROCESA CONTA", href: "#modulos" },
    secondaryCta: { label: "Solicitar demo", href: "/demo" },
    features: ["Contabilidad", "Libros", "Finanzas", "Integraciones"],
    visual: {
      title: "PROCESA CONTA · Asientos & Libros SUNAT",
      subtitle: "Corporación Grupo Norte SAC · Balance General",
      badgeText: "Simulación contable",
      metricMain: { label: "Ingresos del periodo", value: "S/ 48,250.00", delta: "+8.3% margen neto" },
      metricSecondary: { label: "Asientos automáticos", value: "100% integrados con POS" },
      metricTertiary: { label: "Libro de Ventas", value: "SIRE SUNAT precalculado" },
      streamItems: [
        { tag: "ASIENTO", text: "Venta del día #B001 contabilizada automáticamente", time: "hace 8s" },
        { tag: "TRIBUTO", text: "Provisión IGV del mes calculada en S/ 4,320.00", time: "hace 35s" },
        { tag: "BALANCE", text: "Estado de Resultados preliminar actualizado", time: "hace 2m" },
      ],
    },
  },
  {
    id: "gym",
    name: "PROCESA GYM",
    shortName: "GYM",
    sector: "Gimnasios · Boxes · Centros deportivos",
    headline: "Tu gimnasio.",
    headlineEmphasis: "Siempre en movimiento.",
    description: "Socios, membresías, pagos y asistencias gestionados desde una sola plataforma.",
    accentColor: "#e11d48",
    accentGlow: "rgba(225, 29, 72, 0.2)",
    accentBadge: "rgba(225, 29, 72, 0.15)",
    status: "planned",
    statusLabel: "Fase 3 · Especialidad Deportiva",
    statusTone: "neutral",
    primaryCta: { label: "Conocer PROCESA GYM", href: "#modulos" },
    secondaryCta: { label: "Solicitar demo", href: "/demo" },
    features: ["Socios", "Membresías", "Asistencia", "Pagos"],
    visual: {
      title: "PROCESA GYM · Socios & Asistencia Torniquete",
      subtitle: "IronFit Club · Sede Miraflores",
      badgeText: "Simulación fitness",
      metricMain: { label: "Socios activos", value: "312 miembros", delta: "+22 nuevas altas" },
      metricSecondary: { label: "Afluencia actual", value: "48 atletas entrenando" },
      metricTertiary: { label: "Renovaciones", value: "14 cuotas por vencer esta semana" },
      streamItems: [
        { tag: "ACCESO", text: "Socio #1084 (Plan Trimestral) ingresó por torniquete", time: "hace 5s" },
        { tag: "PAGO", text: "Renovación Plan Anual confirmada S/ 890.00", time: "hace 20s" },
        { tag: "ALERTA", text: "Notificación de cuota enviada a 6 socios", time: "hace 1m" },
      ],
    },
  },
  {
    id: "vet",
    name: "PROCESA VET",
    shortName: "VET",
    sector: "Veterinarias · Clínicas veterinarias · Pet shops",
    headline: "Tu veterinaria.",
    headlineEmphasis: "Más cerca de cada mascota.",
    description: "Pacientes, propietarios, citas, vacunas e historial clínico en un solo lugar.",
    accentColor: "#8b5cf6",
    accentGlow: "rgba(139, 92, 246, 0.2)",
    accentBadge: "rgba(139, 92, 246, 0.15)",
    status: "planned",
    statusLabel: "Fase 3 · Especialidad Veterinaria",
    statusTone: "neutral",
    primaryCta: { label: "Conocer PROCESA VET", href: "#modulos" },
    secondaryCta: { label: "Solicitar demo", href: "/demo" },
    features: ["Pacientes", "Citas", "Vacunas", "Historial"],
    visual: {
      title: "PROCESA VET · Ficha Clínica & Citas",
      subtitle: "Clínica Veterinaria San Francisco",
      badgeText: "Simulación veterinaria",
      metricMain: { label: "Pacientes atendidos hoy", value: "18 consultas", delta: "4 cirugías menores" },
      metricSecondary: { label: "Próxima cita", value: "15:30 · 'Max' (Golden Retriever)" },
      metricTertiary: { label: "Vacunación", value: "8 recordatorios enviados" },
      streamItems: [
        { tag: "HISTORIAL", text: "Ficha 'Luna' (Gato Persa): Vacuna Antirrábica registrada", time: "hace 12s" },
        { tag: "GROOMING", text: "Servicio de baño y corte finalizado para 'Toby'", time: "hace 45s" },
        { tag: "FARMACIA", text: "Despacho de antibiótico vinculado a venta POS", time: "hace 2m" },
      ],
    },
  },
  {
    id: "rrhh",
    name: "PROCESA RRHH",
    shortName: "RRHH",
    sector: "Personal · Planillas · Asistencia",
    headline: "Tu equipo.",
    headlineEmphasis: "Mejor organizado.",
    description: "Trabajadores, asistencia, horarios y gestión laboral conectados con tu operación.",
    accentColor: "#06b6d4",
    accentGlow: "rgba(6, 182, 212, 0.2)",
    accentBadge: "rgba(6, 182, 212, 0.15)",
    status: "planned",
    statusLabel: "Fase 3 · Gestión de Personal",
    statusTone: "neutral",
    primaryCta: { label: "Conocer PROCESA RRHH", href: "#modulos" },
    secondaryCta: { label: "Solicitar demo", href: "/demo" },
    features: ["Personal", "Asistencia", "Horarios", "Planillas"],
    visual: {
      title: "PROCESA RRHH · Asistencia & Planilla",
      subtitle: "Grupo Comercial Pacífico · Sede Lima",
      badgeText: "Simulación de personal",
      metricMain: { label: "Colaboradores activos", value: "42 personas", delta: "100% marcaciones al día" },
      metricSecondary: { label: "Turno actual", value: "28 en turno · 0 incidencias" },
      metricTertiary: { label: "Planilla mensual", value: "Calculada con AFP y CTS" },
      streamItems: [
        { tag: "ASISTENCIA", text: "Marcación puntual registrada: Sede Almacén", time: "hace 10s" },
        { tag: "HORARIO", text: "Programación semanal de turnos aprobada", time: "hace 1m" },
        { tag: "BOLETA", text: "Boletas de pago digitales emitidas con firma", time: "hace 3m" },
      ],
    },
  },
  {
    id: "docs",
    name: "PROCESA DOCS",
    shortName: "DOCS",
    sector: "Documentos · Expedientes · Vencimientos",
    headline: "Tu información.",
    headlineEmphasis: "Siempre bajo control.",
    description: "Centraliza documentos, expedientes, vencimientos y trazabilidad empresarial.",
    accentColor: "#6366f1",
    accentGlow: "rgba(99, 102, 241, 0.2)",
    accentBadge: "rgba(99, 102, 241, 0.15)",
    status: "planned",
    statusLabel: "Core Add-on · Gestión Documental",
    statusTone: "neutral",
    primaryCta: { label: "Conocer PROCESA DOCS", href: "#modulos" },
    secondaryCta: { label: "Solicitar demo", href: "/demo" },
    features: ["Documentos", "Expedientes", "Vencimientos", "Auditoría"],
    visual: {
      title: "PROCESA DOCS · Bóveda Corporativa & Alertas",
      subtitle: "Inmobiliaria & Constructora del Sur",
      badgeText: "Simulación documental",
      metricMain: { label: "Expedientes en custodia", value: "842 archivos", delta: "Bóveda cifrada" },
      metricSecondary: { label: "Vencimientos este mes", value: "3 licencias por renovar" },
      metricTertiary: { label: "Trazabilidad", value: "Auditoría de aperturas 100%" },
      streamItems: [
        { tag: "EXPEDIENTE", text: "Contrato de Arrendamiento 2026 subido a bóveda", time: "hace 14s" },
        { tag: "ALERTA", text: "Licencia de Funcionamiento: aviso a 30 días", time: "hace 2m" },
        { tag: "AUDITORIA", text: "Acceso a documento verificado con permisos de rol", time: "hace 4m" },
      ],
    },
  },
];

/**
 * Ecosystem Solutions Catalog grouped by business domain
 */
export const ECOSYSTEM_SOLUTIONS_CATALOG: CatalogCategory[] = [
  {
    title: "Ventas y Operaciones",
    description: "Puntos de venta de alta velocidad, control de stock y operaciones de atención al cliente.",
    products: [
      {
        code: "PROCESA POS",
        name: "Punto de Venta & Caja",
        description: "Ventas rápidas, escaneo de código de barras, control de caja, stock y facturación electrónica SUNAT.",
        targetIndustries: "Minimarkets · Bodegas · Tiendas · Ferreterías · Moda",
        statusLabel: "Fase 1 · En Desarrollo Prioritario",
        statusTone: "info",
      },
      {
        code: "PROCESA REST",
        name: "Restaurantes & Gastronomía",
        description: "Mapa interactivo de mesas, comandas automáticas a cocina, control de mozos, pedidos y delivery.",
        targetIndustries: "Restaurantes · Cafeterías · Bares · Fast Food",
        statusLabel: "Fase 2 · Roadmap",
        statusTone: "neutral",
      },
      {
        code: "PROCESA INVENTORY",
        name: "Almacenes & Multisede",
        description: "Kardex valorizado en tiempo real, costeo promedio, transferencias entre sucursales y stock mínimo.",
        targetIndustries: "Distribuidores · Cadenas · Almacenes Centrales",
        statusLabel: "Fase 2 · Roadmap",
        statusTone: "neutral",
      },
    ],
  },
  {
    title: "Finanzas y Personas",
    description: "Control contable riguroso, libros tributarios, cobros y administración laboral.",
    products: [
      {
        code: "PROCESA CONTA",
        name: "Contabilidad General & Libros",
        description: "Plan contable empresarial, asientos automáticos desde ventas y compras, SIRE SUNAT y balances.",
        targetIndustries: "Empresas Comerciales · Estudios Contables",
        statusLabel: "Fase 3 · Roadmap",
        statusTone: "neutral",
      },
      {
        code: "PROCESA COBROS",
        name: "Cuentas por Cobrar & Créditos",
        description: "Gestión de créditos comerciales, cronograma de cuotas, cobranza y límites por cliente.",
        targetIndustries: "Ventas Mayoristas · Negocios a Crédito",
        statusLabel: "Fase 3 · Planificado",
        statusTone: "neutral",
      },
      {
        code: "PROCESA RRHH",
        name: "Gestión de Personal & Planillas",
        description: "Control de asistencia digital, cálculo de planillas de sueldos, AFP, CTS y contratos de trabajo.",
        targetIndustries: "Todo tipo de empresas con equipo laboral",
        statusLabel: "Fase 3 · Planificado",
        statusTone: "neutral",
      },
    ],
  },
  {
    title: "Gestión y Automatización",
    description: "Bóvedas documentales, flujos de trabajo inteligentes y seguridad ocupacional.",
    products: [
      {
        code: "PROCESA DOCS",
        name: "Bóveda & Gestión Documental",
        description: "Expedientes centralizados, control de vencimiento de licencias/contratos y almacenamiento seguro.",
        targetIndustries: "Empresas Corporativas · Áreas Legales",
        statusLabel: "Core Add-on · Planificado",
        statusTone: "neutral",
      },
      {
        code: "PROCESA FLOW",
        name: "Automatización de Procesos",
        description: "Flujos de aprobación, disparadores automáticos entre módulos y reglas de negocio sin código.",
        targetIndustries: "Organizaciones con procesos de aprobación",
        statusLabel: "Fase 4 · Roadmap",
        statusTone: "neutral",
      },
      {
        code: "PROCESA SSOMA",
        name: "Seguridad & Salud en el Trabajo",
        description: "Matriz IPERC, protocolos EPP, inspecciones y cumplimiento normativo laboral.",
        targetIndustries: "Industrias · Obras · Comercio e Instalaciones",
        statusLabel: "Fase 4 · Planificado",
        statusTone: "neutral",
      },
    ],
  },
  {
    title: "Verticales de Industria",
    description: "Soluciones especializadas adaptadas al lenguaje y flujo propio de cada sector.",
    products: [
      {
        code: "PROCESA GYM",
        name: "Centros Deportivos & Fitness",
        description: "Control de membresías, acceso por torniquetes, programación de clases y fidelización de socios.",
        targetIndustries: "Gimnasios · Boxes de Crossfit · Academias",
        statusLabel: "Fase 3 · Planificado",
        statusTone: "neutral",
      },
      {
        code: "PROCESA VET",
        name: "Veterinarias & Pet Shops",
        description: "Historias clínicas de mascotas, planes de vacunación, citas médicas y servicios de grooming.",
        targetIndustries: "Clínicas Veterinarias · Consultorios · Pet Shops",
        statusLabel: "Fase 3 · Planificado",
        statusTone: "neutral",
      },
      {
        code: "PROCESA CLINIC",
        name: "Consultorios & Centros de Salud",
        description: "Historias clínicas ambulatorias, citas médicas, triaje y emisión de recetas conectadas.",
        targetIndustries: "Consultorios Médicos · Centros Odontológicos",
        statusLabel: "Fase 4 · Planificado",
        statusTone: "neutral",
      },
      {
        code: "PROCESA HOTEL",
        name: "Hospedajes & Alojamientos",
        description: "Mapa de habitaciones, check-in/out, consumos adicionales y facturación por estancia.",
        targetIndustries: "Hoteles · Hostales · Alojamientos Boutique",
        statusLabel: "Fase 4 · Planificado",
        statusTone: "neutral",
      },
      {
        code: "PROCESA PHARMA",
        name: "Boticas & Farmacias",
        description: "Control de lotes, fechas de vencimiento, principios activos y dispensación con código de barras.",
        targetIndustries: "Farmacias Independientes · Boticas",
        statusLabel: "Fase 3 · Planificado",
        statusTone: "neutral",
      },
      {
        code: "PROCESA WORKSHOP",
        name: "Talleres & Servicio Técnico",
        description: "Órdenes de trabajo, seguimiento de reparaciones, repuestos y control de garantías.",
        targetIndustries: "Talleres Mecánicos · Servicio Técnico de Equipos",
        statusLabel: "Fase 4 · Planificado",
        statusTone: "neutral",
      },
    ],
  },
];
