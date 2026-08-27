import Link from "next/link";
import { getResolvedContext } from "@/lib/company/resolve";
import { requireModule } from "@/lib/modules/entitlements";
import { createClient } from "@/lib/supabase/server";
import { PosSubNav } from "../components/PosSubNav";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusChip } from "@/components/ui/status-chip";

export default async function PosReportsPage(props: {
  searchParams?: Promise<{ tab?: string; start?: string; end?: string; branchId?: string }>;
}) {
  const ctx = await getResolvedContext();
  if (!ctx) {
    return (
      <main className="app-content">
        <EmptyState title="Selecciona una empresa" text="Debes seleccionar una empresa para acceder a los reportes de PROCESA POS." />
      </main>
    );
  }

  await requireModule(ctx.company.companyId, "pos");
  const s = await createClient();
  const searchParams = props.searchParams ? await props.searchParams : {};
  const currentTab = searchParams.tab || "sales";

  const { data: branches } = await s.from("branches").select("id, name, code").eq("company_id", ctx.company.companyId).eq("is_active", true);

  // Fetch report data according to tab
  let salesReport: any = null;
  let prodReport: any = null;
  let cashReport: any = null;
  let purReport: any = null;
  let invReport: any = null;

  if (currentTab === "sales") {
    const { data } = await s.rpc("get_pos_sales_report", {
      p_company_id: ctx.company.companyId,
      p_branch_id: searchParams.branchId || null
    });
    salesReport = data;
  } else if (currentTab === "products") {
    const { data } = await s.rpc("get_pos_product_report", {
      p_company_id: ctx.company.companyId,
      p_branch_id: searchParams.branchId || null
    });
    prodReport = data;
  } else if (currentTab === "cash") {
    const { data } = await s.rpc("get_pos_cash_report", {
      p_company_id: ctx.company.companyId,
      p_branch_id: searchParams.branchId || null
    });
    cashReport = data;
  } else if (currentTab === "purchases") {
    const { data } = await s.rpc("get_pos_purchases_report", {
      p_company_id: ctx.company.companyId,
      p_branch_id: searchParams.branchId || null
    });
    purReport = data;
  } else if (currentTab === "inventory") {
    const { data } = await s.rpc("get_pos_inventory_report", {
      p_company_id: ctx.company.companyId,
      p_include_cost: true
    });
    invReport = data;
  }

  return (
    <main className="app-content premium-real">
      <div className="premium-page-head real-head">
        <div>
          <span>PROCESA CLOUD · ANALÍTICA OPERATIVA</span>
          <h2>Centro de Reportes y Control Operativo POS</h2>
          <p>Métricas consolidadas derivadas directamente de la verdad transaccional inmutable.</p>
        </div>
      </div>

      <PosSubNav />

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border/40 pb-3 mb-6 overflow-x-auto text-sm">
        <Link
          href="/app/pos/reports?tab=sales"
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            currentTab === "sales" ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted text-muted-foreground"
          }`}
        >
          Ventas & Facturación
        </Link>
        <Link
          href="/app/pos/reports?tab=products"
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            currentTab === "products" ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted text-muted-foreground"
          }`}
        >
          Productos & Rendimiento
        </Link>
        <Link
          href="/app/pos/reports?tab=cash"
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            currentTab === "cash" ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted text-muted-foreground"
          }`}
        >
          Caja & Arqueos (X/Z)
        </Link>
        <Link
          href="/app/pos/reports?tab=purchases"
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            currentTab === "purchases" ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted text-muted-foreground"
          }`}
        >
          Compras & Proveedores
        </Link>
        <Link
          href="/app/pos/reports?tab=inventory"
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            currentTab === "inventory" ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted text-muted-foreground"
          }`}
        >
          Inventario & Stock Crítico
        </Link>
      </div>

      {/* Tab 1: Ventas */}
      {currentTab === "sales" && salesReport && (
        <div>
          <section className="stats-grid real-stats mb-6">
            <article className="stat-card">
              <span>Venta Bruta</span>
              <strong className="text-foreground">S/ {Number(salesReport.gross_sales || 0).toFixed(2)}</strong>
              <small>Operaciones completadas</small>
            </article>
            <article className="stat-card">
              <span>Devoluciones</span>
              <strong className="text-warning">S/ {Number(salesReport.returned_amount || 0).toFixed(2)}</strong>
              <small>{salesReport.return_count || 0} devoluciones</small>
            </article>
            <article className="stat-card">
              <span>Venta Neta Real</span>
              <strong className="text-primary font-black">S/ {Number(salesReport.net_sales || 0).toFixed(2)}</strong>
              <small>Bruta - Devoluciones</small>
            </article>
            <article className="stat-card">
              <span>Ticket Promedio</span>
              <strong>S/ {Number(salesReport.average_ticket || 0).toFixed(2)}</strong>
              <small>{salesReport.transaction_count || 0} transacciones</small>
            </article>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="table-card">
              <div className="table-card-head">
                <h3>Medios de Pago</h3>
                <p>Distribución de ingresos por canal.</p>
              </div>
              <div className="divide-y divide-border/40 text-xs p-2">
                <div className="p-3 flex justify-between">
                  <span>Efectivo</span>
                  <b>S/ {Number(salesReport.payment_methods?.cash || 0).toFixed(2)}</b>
                </div>
                <div className="p-3 flex justify-between">
                  <span>Tarjeta</span>
                  <b>S/ {Number(salesReport.payment_methods?.card || 0).toFixed(2)}</b>
                </div>
                <div className="p-3 flex justify-between">
                  <span>Transferencia</span>
                  <b>S/ {Number(salesReport.payment_methods?.transfer || 0).toFixed(2)}</b>
                </div>
                <div className="p-3 flex justify-between">
                  <span>Billetera Digital</span>
                  <b>S/ {Number(salesReport.payment_methods?.digital || 0).toFixed(2)}</b>
                </div>
              </div>
            </section>

            <section className="table-card">
              <div className="table-card-head">
                <h3>Ventas por Sucursal</h3>
                <p>Comparativo multi-sucursal.</p>
              </div>
              <div className="divide-y divide-border/40 text-xs p-2">
                {salesReport.by_branch?.map((b: any) => (
                  <div key={b.branch_id} className="p-3 flex justify-between items-center">
                    <div>
                      <b className="text-foreground">{b.branch_name}</b>
                      <small className="text-muted-foreground block">{b.sales_count} ventas</small>
                    </div>
                    <b>S/ {Number(b.gross_sales || 0).toFixed(2)}</b>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* Tab 2: Productos */}
      {currentTab === "products" && prodReport && (
        <section className="table-card">
          <div className="table-card-head">
            <h3>Rendimiento por Producto</h3>
            <p>Cantidades vendidas, devueltas e ingreso neto real.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-border/40 bg-muted/20 text-muted-foreground text-left">
                <tr>
                  <th className="p-3">Código / SKU</th>
                  <th className="p-3">Producto</th>
                  <th className="p-3">Categoría</th>
                  <th className="p-3 text-right">Vendidos</th>
                  <th className="p-3 text-right">Devueltos</th>
                  <th className="p-3 text-right">Neto Qty</th>
                  <th className="p-3 text-right">Venta Neta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {prodReport.products?.map((p: any) => (
                  <tr key={p.product_id} className="hover:bg-muted/10">
                    <td className="p-3 font-mono">{p.code || p.sku}</td>
                    <td className="p-3 font-semibold text-foreground">{p.product_name}</td>
                    <td className="p-3 text-muted-foreground">{p.category_name}</td>
                    <td className="p-3 text-right">{Number(p.quantity_sold).toFixed(2)}</td>
                    <td className="p-3 text-right text-warning">-{Number(p.quantity_returned).toFixed(2)}</td>
                    <td className="p-3 text-right font-bold">{Number(p.net_quantity).toFixed(2)}</td>
                    <td className="p-3 text-right font-bold text-primary">S/ {Number(p.net_revenue).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Tab 3: Caja & Arqueos */}
      {currentTab === "cash" && cashReport && (
        <div>
          <section className="stats-grid real-stats mb-6">
            <article className="stat-card">
              <span>Total Aperturas</span>
              <strong>S/ {Number(cashReport.summary?.total_opening || 0).toFixed(2)}</strong>
              <small>{cashReport.total_count || 0} turnos</small>
            </article>
            <article className="stat-card">
              <span>Efectivo Esperado</span>
              <strong>S/ {Number(cashReport.summary?.total_expected || 0).toFixed(2)}</strong>
              <small>Arqueo teórico</small>
            </article>
            <article className="stat-card">
              <span>Efectivo Declarado</span>
              <strong>S/ {Number(cashReport.summary?.total_declared || 0).toFixed(2)}</strong>
              <small>Arqueo físico</small>
            </article>
            <article className="stat-card">
              <span>Sobrantes / Faltantes</span>
              <div className="flex gap-2">
                <span className="text-success font-bold">+{Number(cashReport.summary?.total_difference_positive || 0).toFixed(2)}</span>
                <span className="text-destructive font-bold">{Number(cashReport.summary?.total_difference_negative || 0).toFixed(2)}</span>
              </div>
              <small>Diferencias netas</small>
            </article>
          </section>

          <section className="table-card">
            <div className="table-card-head">
              <h3>Historial de Turnos de Caja (Reporte X / Z)</h3>
              <p>Auditoría de aperturas, cierres y diferencias de caja.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b border-border/40 bg-muted/20 text-muted-foreground text-left">
                  <tr>
                    <th className="p-3">Caja / Sucursal</th>
                    <th className="p-3">Operador</th>
                    <th className="p-3">Apertura</th>
                    <th className="p-3 text-right">Apertura S/</th>
                    <th className="p-3 text-right">Esperado S/</th>
                    <th className="p-3 text-right">Declarado S/</th>
                    <th className="p-3 text-right">Diferencia</th>
                    <th className="p-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {cashReport.sessions?.map((s: any) => (
                    <tr key={s.session_id} className="hover:bg-muted/10">
                      <td className="p-3">
                        <b>{s.register_name}</b>
                        <small className="text-muted-foreground block">{s.branch_name}</small>
                      </td>
                      <td className="p-3">{s.operator_name || "Operador"}</td>
                      <td className="p-3 text-muted-foreground">{new Date(s.opened_at).toLocaleString("es-PE")}</td>
                      <td className="p-3 text-right">S/ {Number(s.opening_amount).toFixed(2)}</td>
                      <td className="p-3 text-right font-semibold">S/ {Number(s.expected_cash || 0).toFixed(2)}</td>
                      <td className="p-3 text-right font-semibold">S/ {Number(s.declared_cash || 0).toFixed(2)}</td>
                      <td className="p-3 text-right font-bold">
                        <span className={s.difference > 0 ? "text-success" : s.difference < 0 ? "text-destructive" : "text-muted-foreground"}>
                          {s.difference != null ? `S/ ${Number(s.difference).toFixed(2)}` : "-"}
                        </span>
                      </td>
                      <td className="p-3">
                        <StatusChip tone={s.status === "open" ? "success" : "neutral"}>
                          {s.status === "open" ? "Abierta (X)" : "Cerrada (Z)"}
                        </StatusChip>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* Tab 4: Compras */}
      {currentTab === "purchases" && purReport && (
        <div>
          <section className="stats-grid real-stats mb-6">
            <article className="stat-card">
              <span>Compras Brutas</span>
              <strong>S/ {Number(purReport.gross_purchases || 0).toFixed(2)}</strong>
              <small>{purReport.purchases_count || 0} compras</small>
            </article>
            <article className="stat-card">
              <span>Devoluciones a Proveedores</span>
              <strong className="text-warning">S/ {Number(purReport.purchase_returns || 0).toFixed(2)}</strong>
              <small>{purReport.returns_count || 0} devoluciones</small>
            </article>
            <article className="stat-card">
              <span>Compras Netas</span>
              <strong className="text-primary font-black">S/ {Number(purReport.net_purchases || 0).toFixed(2)}</strong>
              <small>Egreso real confirmado</small>
            </article>
          </section>

          <section className="table-card">
            <div className="table-card-head">
              <h3>Compras por Proveedor</h3>
              <p>Volumen de compras y notas de crédito con proveedores.</p>
            </div>
            <div className="divide-y divide-border/40 text-xs p-2">
              {purReport.by_supplier?.map((sup: any) => (
                <div key={sup.supplier_id} className="p-3 flex justify-between items-center">
                  <div>
                    <b className="text-foreground">{sup.supplier_name}</b>
                    <small className="text-muted-foreground block">RUC: {sup.supplier_tax_id} · {sup.purchases_count} compras</small>
                  </div>
                  <b className="text-foreground text-sm">S/ {Number(sup.gross_purchases || 0).toFixed(2)}</b>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Tab 5: Inventario */}
      {currentTab === "inventory" && invReport && (
        <div>
          <section className="stats-grid real-stats mb-6">
            <article className="stat-card">
              <span>SKUs Monitoreados</span>
              <strong>{invReport.summary?.total_skus || 0}</strong>
              <small>Ítems con stock</small>
            </article>
            <article className="stat-card">
              <span>Unidades Físicas</span>
              <strong>{Number(invReport.summary?.total_units || 0).toFixed(2)}</strong>
              <small>Existencias en almacenes</small>
            </article>
            <article className="stat-card">
              <span>Valorización Total (MACP)</span>
              <strong className="text-primary font-black">S/ {Number(invReport.summary?.total_valuation || 0).toFixed(2)}</strong>
              <small>Valor contable del stock</small>
            </article>
            <article className="stat-card">
              <span>Alertas de Stock</span>
              <div className="flex gap-2 text-sm">
                <span className="text-warning font-bold">{invReport.summary?.low_stock_count || 0} bajo</span>
                <span className="text-destructive font-bold">{invReport.summary?.zero_stock_count || 0} agotado</span>
              </div>
              <small>Puntos de reorden</small>
            </article>
          </section>

          <section className="table-card">
            <div className="table-card-head">
              <h3>Inventario Físico y Valorizado por Almacén</h3>
              <p>Balances en tiempo real con costo promedio ponderado móvil.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b border-border/40 bg-muted/20 text-muted-foreground text-left">
                  <tr>
                    <th className="p-3">Código</th>
                    <th className="p-3">Producto</th>
                    <th className="p-3">Almacén</th>
                    <th className="p-3 text-right">Stock Actual</th>
                    <th className="p-3 text-right">Stock Mínimo</th>
                    <th className="p-3 text-right">Costo Promedio</th>
                    <th className="p-3 text-right">Valorización</th>
                    <th className="p-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {invReport.items?.map((item: any) => (
                    <tr key={item.balance_id} className="hover:bg-muted/10">
                      <td className="p-3 font-mono">{item.product_code || item.sku}</td>
                      <td className="p-3 font-semibold text-foreground">{item.product_name}</td>
                      <td className="p-3 text-muted-foreground">{item.warehouse_name}</td>
                      <td className="p-3 text-right font-bold">{Number(item.quantity).toFixed(2)}</td>
                      <td className="p-3 text-right text-muted-foreground">{Number(item.min_stock).toFixed(2)}</td>
                      <td className="p-3 text-right">S/ {Number(item.average_cost || 0).toFixed(4)}</td>
                      <td className="p-3 text-right font-bold text-primary">S/ {Number(item.inventory_value || 0).toFixed(2)}</td>
                      <td className="p-3">
                        {item.is_zero_stock ? (
                          <StatusChip tone="danger">Agotado</StatusChip>
                        ) : item.is_low_stock ? (
                          <StatusChip tone="warning">Stock Bajo</StatusChip>
                        ) : (
                          <StatusChip tone="success">Óptimo</StatusChip>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
