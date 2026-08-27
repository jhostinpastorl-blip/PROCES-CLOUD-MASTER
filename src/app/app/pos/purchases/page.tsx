import { getResolvedContext } from "@/lib/company/resolve";
import { requireModule } from "@/lib/modules/entitlements";
import { createClient } from "@/lib/supabase/server";
import { PosSubNav } from "../components/PosSubNav";
import { StatusChip } from "@/components/ui/status-chip";
import Link from "next/link";

export default async function PosPurchasesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const ctx = await getResolvedContext();
  if (!ctx) return <div>No hay contexto de empresa activo.</div>;

  await requireModule(ctx.company.companyId, "pos");

  const sp = await searchParams;
  const query = sp.q?.trim() || "";

  const supabase = await createClient();

  let purchasesQuery = supabase
    .from("purchases")
    .select(`
      id,
      document_number,
      supplier_doc_type,
      supplier_doc_number,
      supplier_doc_date,
      subtotal,
      tax_total,
      total,
      status,
      created_at,
      warehouses(name),
      suppliers(name, doc_number)
    `)
    .eq("company_id", ctx.company.companyId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (query) {
    purchasesQuery = purchasesQuery.ilike("document_number", `%${query}%`);
  }

  const { data: purchases } = await purchasesQuery;

  return (
    <div className="space-y-6">
      <PosSubNav activePath="/app/pos/purchases" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Compras a Proveedores</h2>
          <p className="text-sm text-muted-foreground">
            Registro de abastecimiento, costo promedio ponderado y recepción de inventario (PURCHASE_IN).
          </p>
        </div>
        <Link
          href="/app/pos/purchases/new"
          className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          + Nueva Compra
        </Link>
      </div>

      {/* Search Filter */}
      <form method="get" className="flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="Buscar por código de compra (ej. COM-00000001)..."
          className="w-full max-w-md px-3.5 py-2 rounded-lg border border-border bg-background text-sm"
        />
        <button type="submit" className="px-4 py-2 text-sm font-semibold rounded-lg border border-border hover:bg-muted">
          Buscar
        </button>
      </form>

      {/* Purchases Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold text-xs">
              <tr>
                <th className="px-4 py-3">Código Compra</th>
                <th className="px-4 py-3">Doc. Proveedor</th>
                <th className="px-4 py-3">Proveedor</th>
                <th className="px-4 py-3">Almacén Destino</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-medium">
              {purchases?.map((p: any) => (
                <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-primary">
                    {p.document_number}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {p.supplier_doc_number ? `${p.supplier_doc_type || "F"} ${p.supplier_doc_number}` : "-"}
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {p.suppliers?.name}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {p.warehouses?.name}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString("es-PE")}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-foreground">
                    S/ {Number(p.total).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusChip tone={p.status === "confirmed" ? "success" : "neutral"}>
                      {p.status === "confirmed" ? "Confirmada" : p.status}
                    </StatusChip>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/app/pos/purchases/${p.id}`}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Ver Detalle
                    </Link>
                  </td>
                </tr>
              ))}
              {(!purchases || purchases.length === 0) && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground text-sm">
                    No se han registrado compras todavía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
