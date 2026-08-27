import { getResolvedContext } from "@/lib/company/resolve";
import { requireModule } from "@/lib/modules/entitlements";
import { createClient } from "@/lib/supabase/server";
import { PosSubNav } from "../../components/PosSubNav";
import { StatusChip } from "@/components/ui/status-chip";
import { SaleReversalsClient } from "./sale-reversals-client";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function PosSaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getResolvedContext();
  if (!ctx) return <div>No hay contexto de empresa activo.</div>;

  await requireModule(ctx.company.companyId, "pos");

  const { id } = await params;
  const supabase = await createClient();

  const { data: sale } = await supabase
    .from("sales")
    .select(`
      *,
      branches(name, code, address),
      warehouses(name, code),
      customers(name, doc_type, doc_number, address),
      sale_items(*),
      sale_payments(*)
    `)
    .eq("id", id)
    .eq("company_id", ctx.company.companyId)
    .maybeSingle();

  if (!sale) {
    notFound();
  }

  // Cargar devoluciones asociadas
  const { data: saleReturns } = await supabase
    .from("sale_returns")
    .select(`
      *,
      sale_return_items(*)
    `)
    .eq("sale_id", id)
    .eq("company_id", ctx.company.companyId)
    .order("created_at", { ascending: false });

  // Calcular cantidad devuelta por item
  const returnedMap: Record<string, number> = {};
  (saleReturns || []).forEach((ret: any) => {
    (ret.sale_return_items || []).forEach((ri: any) => {
      returnedMap[ri.sale_item_id] = (returnedMap[ri.sale_item_id] || 0) + Number(ri.quantity);
    });
  });

  const enrichedItems = (sale.sale_items || []).map((si: any) => ({
    id: si.id,
    name_snapshot: si.name_snapshot,
    sku_snapshot: si.sku_snapshot,
    quantity: Number(si.quantity),
    unit_price: Number(si.unit_price),
    line_total: Number(si.line_total),
    already_returned: returnedMap[si.id] || 0,
  }));

  const getStatusTone = (status: string) => {
    if (status === "completed") return "success";
    if (status === "partially_returned") return "warning";
    if (status === "fully_returned" || status === "voided") return "danger";
    return "neutral";
  };

  const getStatusLabel = (status: string) => {
    if (status === "completed") return "Completado";
    if (status === "partially_returned") return "Parcialmente Devuelto";
    if (status === "fully_returned") return "Totalmente Devuelto";
    if (status === "voided") return "Anulado";
    return status;
  };

  return (
    <div className="space-y-6">
      <PosSubNav activePath="/app/pos/sales" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-foreground font-mono">
              Comprobante {sale.document_number}
            </h2>
            <StatusChip tone={getStatusTone(sale.status)}>
              {getStatusLabel(sale.status)}
            </StatusChip>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Emitido el {new Date(sale.created_at).toLocaleString("es-PE")} en sucursal {sale.branches?.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/app/pos/sales/${sale.id}/receipt`}
            target="_blank"
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Imprimir Ticket
          </Link>
          <Link
            href="/app/pos/sales"
            className="px-4 py-2 text-sm font-semibold rounded-lg border border-border hover:bg-muted"
          >
            Volver a Ventas
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Info Box */}
        <div className="p-4 rounded-xl border border-border bg-card space-y-2 text-sm">
          <h3 className="font-bold text-xs text-muted-foreground uppercase">Información de Cliente</h3>
          <p className="font-semibold text-foreground">{sale.customers?.name || "Cliente General (Sin identificar)"}</p>
          {sale.customers && (
            <p className="text-xs text-muted-foreground font-mono">
              {sale.customers.doc_type}: {sale.customers.doc_number}
            </p>
          )}
        </div>

        <div className="p-4 rounded-xl border border-border bg-card space-y-2 text-sm">
          <h3 className="font-bold text-xs text-muted-foreground uppercase">Almacén y Sucursal</h3>
          <p className="font-semibold text-foreground">{sale.branches?.name}</p>
          <p className="text-xs text-muted-foreground">Almacén: {sale.warehouses?.name}</p>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card space-y-2 text-sm">
          <h3 className="font-bold text-xs text-muted-foreground uppercase">Resumen de Pago</h3>
          <div className="space-y-1">
            {sale.sale_payments?.map((p: any) => (
              <div key={p.id} className="flex justify-between text-xs">
                <span className="capitalize text-muted-foreground">{p.payment_method}:</span>
                <span className="font-bold">S/ {Number(p.amount).toFixed(2)}</span>
              </div>
            ))}
            {Number(sale.change_amount) > 0 && (
              <div className="flex justify-between text-xs text-muted-foreground border-t border-border pt-1">
                <span>Vuelto:</span>
                <span>S/ {Number(sale.change_amount).toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Items Snapshot Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold text-xs">
            <tr>
              <th className="px-4 py-3">Descripción</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3 text-center">Cant.</th>
              <th className="px-4 py-3 text-center">Devueltas</th>
              <th className="px-4 py-3 text-right">P. Unit.</th>
              <th className="px-4 py-3 text-right">Desc.</th>
              <th className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border font-medium">
            {enrichedItems.map((item: any) => (
              <tr key={item.id}>
                <td className="px-4 py-3 font-semibold text-foreground">{item.name_snapshot}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.sku_snapshot || "-"}</td>
                <td className="px-4 py-3 text-center font-bold">{item.quantity.toFixed(0)}</td>
                <td className="px-4 py-3 text-center font-mono text-xs text-amber-600 dark:text-amber-400 font-bold">
                  {item.already_returned > 0 ? `${item.already_returned.toFixed(0)}` : "-"}
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground">S/ {item.unit_price.toFixed(2)}</td>
                <td className="px-4 py-3 text-right text-muted-foreground">-</td>
                <td className="px-4 py-3 text-right font-bold text-foreground">
                  S/ {item.line_total.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-border bg-muted/20 font-semibold">
            <tr>
              <td colSpan={6} className="px-4 py-2 text-right text-muted-foreground">
                Base Imponible:
              </td>
              <td className="px-4 py-2 text-right">S/ {Number(sale.subtotal).toFixed(2)}</td>
            </tr>
            <tr>
              <td colSpan={6} className="px-4 py-2 text-right text-muted-foreground">
                I.G.V. (18%):
              </td>
              <td className="px-4 py-2 text-right">S/ {Number(sale.tax_total).toFixed(2)}</td>
            </tr>
            <tr className="text-base font-bold text-foreground border-t border-border">
              <td colSpan={6} className="px-4 py-3 text-right">
                TOTAL:
              </td>
              <td className="px-4 py-3 text-right text-primary">S/ {Number(sale.total).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Acciones de Devolución, Anulación & Historial */}
      <SaleReversalsClient
        companyId={ctx.company.companyId}
        saleId={sale.id}
        saleStatus={sale.status}
        items={enrichedItems}
        returns={saleReturns || []}
      />
    </div>
  );
}
