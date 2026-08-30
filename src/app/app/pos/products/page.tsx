import { getResolvedContext } from "@/lib/company/resolve";
import { requireModule } from "@/lib/modules/entitlements";
import { createClient } from "@/lib/supabase/server";
import { PosSubNav } from "../components/PosSubNav";
import { StatusChip } from "@/components/ui/status-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { createProduct, toggleProductStatus } from "./actions";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ created?: string }> }) {
  const { created } = await searchParams;
  const ctx = await getResolvedContext();
  if (!ctx) {
    return (
      <main className="app-content">
        <EmptyState title="Selecciona una empresa" text="Debes seleccionar una empresa para gestionar productos." />
      </main>
    );
  }

  await requireModule(ctx.company.companyId, "pos");
  const s = await createClient();

  const [{ data: products }, { data: categories }] = await Promise.all([
    s
      .from("products")
      .select("id, code, sku, barcode, name, type, unit, price, cost, tax_type, allows_inventory, is_active, category_id, categories(name)")
      .eq("company_id", ctx.company.companyId)
      .is("deleted_at", null)
      .order("name"),
    s
      .from("categories")
      .select("id, name")
      .eq("company_id", ctx.company.companyId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("name"),
  ]);

  return (
    <main className="app-content premium-real">
      <div className="premium-page-head real-head">
        <div>
          <span>POS CLOUD · CATÁLOGOS</span>
          <h2>Productos y Servicios</h2>
          <p>Administra tu catálogo comercial, precios de venta, costos y afectación impositiva.</p>
        </div>
      </div>

      <PosSubNav activePath="/app/pos/products" />

      {created && (
        <div className="pos-success-banner" role="status">
          <span aria-hidden="true">✓</span>
          <div><b>Producto creado correctamente</b><small>Ya está disponible en el catálogo y en la Terminal POS.</small></div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario de Creación */}
        <section className="table-card p-5 h-fit">
          <h3 className="text-base font-semibold mb-2">Nuevo Producto / Servicio</h3>
          <p className="text-xs text-muted mb-4">Registra un nuevo ítem en tu catálogo comercial.</p>

          <form action={createProduct} className="space-y-3">
            <input type="hidden" name="companyId" value={ctx.company.companyId} />

            <div>
              <label className="block text-xs font-medium mb-1">Tipo</label>
              <select name="type" className="pc-input w-full text-xs">
                <option value="product">Producto físico (Maneja stock)</option>
                <option value="service">Servicio (Sin inventario)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium mb-1">Código *</label>
                <input
                  type="text"
                  name="code"
                  required
                  placeholder="PROD-001"
                  className="pc-input w-full text-xs uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">SKU</label>
                <input
                  type="text"
                  name="sku"
                  placeholder="SKU-100"
                  className="pc-input w-full text-xs uppercase"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Código de Barras</label>
              <input
                type="text"
                name="barcode"
                placeholder="7751234567890"
                className="pc-input w-full text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Nombre Comercial *</label>
              <input
                type="text"
                name="name"
                required
                placeholder="Ej. Gaseosa 500ml / Asesoría Técnica"
                className="pc-input w-full text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Categoría</label>
              <select name="categoryId" className="pc-input w-full text-xs">
                <option value="">-- Sin categoría --</option>
                {categories?.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-medium mb-1">Unidad</label>
                <select name="unit" className="pc-input w-full text-xs">
                  <option value="NIU">Unidad (NIU)</option>
                  <option value="KGM">Kilogramo (KGM)</option>
                  <option value="LTR">Litro (LTR)</option>
                  <option value="BX">Caja (BX)</option>
                  <option value="ZZ">Servicio (ZZ)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Precio Venta *</label>
                <input
                  type="number"
                  name="price"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00"
                  className="pc-input w-full text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Costo Base</label>
                <input
                  type="number"
                  name="cost"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="pc-input w-full text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Impuesto / Afectación</label>
              <select name="taxType" className="pc-input w-full text-xs">
                <option value="igv_18">Gravado (IGV 18%)</option>
                <option value="exempt">Exonerado (0%)</option>
                <option value="inaffected">Inafecto (0%)</option>
              </select>
            </div>

            <button type="submit" className="pc-btn pc-btn-primary pc-btn-sm w-full mt-2">
              Guardar Producto
            </button>
          </form>
        </section>

        {/* Listado de Productos */}
        <section className="table-card lg:col-span-2">
          <div className="table-card-head">
            <div>
              <h3>Catálogo de Productos</h3>
              <p>{products?.length ?? 0} ítems registrados en esta empresa.</p>
            </div>
          </div>
          <div className="divide-y divide-border/40 text-xs">
            {products?.map((prod) => (
              <div key={prod.id} className="p-4 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-muted text-2xs bg-muted/20 px-1.5 py-0.5 rounded">
                      {prod.code}
                    </span>
                    <b className="font-semibold text-foreground text-sm">{prod.name}</b>
                    <StatusChip tone={prod.type === "service" ? "info" : "success"}>
                      {prod.type === "service" ? "Servicio" : "Producto"}
                    </StatusChip>
                    <StatusChip tone={prod.is_active ? "success" : "neutral"}>
                      {prod.is_active ? "Activo" : "Inactivo"}
                    </StatusChip>
                  </div>
                  <div className="flex items-center gap-3 text-muted">
                    <span>Cat: {(prod.categories as any)?.name ?? "General"}</span>
                    <span>·</span>
                    <span>Und: {prod.unit}</span>
                    <span>·</span>
                    <b className="text-foreground">S/ {Number(prod.price).toFixed(2)}</b>
                    {prod.cost > 0 && <small className="text-muted">(Costo: S/ {Number(prod.cost).toFixed(2)})</small>}
                  </div>
                </div>

                <form action={toggleProductStatus}>
                  <input type="hidden" name="companyId" value={ctx.company.companyId} />
                  <input type="hidden" name="productId" value={prod.id} />
                  <input type="hidden" name="isActive" value={prod.is_active ? "false" : "true"} />
                  <button
                    type="submit"
                    className={`pc-btn pc-btn-sm ${prod.is_active ? "pc-btn-secondary" : "pc-btn-primary"}`}
                  >
                    {prod.is_active ? "Desactivar" : "Activar"}
                  </button>
                </form>
              </div>
            ))}

            {(!products || products.length === 0) && (
              <p className="p-6 text-center text-muted text-xs">
                No hay productos en el catálogo. Añade el primero desde el formulario.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
