"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const primaryItems = [
  { href: "/app/pos", label: "Inicio" },
  { href: "/app/pos/terminal", label: "Terminal" },
  { href: "/app/pos/sales", label: "Ventas" },
  { href: "/app/pos/inventory", label: "Inventario" },
  { href: "/app/pos/products", label: "Productos" },
  { href: "/app/pos/purchases", label: "Compras" },
  { href: "/app/pos/reports", label: "Reportes" },
];

const managementItems = [
  { href: "/app/pos/cash-sessions", label: "Turnos de caja" },
  { href: "/app/pos/categories", label: "Categorías" },
  { href: "/app/pos/customers", label: "Clientes" },
  { href: "/app/pos/suppliers", label: "Proveedores" },
  { href: "/app/pos/warehouses", label: "Almacenes" },
  { href: "/app/pos/cash-registers", label: "Cajas" },
  { href: "/app/pos/settings/electronic-invoicing", label: "Facturación Electrónica" },
];

export function PosSubNav({ activePath }: { activePath?: string }) {
  const currentPath = usePathname();
  const pathname = activePath || currentPath;

  const itemLink = (item: { href: string; label: string }) => {
    const isActive = pathname === item.href || (item.href !== "/app/pos" && pathname.startsWith(item.href));
    return <Link key={item.href} href={item.href} className={isActive ? "is-active" : ""}>{item.label}</Link>;
  };

  return (
    <nav className="pos-subnav" aria-label="Navegación de PROCESA POS">
      <div className="pos-subnav-main">{primaryItems.map(itemLink)}</div>
      <details className="pos-subnav-more">
        <summary>Gestión <span aria-hidden="true">⌄</span></summary>
        <div>{managementItems.map(itemLink)}</div>
      </details>
    </nav>
  );
}
