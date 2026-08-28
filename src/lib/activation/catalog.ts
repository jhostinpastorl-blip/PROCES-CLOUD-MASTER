export const BUSINESS_TYPES = [
  { code: "bodega", label: "Bodega", description: "Venta rápida, caja y reposición diaria." },
  { code: "ferreteria", label: "Ferretería", description: "Productos, inventario, compras y proveedores." },
  { code: "minimarket", label: "Minimarket / Tienda", description: "Ventas ágiles y control de stock." },
  { code: "panaderia", label: "Panadería", description: "Venta de productos terminados y control comercial básico." },
  { code: "restaurante", label: "Restaurante / Cafetería", description: "Mesas, pedidos, cocina y atención." },
  { code: "gimnasio", label: "Gimnasio", description: "Membresías, acceso y programación." },
  { code: "veterinaria", label: "Veterinaria", description: "Pacientes, citas, servicios y productos." },
  { code: "servicios", label: "Servicios", description: "Operación, clientes, documentos y cobranza." },
  { code: "otro", label: "Otro", description: "Cuéntanos qué necesitas resolver." },
] as const;

export const BUSINESS_NEEDS = [
  { code: "sales", label: "Vender" },
  { code: "inventory", label: "Controlar inventario" },
  { code: "cash", label: "Gestionar caja" },
  { code: "purchases", label: "Realizar compras" },
  { code: "employees", label: "Gestionar empleados" },
  { code: "accounting", label: "Contabilidad" },
  { code: "documents", label: "Documentos" },
  { code: "collections", label: "Cobranza" },
] as const;

export type BusinessTypeCode = (typeof BUSINESS_TYPES)[number]["code"];
export type BusinessNeedCode = (typeof BUSINESS_NEEDS)[number]["code"];
export type SolutionCode = "pos" | "rest" | "conta" | "gym" | "vet";
export type SolutionLifecycle = "PILOT" | "AVAILABLE" | "ROADMAP";

export type SolutionDefinition = {
  code: SolutionCode;
  name: string;
  lifecycle: SolutionLifecycle;
  activatable: boolean;
  packageCode?: string;
  packageName?: string;
  capabilities: readonly string[];
  summary: string;
};

export const SOLUTIONS: Record<SolutionCode, SolutionDefinition> = {
  pos: {
    code: "pos",
    name: "PROCESA POS",
    lifecycle: "PILOT",
    activatable: true,
    packageCode: "pos-starter",
    packageName: "POS Starter",
    capabilities: ["Ventas", "Caja", "Productos", "Inventario", "Compras", "Proveedores", "Reportes"],
    summary: "Una operación comercial conectada para vender y controlar tu negocio.",
  },
  rest: { code: "rest", name: "PROCESA REST", lifecycle: "ROADMAP", activatable: false, capabilities: [], summary: "Operación gastronómica en desarrollo." },
  conta: { code: "conta", name: "PROCESA CONTA", lifecycle: "ROADMAP", activatable: false, capabilities: [], summary: "Contabilidad integrada en desarrollo." },
  gym: { code: "gym", name: "PROCESA GYM", lifecycle: "ROADMAP", activatable: false, capabilities: [], summary: "Gestión de centros deportivos en desarrollo." },
  vet: { code: "vet", name: "PROCESA VET", lifecycle: "ROADMAP", activatable: false, capabilities: [], summary: "Gestión veterinaria en desarrollo." },
};

export const ACTIVATION_WORKFLOW_VERSION = 2;
export const RECOMMENDATION_RULESET_VERSION = 1;
