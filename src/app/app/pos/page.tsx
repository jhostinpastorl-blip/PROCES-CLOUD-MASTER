import Link from "next/link";
import { getResolvedContext } from "@/lib/company/resolve";
import { requireModule } from "@/lib/modules/entitlements";
import { createClient } from "@/lib/supabase/server";
import { PosSubNav } from "./components/PosSubNav";
import { StatusChip } from "@/components/ui/status-chip";
import { EmptyState } from "@/components/ui/empty-state";

export default async function PosDashboardPage() {
  const ctx = await getResolvedContext();
  if (!ctx) {
    return (
      <main className="app-content">
        <EmptyState title="Selecciona una empresa" text="Debes seleccionar una empresa para acceder a PROCESA POS Cloud." />
      </main>
    );
  }

  await requireModule(ctx.company.companyId, "pos");
  const s = await createClient();

  const [
    { count: productsCount },
    { count: categoriesCount },
    { count: customersCount },
    { count: suppliersCount },
    { count: warehousesCount },
    { count: cashRegistersCount },
    { data: recentProducts },
    { data: recentCustomers },
  ] = await Promise.all([
    s.from("products").select("id", { count: "exact", head: true }).eq("company_id", ctx.company.companyId).is("deleted_at", null),
    s.from("categories").select("id", { count: "exact", head: true }).eq("company_id", ctx.company.companyId).is("deleted_at", null),
    s.from("customers").select("id", { count: "exact", head: true }).eq("company_id", ctx.company.companyId).is("deleted_at", null),
    s.from("suppliers").select("id", { count: "exact", head: true }).eq("company_id", ctx.company.companyId).is("deleted_at", null),
    s.from("warehouses").select("id", { count: "exact", head: true }).eq("company_id", ctx.company.companyId).is("deleted_at", null),
    s.from("cash_registers").select("id", { count: "exact", head: true }).eq("company_id", ctx.company.companyId).is("deleted_at", null),
    s.from("products").select("id, code, name, price, type, is_active").eq("company_id", ctx.company.companyId).is("deleted_at", null).order("created_at", { ascending: false }).limit(4),
    s.from("customers").select("id, doc_type, doc_number, name, is_active").eq("company_id", ctx.company.companyId).is("deleted_at", null).order("created_at", { ascending: false }).limit(4),
  ]);

  return (
    <main className="app-content premium-real">
      <div className="premium-page-head real-head">
        <div>
          <span>PROCESA CLOUD · ECOSISTEMA COMERCIAL</span>
          <h2>POS Cloud Foundation</h2>
          <p>Base comercial de productos, clientes, almacenes, inventario y cajas para tu empresa.</p>
        </div>
        <StatusChip tone="success">Módulo POS Activo</StatusChip>
      </div>

      <PosSubNav activePath="/app/pos" />

      {/* KPI Cards */}
      <section className="stats-grid real-stats mb-6">
        <article className="stat-card">
          <span>Productos y Servicios</span>
          <strong>{productsCount ?? 0}</strong>
          <small>Ítems en catálogo</small>
        </article>
        <article className="stat-card">
          <span>Categorías</span>
          <strong>{categoriesCount ?? 0}</strong>
          <small>Familias comerciales</small>
        </article>
        <article className="stat-card">
          <span>Clientes Registrados</span>
          <strong>{customersCount ?? 0}</strong>
          <small>Directorio comercial</small>
        </article>
        <article className="stat-card">
          <span>Proveedores</span>
          <strong>{suppliersCount ?? 0}</strong>
          <small>Fuentes de suministro</small>
        </article>
        <article className="stat-card">
          <span>Almacenes</span>
          <strong>{warehousesCount ?? 0}</strong>
          <small>Depósitos de stock</small>
        </article>
        <article className="stat-card">
          <span>Cajas Registradoras</span>
          <strong>{cashRegistersCount ?? 0}</strong>
          <small>Puntos de cobro</small>
        </article>
      </section>

      {/* Grid de Acceso Rápido */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Productos Recientes */}
        <section className="table-card">
          <div className="table-card-head">
            <div>
              <h3>Productos Recientes</h3>
              <p>Últimos ítems dados de alta en el catálogo.</p>
            </div>
            <Link href="/app/pos/products" className="text-xs text-primary hover:underline">
              Ver catálogo →
            </Link>
          </div>
          <div className="divide-y divide-border/40 text-xs">
            {recentProducts?.map((p) => (
              <div key={p.id} className="p-3.5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-muted text-2xs bg-muted/20 px-1.5 py-0.5 rounded">
                      {p.code}
                    </span>
                    <b className="font-semibold text-foreground">{p.name}</b>
                  </div>
                  <small className="text-muted">{p.type === "service" ? "Servicio" : "Producto físico"}</small>
                </div>
                <b>S/ {Number(p.price).toFixed(2)}</b>
              </div>
            ))}
            {(!recentProducts || recentProducts.length === 0) && (
              <p className="p-4 text-muted text-xs text-center">No hay productos registrados aún.</p>
            )}
          </div>
        </section>

        {/* Clientes Recientes */}
        <section className="table-card">
          <div className="table-card-head">
            <div>
              <h3>Clientes Recientes</h3>
              <p>Últimos clientes añadidos al directorio.</p>
            </div>
            <Link href="/app/pos/customers" className="text-xs text-primary hover:underline">
              Ver clientes →
            </Link>
          </div>
          <div className="divide-y divide-border/40 text-xs">
            {recentCustomers?.map((c) => (
              <div key={c.id} className="p-3.5 flex items-center justify-between">
                <div>
                  <b className="font-semibold text-foreground">{c.name}</b>
                  <div>
                    <small className="text-muted font-mono">{c.doc_type}: {c.doc_number}</small>
                  </div>
                </div>
                <StatusChip tone={c.is_active ? "success" : "neutral"}>
                  {c.is_active ? "Activo" : "Inactivo"}
                </StatusChip>
              </div>
            ))}
            {(!recentCustomers || recentCustomers.length === 0) && (
              <p className="p-4 text-muted text-xs text-center">No hay clientes registrados aún.</p>
            )}
          </div>
        </section>
      </div>

      {/* Roadmap Próximas Subfases */}
      <section className="table-card p-5">
        <div className="table-card-head mb-3">
          <div>
            <h3>Roadmap de Módulo POS Cloud</h3>
            <p>Evolución planificada hacia operaciones transaccionales.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="border border-border/40 p-3.5 rounded-lg bg-card/50">
            <span className="text-primary font-semibold block mb-1">FASE 1A · FOUNDATION (ACTUAL)</span>
            <p className="text-muted">Catálogos, Productos, Clientes, Proveedores, Almacenes, Inventario Base y Cajas.</p>
          </div>
          <div className="border border-border/20 p-3.5 rounded-lg bg-muted/10 opacity-75">
            <span className="text-muted font-semibold block mb-1">FASE 1B · VENTAS & CAJA (PRÓXIMA)</span>
            <p className="text-muted">Terminal de ventas rápida, turnos de caja, apertura/cierre, tickets y comprobantes.</p>
          </div>
          <div className="border border-border/20 p-3.5 rounded-lg bg-muted/10 opacity-75">
            <span className="text-muted font-semibold block mb-1">FASE 1C · COMPRAS & KARDEX</span>
            <p className="text-muted">Órdenes de compra, recepción de mercadería, ajustes de stock y valorización.</p>
          </div>
        </div>
      </section>
    </main>
  );
}