import { getResolvedContext } from "@/lib/company/resolve";
import { requireModule } from "@/lib/modules/entitlements";
import { createClient } from "@/lib/supabase/server";
import { PosSubNav } from "../components/PosSubNav";
import { StatusChip } from "@/components/ui/status-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { setInitialStockAction } from "./actions";

export default async function InventoryPage() {
  const ctx = await getResolvedContext();
  if (!ctx) {
    return (
      <main className="app-content">
        <EmptyState title="Selecciona una empresa" text="Debes seleccionar una empresa para consultar inventario." />
      </main>
    );
  }

  await requireModule(ctx.company.companyId, "pos");
  const s = await createClient();

  const [{ data: balances }, { data: warehouses }, { data: products }] = await Promise.all([
    s
      .from("inventory_balances")
      .select("id, quantity, updated_at, warehouse_id, product_id, warehouses(name, code), products(name, code, unit, allows_inventory)")
      .eq("company_id", ctx.company.companyId)
      .order("updated_at", { ascending: false }),
    s
      .from("warehouses")
      .select("id, name, code")
      .eq("company_id", ctx.company.companyId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("name"),
    s
      .from("products")
      .select("id, name, code, unit")
      .eq("company_id", ctx.company.companyId)
      .eq("allows_inventory", true)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("name"),
  ]);

  return (
    <main className="app-content premium-real">
      <div className="premium-page-head real-head">
        <div>
          <span>POS CLOUD · CONTROL</span>
          <h2>Inventario y Balances de Stock</h2>
          <p>Supervisa el stock en tiempo real por almacén y establece cargas de stock inicial.</p>
        </div>
      </div>

      <PosSubNav activePath="/app/pos/inventory" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario de Carga Inicial */}
        <section className="table-card p-5 h-fit">
          <h3 className="text-base font-semibold mb-2">Carga de Stock Inicial</h3>
          <p className="text-xs text-muted mb-4">Establece el inventario de apertura para un producto en almacén.</p>

          <form action={setInitialStockAction} className="space-y-3">
            <input type="hidden" name="companyId" value={ctx.company.companyId} />

            <div>
              <label className="block text-xs font-medium mb-1">Almacén Destino *</label>
              <select name="warehouseId" required className="pc-input w-full text-xs">
                <option value="">-- Selecciona almacén --</option>
                {warehouses?.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name} ({wh.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Producto Físico *</label>
              <select name="productId" required className="pc-input w-full text-xs">
                <option value="">-- Selecciona producto --</option>
                {products?.map((prod) => (
                  <option key={prod.id} value={prod.id}>
                    {prod.code} - {prod.name} ({prod.unit})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium mb-1">Cantidad Inicial *</label>
                <input
                  type="number"
                  name="quantity"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="100.00"
                  className="pc-input w-full text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Costo Unitario</label>
                <input
                  type="number"
                  name="unitCost"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="pc-input w-full text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Nota de Apertura (Opcional)</label>
              <input
                type="text"
                name="notes"
                placeholder="Ej. Inventario inicial de migración"
                className="pc-input w-full text-xs"
              />
            </div>

            <button type="submit" className="pc-btn pc-btn-primary pc-btn-sm w-full mt-2">
              Registrar Stock Inicial
            </button>
          </form>
        </section>

        {/* Tabla de Balances */}
        <section className="table-card lg:col-span-2">
          <div className="table-card-head">
            <div>
              <h3>Balances de Stock en Almacenes</h3>
              <p>{balances?.length ?? 0} registros de stock activos.</p>
            </div>
          </div>
          <div className="divide-y divide-border/40 text-xs">
            {balances?.map((b) => (
              <div key={b.id} className="p-4 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-muted text-2xs bg-muted/20 px-1.5 py-0.5 rounded">
                      {(b.products as any)?.code}
                    </span>
                    <b className="font-semibold text-foreground text-sm">{(b.products as any)?.name}</b>
                    <StatusChip tone={Number(b.quantity) > 0 ? "success" : "warning"}>
                      {Number(b.quantity) > 0 ? "En Stock" : "Sin Stock"}
                    </StatusChip>
                  </div>
                  <div className="flex items-center gap-3 text-muted">
                    <span>Almacén: {(b.warehouses as any)?.name} ({(b.warehouses as any)?.code})</span>
                    <span>·</span>
                    <small>Actualizado: {new Date(b.updated_at).toLocaleString("es-PE")}</small>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-base font-bold text-foreground">
                    {Number(b.quantity).toFixed(2)} {(b.products as any)?.unit}
                  </div>
                </div>
              </div>
            ))}

            {(!balances || balances.length === 0) && (
              <p className="p-6 text-center text-muted text-xs">
                No hay balances de inventario registrados. Realiza una carga inicial desde el formulario.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
