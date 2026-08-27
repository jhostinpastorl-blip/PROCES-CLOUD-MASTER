import { getResolvedContext } from "@/lib/company/resolve";
import { requireModule } from "@/lib/modules/entitlements";
import { createClient } from "@/lib/supabase/server";
import { PosSubNav } from "../components/PosSubNav";
import { StatusChip } from "@/components/ui/status-chip";
import Link from "next/link";

export default async function PosSalesPage({
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

  let salesQuery = supabase
    .from("sales")
    .select(`
      id,
      document_number,
      total,
      paid_amount,
      change_amount,
      status,
      created_at,
      branches(name),
      customers(name, doc_number),
      sale_payments(payment_method, amount)
    `)
    .eq("company_id", ctx.company.companyId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (query) {
    salesQuery = salesQuery.ilike("document_number", `%${query}%`);
  }

  const { data: sales } = await salesQuery;

  return (
    <div className="space-y-6">
      <PosSubNav activePath="/app/pos/sales" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Historial de Ventas</h2>
          <p className="text-sm text-muted-foreground">
            Consulta y emisión de comprobantes internos y tickets de venta.
          </p>
        </div>
        <Link
          href="/app/pos/terminal"
          className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          + Nueva Venta
        </Link>
      </div>

      {/* Search Filter */}
      <form method="get" className="flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="Buscar por número de ticket (ej. T001-00000001)..."
          className="w-full max-w-md px-3.5 py-2 rounded-lg border border-border bg-background text-sm"
        />
        <button type="submit" className="px-4 py-2 text-sm font-semibold rounded-lg border border-border hover:bg-muted">
          Buscar
        </button>
      </form>

      {/* Sales Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold text-xs">
              <tr>
                <th className="px-4 py-3">Nº Comprobante</th>
                <th className="px-4 py-3">Fecha y Hora</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Sucursal</th>
                <th className="px-4 py-3">Medios de Pago</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-medium">
              {sales?.map((sale: any) => {
                const methods = Array.from(new Set(sale.sale_payments?.map((p: any) => p.payment_method) || [])).join(", ");
                return (
                  <tr key={sale.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-primary">
                      {sale.document_number}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(sale.created_at).toLocaleString("es-PE")}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {sale.customers?.name || "Cliente General"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {sale.branches?.name || "Principal"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs uppercase">
                      {methods || "Efectivo"}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-foreground">
                      S/ {Number(sale.total).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusChip tone={sale.status === "completed" ? "success" : "neutral"}>
                        {sale.status === "completed" ? "Completado" : "Anulado"}
                      </StatusChip>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <Link
                        href={`/app/pos/sales/${sale.id}`}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        Detalle
                      </Link>
                      <Link
                        href={`/app/pos/sales/${sale.id}/receipt`}
                        target="_blank"
                        className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                      >
                        Ticket
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {(!sales || sales.length === 0) && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground text-sm">
                    No se encontraron ventas registradas.
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
