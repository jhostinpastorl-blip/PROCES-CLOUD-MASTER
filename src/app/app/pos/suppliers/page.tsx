import { getResolvedContext } from "@/lib/company/resolve";
import { requireModule } from "@/lib/modules/entitlements";
import { createClient } from "@/lib/supabase/server";
import { PosSubNav } from "../components/PosSubNav";
import { StatusChip } from "@/components/ui/status-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { createSupplier, toggleSupplierStatus } from "./actions";

export default async function SuppliersPage() {
  const ctx = await getResolvedContext();
  if (!ctx) {
    return (
      <main className="app-content">
        <EmptyState title="Selecciona una empresa" text="Debes seleccionar una empresa para gestionar proveedores." />
      </main>
    );
  }

  await requireModule(ctx.company.companyId, "pos");
  const s = await createClient();

  const { data: suppliers } = await s
    .from("suppliers")
    .select("id, doc_type, doc_number, name, trade_name, contact_name, email, phone, address, is_active")
    .eq("company_id", ctx.company.companyId)
    .is("deleted_at", null)
    .order("name");

  return (
    <main className="app-content premium-real">
      <div className="premium-page-head real-head">
        <div>
          <span>POS CLOUD · ENTIDADES</span>
          <h2>Directorio de Proveedores</h2>
          <p>Gestiona las empresas proveedoras de mercaderías, insumos y servicios.</p>
        </div>
      </div>

      <PosSubNav activePath="/app/pos/suppliers" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario de Registro */}
        <section className="table-card p-5 h-fit">
          <h3 className="text-base font-semibold mb-2">Nuevo Proveedor</h3>
          <p className="text-xs text-muted mb-4">Registra un proveedor comercial para compras y suministros.</p>

          <form action={createSupplier} className="space-y-3">
            <input type="hidden" name="companyId" value={ctx.company.companyId} />

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-medium mb-1">Tipo Doc *</label>
                <select name="docType" className="pc-input w-full text-xs">
                  <option value="RUC">RUC (11 dígitos)</option>
                  <option value="DNI">DNI (8 dígitos)</option>
                  <option value="OTHER">Otro</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium mb-1">N° Documento *</label>
                <input
                  type="text"
                  name="docNumber"
                  required
                  placeholder="Ej. 20123456789"
                  className="pc-input w-full text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Razón Social *</label>
              <input
                type="text"
                name="name"
                required
                placeholder="Razón Social del Proveedor"
                className="pc-input w-full text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium mb-1">Nombre Comercial</label>
                <input
                  type="text"
                  name="tradeName"
                  placeholder="Marca o nombre comercial"
                  className="pc-input w-full text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Persona de Contacto</label>
                <input
                  type="text"
                  name="contactName"
                  placeholder="Ej. Juan Pérez"
                  className="pc-input w-full text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium mb-1">Teléfono</label>
                <input
                  type="text"
                  name="phone"
                  placeholder="01-1234567 / 987654321"
                  className="pc-input w-full text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  placeholder="ventas@proveedor.com"
                  className="pc-input w-full text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Dirección / Sede</label>
              <input
                type="text"
                name="address"
                placeholder="Av. Industrial 456, Lima"
                className="pc-input w-full text-xs"
              />
            </div>

            <button type="submit" className="pc-btn pc-btn-primary pc-btn-sm w-full mt-2">
              Guardar Proveedor
            </button>
          </form>
        </section>

        {/* Listado de Proveedores */}
        <section className="table-card lg:col-span-2">
          <div className="table-card-head">
            <div>
              <h3>Proveedores Registrados</h3>
              <p>{suppliers?.length ?? 0} proveedores en esta empresa.</p>
            </div>
          </div>
          <div className="divide-y divide-border/40 text-xs">
            {suppliers?.map((supp) => (
              <div key={supp.id} className="p-4 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-muted text-2xs bg-muted/20 px-1.5 py-0.5 rounded">
                      {supp.doc_type}: {supp.doc_number}
                    </span>
                    <b className="font-semibold text-foreground text-sm">{supp.name}</b>
                    <StatusChip tone={supp.is_active ? "success" : "neutral"}>
                      {supp.is_active ? "Activo" : "Inactivo"}
                    </StatusChip>
                  </div>
                  <div className="flex items-center gap-3 text-muted">
                    {supp.contact_name && <span>Contacto: {supp.contact_name}</span>}
                    {supp.contact_name && supp.phone && <span>·</span>}
                    {supp.phone && <span>Tel: {supp.phone}</span>}
                    {supp.phone && supp.email && <span>·</span>}
                    {supp.email && <span>{supp.email}</span>}
                  </div>
                </div>

                <form action={toggleSupplierStatus}>
                  <input type="hidden" name="companyId" value={ctx.company.companyId} />
                  <input type="hidden" name="supplierId" value={supp.id} />
                  <input type="hidden" name="isActive" value={supp.is_active ? "false" : "true"} />
                  <button
                    type="submit"
                    className={`pc-btn pc-btn-sm ${supp.is_active ? "pc-btn-secondary" : "pc-btn-primary"}`}
                  >
                    {supp.is_active ? "Desactivar" : "Activar"}
                  </button>
                </form>
              </div>
            ))}

            {(!suppliers || suppliers.length === 0) && (
              <p className="p-6 text-center text-muted text-xs">
                No hay proveedores registrados. Registra el primero desde el formulario.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
