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
    { count: customersCount },
    { count: warehousesCount },
    { count: salesCount },
    { count: activeSessionsCount },
    { data: recentSales },
    { data: recentProducts },
  ] = await Promise.all([
    s.from("products").select("id", { count: "exact", head: true }).eq("company_id", ctx.company.companyId).is("deleted_at", null),
    s.from("customers").select("id", { count: "exact", head: true }).eq("company_id", ctx.company.companyId).is("deleted_at", null),
    s.from("warehouses").select("id", { count: "exact", head: true }).eq("company_id", ctx.company.companyId).is("deleted_at", null),
    s.from("sales").select("id", { count: "exact", head: true }).eq("company_id", ctx.company.companyId),
    s.from("cash_sessions").select("id", { count: "exact", head: true }).eq("company_id", ctx.company.companyId).eq("status", "open"),
    s.from("sales").select("id, document_number, total, created_at, status, customers(name)").eq("company_id", ctx.company.companyId).order("created_at", { ascending: false }).limit(4),
    s.from("products").select("id, code, name, price, type, is_active").eq("company_id", ctx.company.companyId).is("deleted_at", null).order("created_at", { ascending: false }).limit(4),
  ]);

  return (
    <main className="app-content premium-real">
      <div className="premium-page-head real-head">
        <div>
          <span>PROCESA CLOUD · ECOSISTEMA COMERCIAL</span>
          <h2>Punto de Venta (POS) Cloud</h2>
          <p>Terminal de ventas rápidas, turnos de caja, inventario en tiempo real y comprobantes internos.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/app/pos/terminal"
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
          >
            Abrir Terminal POS
          </Link>
        </div>
      </div>

      <PosSubNav />

      {/* KPI Cards */}
      <section className="stats-grid real-stats mb-6">
        <article className="stat-card">
          <span>Ventas Totales</span>
          <strong>{salesCount ?? 0}</strong>
          <small>Comprobantes emitidos</small>
        </article>
        <article className="stat-card">
          <span>Turnos de Caja</span>
          <strong className={activeSessionsCount ? "text-success" : "text-muted-foreground"}>
            {activeSessionsCount ?? 0}
          </strong>
          <small>{activeSessionsCount ? "Cajas abiertas ahora" : "Sin cajas abiertas"}</small>
        </article>
        <article className="stat-card">
          <span>Catálogo de Productos</span>
          <strong>{productsCount ?? 0}</strong>
          <small>Ítems disponibles</small>
        </article>
        <article className="stat-card">
          <span>Clientes</span>
          <strong>{customersCount ?? 0}</strong>
          <small>Directorio registrado</small>
        </article>
        <article className="stat-card">
          <span>Almacenes</span>
          <strong>{warehousesCount ?? 0}</strong>
          <small>Puntos de stock</small>
        </article>
      </section>

      {/* Grid: Ventas Recientes vs Productos Recientes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Ventas Recientes */}
        <section className="table-card">
          <div className="table-card-head">
            <div>
              <h3>Últimas Ventas Emitidas</h3>
              <p>Tickets y comprobantes recientes.</p>
            </div>
            <Link href="/app/pos/sales" className="text-xs text-primary hover:underline font-semibold">
              Ver todas →
            </Link>
          </div>
          <div className="divide-y divide-border/40 text-xs">
            {recentSales?.map((sale: any) => (
              <div key={sale.id} className="p-3.5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-primary font-bold text-xs">
                      {sale.document_number}
                    </span>
                    <span className="text-muted-foreground">· {sale.customers?.name || "Cliente General"}</span>
                  </div>
                  <small className="text-muted-foreground">{new Date(sale.created_at).toLocaleString("es-PE")}</small>
                </div>
                <div className="text-right">
                  <b className="text-foreground text-sm">S/ {Number(sale.total).toFixed(2)}</b>
                  <div>
                    <StatusChip tone={sale.status === "completed" ? "success" : "neutral"}>
                      {sale.status === "completed" ? "Completado" : "Anulado"}
                    </StatusChip>
                  </div>
                </div>
              </div>
            ))}
            {(!recentSales || recentSales.length === 0) && (
              <p className="p-6 text-muted-foreground text-xs text-center">No hay ventas emitidas todavía.</p>
            )}
          </div>
        </section>

        {/* Catálogo de Productos */}
        <section className="table-card">
          <div className="table-card-head">
            <div>
              <h3>Catálogo de Productos</h3>
              <p>Últimos productos listados para venta.</p>
            </div>
            <Link href="/app/pos/products" className="text-xs text-primary hover:underline font-semibold">
              Ver productos →
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
              <p className="p-6 text-muted text-xs text-center">No hay productos registrados aún.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}