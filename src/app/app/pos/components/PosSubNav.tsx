import Link from "next/link";

const navItems = [
  { href: "/app/pos", label: "Resumen" },
  { href: "/app/pos/products", label: "Productos" },
  { href: "/app/pos/categories", label: "Categorías" },
  { href: "/app/pos/customers", label: "Clientes" },
  { href: "/app/pos/suppliers", label: "Proveedores" },
  { href: "/app/pos/warehouses", label: "Almacenes" },
  { href: "/app/pos/inventory", label: "Inventario" },
  { href: "/app/pos/cash-registers", label: "Cajas" },
];

export function PosSubNav({ activePath }: { activePath: string }) {
  return (
    <nav className="pos-subnav flex items-center gap-2 border-b border-border/40 pb-3 mb-6 overflow-x-auto">
      {navItems.map((item) => {
        const isActive = activePath === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
              isActive
                ? "bg-primary text-primary-foreground font-semibold"
                : "text-muted hover:text-foreground hover:bg-muted/30"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
