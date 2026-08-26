import { getResolvedContext } from "@/lib/company/resolve";
import { requireModule } from "@/lib/modules/entitlements";
import { createClient } from "@/lib/supabase/server";
import { PosSubNav } from "../components/PosSubNav";
import { StatusChip } from "@/components/ui/status-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { createCategory, toggleCategoryStatus } from "./actions";

export default async function CategoriesPage() {
  const ctx = await getResolvedContext();
  if (!ctx) {
    return (
      <main className="app-content">
        <EmptyState title="Selecciona una empresa" text="Debes seleccionar una empresa para gestionar categorías." />
      </main>
    );
  }

  await requireModule(ctx.company.companyId, "pos");
  const s = await createClient();

  const { data: categories } = await s
    .from("categories")
    .select("id, name, description, is_active, created_at")
    .eq("company_id", ctx.company.companyId)
    .is("deleted_at", null)
    .order("name");

  return (
    <main className="app-content premium-real">
      <div className="premium-page-head real-head">
        <div>
          <span>POS CLOUD · CATÁLOGOS</span>
          <h2>Categorías de Productos</h2>
          <p>Organiza tus productos y servicios en familias y categorías comerciales.</p>
        </div>
      </div>

      <PosSubNav activePath="/app/pos/categories" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario de Creación */}
        <section className="table-card p-5 h-fit">
          <h3 className="text-base font-semibold mb-2">Nueva Categoría</h3>
          <p className="text-xs text-muted mb-4">Añade una categoría para clasificar tu catálogo.</p>
          <form action={createCategory} className="space-y-3">
            <input type="hidden" name="companyId" value={ctx.company.companyId} />
            <div>
              <label className="block text-xs font-medium mb-1">Nombre</label>
              <input
                type="text"
                name="name"
                required
                placeholder="Ej. Bebidas, Abarrotes, Servicios"
                className="pc-input w-full text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Descripción (Opcional)</label>
              <textarea
                name="description"
                rows={2}
                placeholder="Detalle o notas de la categoría..."
                className="pc-input w-full text-xs"
              />
            </div>
            <button type="submit" className="pc-btn pc-btn-primary pc-btn-sm w-full">
              Crear Categoría
            </button>
          </form>
        </section>

        {/* Listado de Categorías */}
        <section className="table-card lg:col-span-2">
          <div className="table-card-head">
            <div>
              <h3>Categorías Registradas</h3>
              <p>{categories?.length ?? 0} categorías en esta empresa.</p>
            </div>
          </div>
          <div className="divide-y divide-border/40 text-xs">
            {categories?.map((cat) => (
              <div key={cat.id} className="p-4 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <b className="font-semibold text-foreground text-sm">{cat.name}</b>
                    <StatusChip tone={cat.is_active ? "success" : "neutral"}>
                      {cat.is_active ? "Activo" : "Inactivo"}
                    </StatusChip>
                  </div>
                  {cat.description && <p className="text-muted mt-1">{cat.description}</p>}
                </div>
                <form action={toggleCategoryStatus}>
                  <input type="hidden" name="companyId" value={ctx.company.companyId} />
                  <input type="hidden" name="categoryId" value={cat.id} />
                  <input type="hidden" name="isActive" value={cat.is_active ? "false" : "true"} />
                  <button
                    type="submit"
                    className={`pc-btn pc-btn-sm ${cat.is_active ? "pc-btn-secondary" : "pc-btn-primary"}`}
                  >
                    {cat.is_active ? "Desactivar" : "Activar"}
                  </button>
                </form>
              </div>
            ))}

            {(!categories || categories.length === 0) && (
              <p className="p-6 text-center text-muted text-xs">
                No hay categorías registradas. Crea la primera desde el formulario.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
