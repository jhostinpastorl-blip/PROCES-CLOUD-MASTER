"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const posNavItems = [
  { href: "/app/pos", label: "Inicio" },
  { href: "/app/pos/terminal", label: "Terminal de Venta" },
  { href: "/app/pos/sales", label: "Ventas" },
  { href: "/app/pos/purchases", label: "Compras" },
  { href: "/app/pos/cash-sessions", label: "Turnos de Caja" },
  { href: "/app/pos/reports", label: "Reportes" },
  { href: "/app/pos/inventory", label: "Inventario & Kardex" },
  { href: "/app/pos/products", label: "Productos" },
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

  return (
    <div className="border-b border-border bg-card/60 backdrop-blur-sm -mt-4 mb-6">
      <div className="flex items-center gap-1 overflow-x-auto py-2 px-1 text-sm scrollbar-thin">
        {posNavItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/app/pos" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap px-3 py-1.5 rounded-md font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
