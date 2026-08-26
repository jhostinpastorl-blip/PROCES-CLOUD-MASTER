import { getResolvedContext } from "@/lib/company/resolve";
import { requireModule } from "@/lib/modules/entitlements";
import { createClient } from "@/lib/supabase/server";
import { PosSubNav } from "../components/PosSubNav";
import { StatusChip } from "@/components/ui/status-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { createCustomer, toggleCustomerStatus } from "./actions";

export default async function CustomersPage() {
  const ctx = await getResolvedContext();
  if (!ctx) {
    return (
      <main className="app-content">
        <EmptyState title="Selecciona una empresa" text="Debes seleccionar una empresa para gestionar clientes." />
      </main>
    );
  }

  await requireModule(ctx.company.companyId, "pos");
  const s = await createClient();

  const { data: customers } = await s
    .from("customers")
    .select("id, doc_type, doc_number, name, trade_name, email, phone, address, is_active")
    .eq("company_id", ctx.company.companyId)
    .is("deleted_at", null)
    .order("name");

  return (
    <main className="app-content premium-real">
      <div className="premium-page-head real-head">
        <div>
          <span>POS CLOUD · ENTIDADES</span>
          <h2>Directorio de Clientes</h2>
          <p>Gestiona los clientes comerciales, tipos de documento y datos de contacto.</p>
        </div>
      </div>

      <PosSubNav activePath="/app/pos/customers" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario de Registro */}
        <section className="table-card p-5 h-fit">
          <h3 className="text-base font-semibold mb-2">Nuevo Cliente</h3>
          <p className="text-xs text-muted mb-4">Registra un cliente para futuras ventas y facturación.</p>

          <form action={createCustomer} className="space-y-3">
            <input type="hidden" name="companyId" value={ctx.company.companyId} />

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-medium mb-1">Tipo Doc *</label>
                <select name="docType" className="pc-input w-full text-xs">
                  <option value="DNI">DNI (8 dígitos)</option>
                  <option value="RUC">RUC (11 dígitos)</option>
                  <option value="CE">Carnet Ext.</option>
                  <option value="PASSPORT">Pasaporte</option>
                  <option value="OTHER">Otro</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium mb-1">N° Documento *</label>
                <input
                  type="text"
                  name="docNumber"
                  required
                  placeholder="Ej. 12345678"
                  className="pc-input w-full text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Nombre / Razón Social *</label>
              <input
                type="text"
                name="name"
                required
                placeholder="Nombre completo o Razón Social"
                className="pc-input w-full text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Nombre Comercial (Opcional)</label>
              <input
                type="text"
                name="tradeName"
                placeholder="Nombre comercial"
                className="pc-input w-full text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium mb-1">Teléfono</label>
                <input
                  type="text"
                  name="phone"
                  placeholder="987654321"
                  className="pc-input w-full text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  placeholder="cliente@email.com"
                  className="pc-input w-full text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Dirección Fiscal / Domicilio</label>
              <input
                type="text"
                name="address"
                placeholder="Av. Principal 123, Lima"
                className="pc-input w-full text-xs"
              />
            </div>

            <button type="submit" className="pc-btn pc-btn-primary pc-btn-sm w-full mt-2">
              Guardar Cliente
            </button>
          </form>
        </section>

        {/* Listado de Clientes */}
        <section className="table-card lg:col-span-2">
          <div className="table-card-head">
            <div>
              <h3>Clientes Registrados</h3>
              <p>{customers?.length ?? 0} clientes en esta empresa.</p>
            </div>
          </div>
          <div className="divide-y divide-border/40 text-xs">
            {customers?.map((cust) => (
              <div key={cust.id} className="p-4 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-muted text-2xs bg-muted/20 px-1.5 py-0.5 rounded">
                      {cust.doc_type}: {cust.doc_number}
                    </span>
                    <b className="font-semibold text-foreground text-sm">{cust.name}</b>
                    <StatusChip tone={cust.is_active ? "success" : "neutral"}>
                      {cust.is_active ? "Activo" : "Inactivo"}
                    </StatusChip>
                  </div>
                  <div className="flex items-center gap-3 text-muted">
                    {cust.phone && <span>Tel: {cust.phone}</span>}
                    {cust.phone && cust.email && <span>·</span>}
                    {cust.email && <span>{cust.email}</span>}
                    {(cust.phone || cust.email) && cust.address && <span>·</span>}
                    {cust.address && <span>{cust.address}</span>}
                  </div>
                </div>

                <form action={toggleCustomerStatus}>
                  <input type="hidden" name="companyId" value={ctx.company.companyId} />
                  <input type="hidden" name="customerId" value={cust.id} />
                  <input type="hidden" name="isActive" value={cust.is_active ? "false" : "true"} />
                  <button
                    type="submit"
                    className={`pc-btn pc-btn-sm ${cust.is_active ? "pc-btn-secondary" : "pc-btn-primary"}`}
                  >
                    {cust.is_active ? "Desactivar" : "Activar"}
                  </button>
                </form>
              </div>
            ))}

            {(!customers || customers.length === 0) && (
              <p className="p-6 text-center text-muted text-xs">
                No hay clientes registrados en el directorio. Registra el primero desde el formulario.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
