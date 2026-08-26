import { getResolvedContext } from "@/lib/company/resolve";
import { requireModule } from "@/lib/modules/entitlements";
import { createClient } from "@/lib/supabase/server";
import { PosSubNav } from "../components/PosSubNav";
import { StatusChip } from "@/components/ui/status-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { createWarehouse, toggleWarehouseStatus } from "./actions";

export default async function WarehousesPage() {
  const ctx = await getResolvedContext();
  if (!ctx) {
    return (
      <main className="app-content">
        <EmptyState title="Selecciona una empresa" text="Debes seleccionar una empresa para gestionar almacenes." />
      </main>
    );
  }

  await requireModule(ctx.company.companyId, "pos");
  const s = await createClient();

  const [{ data: warehouses }, { data: branches }] = await Promise.all([
    s
      .from("warehouses")
      .select("id, code, name, address, is_default, is_active, branch_id, branches(name, code)")
      .eq("company_id", ctx.company.companyId)
      .is("deleted_at", null)
      .order("code"),
    s
      .from("branches")
      .select("id, name, code")
      .eq("company_id", ctx.company.companyId)
      .eq("is_active", true)
      .order("name"),
  ]);

  return (
    <main className="app-content premium-real">
      <div className="premium-page-head real-head">
        <div>
          <span>POS CLOUD · ESTRUCTURA</span>
          <h2>Almacenes y Depósitos</h2>
          <p>Gestiona los almacenes centrales y locales vinculados a tus sucursales.</p>
        </div>
      </div>

      <PosSubNav activePath="/app/pos/warehouses" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario de Registro */}
        <section className="table-card p-5 h-fit">
          <h3 className="text-base font-semibold mb-2">Nuevo Almacén</h3>
          <p className="text-xs text-muted mb-4">Crea un depósito para almacenar stock e inventario.</p>

          <form action={createWarehouse} className="space-y-3">
            <input type="hidden" name="companyId" value={ctx.company.companyId} />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium mb-1">Código *</label>
                <input
                  type="text"
                  name="code"
                  required
                  placeholder="ALM-01"
                  className="pc-input w-full text-xs uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Sucursal Asignada</label>
                <select name="branchId" className="pc-input w-full text-xs">
                  <option value="">-- General / Sin sucursal --</option>
                  {branches?.map((br) => (
                    <option key={br.id} value={br.id}>
                      {br.name} ({br.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Nombre del Almacén *</label>
              <input
                type="text"
                name="name"
                required
                placeholder="Ej. Almacén Central / Depósito Tienda 1"
                className="pc-input w-full text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Dirección / Ubicación Física</label>
              <input
                type="text"
                name="address"
                placeholder="Dirección del almacén..."
                className="pc-input w-full text-xs"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input type="checkbox" name="isDefault" value="true" id="isDefault" className="rounded" />
              <label htmlFor="isDefault" className="text-xs text-muted cursor-pointer">
                Establecer como almacén principal por defecto
              </label>
            </div>

            <button type="submit" className="pc-btn pc-btn-primary pc-btn-sm w-full mt-2">
              Guardar Almacén
            </button>
          </form>
        </section>

        {/* Listado de Almacenes */}
        <section className="table-card lg:col-span-2">
          <div className="table-card-head">
            <div>
              <h3>Almacenes Registrados</h3>
              <p>{warehouses?.length ?? 0} depósitos en esta empresa.</p>
            </div>
          </div>
          <div className="divide-y divide-border/40 text-xs">
            {warehouses?.map((wh) => (
              <div key={wh.id} className="p-4 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-muted text-2xs bg-muted/20 px-1.5 py-0.5 rounded">
                      {wh.code}
                    </span>
                    <b className="font-semibold text-foreground text-sm">{wh.name}</b>
                    {wh.is_default && <StatusChip tone="info">Principal</StatusChip>}
                    <StatusChip tone={wh.is_active ? "success" : "neutral"}>
                      {wh.is_active ? "Activo" : "Inactivo"}
                    </StatusChip>
                  </div>
                  <div className="flex items-center gap-3 text-muted">
                    <span>
                      Sucursal: {(wh.branches as any)?.name ? `${(wh.branches as any).name} (${(wh.branches as any).code})` : "General (Toda la empresa)"}
                    </span>
                    {wh.address && <span>·</span>}
                    {wh.address && <span>{wh.address}</span>}
                  </div>
                </div>

                <form action={toggleWarehouseStatus}>
                  <input type="hidden" name="companyId" value={ctx.company.companyId} />
                  <input type="hidden" name="warehouseId" value={wh.id} />
                  <input type="hidden" name="isActive" value={wh.is_active ? "false" : "true"} />
                  <button
                    type="submit"
                    className={`pc-btn pc-btn-sm ${wh.is_active ? "pc-btn-secondary" : "pc-btn-primary"}`}
                  >
                    {wh.is_active ? "Desactivar" : "Activar"}
                  </button>
                </form>
              </div>
            ))}

            {(!warehouses || warehouses.length === 0) && (
              <p className="p-6 text-center text-muted text-xs">
                No hay almacenes configurados. Registra el primero desde el formulario.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
