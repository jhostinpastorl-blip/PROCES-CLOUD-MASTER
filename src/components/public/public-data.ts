export const modules = [
  { id: "pos", code: "POS", name: "Punto de venta", icon: "cart", color: "blue", summary: "Vende, cobra y controla caja e inventario desde una sola operación.", features: ["Ventas y comprobantes", "Caja y turnos", "Stock por sede", "Reportes en tiempo real"] },
  { id: "rest", code: "REST", name: "Restaurantes", icon: "cloud", color: "cyan", summary: "Coordina salón, cocina, pedidos y caja sin perder el ritmo del servicio.", features: ["Mesas y comandas", "Pantalla de cocina", "Carta y modificadores", "Cierre de turno"] },
  { id: "conta", code: "CONTA", name: "Contabilidad", icon: "chart", color: "violet", summary: "Convierte la operación diaria en información financiera clara y accionable.", features: ["Cuentas por cobrar y pagar", "Flujo de caja", "Conciliación", "Analítica financiera"] },
  { id: "rrhh", code: "RRHH", name: "Talento humano", icon: "users", color: "amber", summary: "Centraliza personas, asistencia, incidencias y documentos laborales.", features: ["Legajos", "Asistencia", "Vacaciones", "Documentos del equipo"] },
  { id: "docs", code: "DOCS", name: "Documentos", icon: "file", color: "indigo", summary: "Organiza archivos empresariales con permisos, trazabilidad y contexto.", features: ["Repositorio seguro", "Versiones", "Permisos por rol", "Búsqueda contextual"] },
  { id: "gymvet", code: "GYM / VET", name: "Operaciones especializadas", icon: "spark", color: "pink", summary: "Experiencias especializadas para gimnasios y veterinarias, sobre el mismo núcleo.", features: ["Membresías y planes", "Agenda y fichas", "Recordatorios", "Cobros recurrentes"] },
] as const;

export const navItems = [
  { href: "/producto", label: "Producto" },
  { href: "/soluciones", label: "Módulos", mega: true },
  { href: "/como-funciona", label: "Cómo funciona" },
  { href: "/precios", label: "Precios" },
  { href: "/seguridad", label: "Seguridad" },
  { href: "/recursos", label: "Recursos" },
] as const;
