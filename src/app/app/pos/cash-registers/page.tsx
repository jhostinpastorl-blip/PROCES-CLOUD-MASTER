import { getResolvedContext } from "@/lib/company/resolve";
import { requireModule } from "@/lib/modules/entitlements";
import { createClient } from "@/lib/supabase/server";
import { PosSubNav } from "../components/PosSubNav";
import { StatusChip } from "@/components/ui/status-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { createCashRegister, toggleCashRegisterStatus } from "./actions";

export default async function CashRegistersPage() {
  const ctx = await getResolvedContext();
  if (!ctx) {
    return (
      <main className="app-content">
        <EmptyState title="Selecciona una empresa" text="Debes seleccionar una empresa para gestionar cajas." />
      </main>
    );
  }

  await requireModule(ctx.company.companyId, "pos");
  const s = await createClient();

  const [{ data: cashRegisters }, { data: branches }] = await Promise.all([
    s
      .from("cash_registers")
      .select("id, code, name, status, is_active, branch_id, branches(name, code)")
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
          <span>POS CLOUD · TERMINALES</span>
          <h2>Cajas Registradoras</h2>
          <p>Configura los terminales de cobro y puntos de venta asociados a tus sucursales.</p>
        </div>
      </div>

      <PosSubNav activePath="/app/pos/cash-registers" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario de Registro */}
        <section className="table-card p-5 h-fit">
          <h3 className="text-base font-semibold mb-2">Nueva Caja Registradora</h3>
          <p className="text-xs text-muted mb-4">Registra una terminal física o virtual en una sucursal.</p>

          <form action={createCashRegister} className="space-y-3">
            <input type="hidden" name="companyId" value={ctx.company.companyId} />

            <div>
              <label className="block text-xs font-medium mb-1">Sucursal Asignada *</label>
              <select name="branchId" required className="pc-input w-full text-xs">
                <option value="">-- Selecciona sucursal --</option>
                {branches?.map((br) => (
                  <option key={br.id} value={br.id}>
                    {br.name} ({br.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Código de Caja *</label>
              <input
                type="text"
                name="code"
                required
                placeholder="CAJA-01"
                className="pc-input w-full text-xs uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Nombre / Identificador *</label>
              <input
                type="text"
                name="name"
                required
                placeholder="Ej. Caja Principal / Terminal Barra"
                className="pc-input w-full text-xs"
              />
            </div>

            <button type="submit" className="pc-btn pc-btn-primary pc-btn-sm w-full mt-2">
              Crear Caja
            </button>
          </form>
        </section>

        {/* Listado de Cajas */}
        <section className="table-card lg:col-span-2">
          <div className="table-card-head">
            <div>
              <h3>Cajas Registradas</h3>
              <p>{cashRegisters?.length ?? 0} terminales en esta empresa.</p>
            </div>
          </div>
          <div className="divide-y divide-border/40 text-xs">
            {cashRegisters?.map((cr) => (
              <div key={cr.id} className="p-4 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-muted text-2xs bg-muted/20 px-1.5 py-0.5 rounded">
                      {cr.code}
                    </span>
                    <b className="font-semibold text-foreground text-sm">{cr.name}</b>
                    <StatusChip tone={cr.status === "open" ? "success" : "warning"}>
                      {cr.status === "open" ? "Abierta" : "Cerrada"}
                    </StatusChip>
                    <StatusChip tone={cr.is_active ? "success" : "neutral"}>
                      {cr.is_active ? "Activo" : "Inactivo"}
                    </StatusChip>
                  </div>
                  <div className="flex items-center gap-3 text-muted">
                    <span>
                      Sucursal: {(cr.branches as any)?.name} ({(cr.branches as any)?.code})
                    </span>
                  </div>
                </div>

                <form action={toggleCashRegisterStatus}>
                  <input type="hidden" name="companyId" value={ctx.company.companyId} />
                  <input type="hidden" name="cashRegisterId" value={cr.id} />
                  <input type="hidden" name="isActive" value={cr.is_active ? "false" : "true"} />
                  <button
                    type="submit"
                    className={`pc-btn pc-btn-sm ${cr.is_active ? "pc-btn-secondary" : "pc-btn-primary"}`}
                  >
                    {cr.is_active ? "Desactivar" : "Activar"}
                  </button>
                </form>
              </div>
            ))}

            {(!cashRegisters || cashRegisters.length === 0) && (
              <p className="p-6 text-center text-muted text-xs">
                No hay cajas configuradas. Registra la primera desde el formulario.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
