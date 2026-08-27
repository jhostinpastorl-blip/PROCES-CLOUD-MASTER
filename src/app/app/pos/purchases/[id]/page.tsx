import { getResolvedContext } from "@/lib/company/resolve";
import { requireModule } from "@/lib/modules/entitlements";
import { createClient } from "@/lib/supabase/server";
import { PosSubNav } from "../../components/PosSubNav";
import { StatusChip } from "@/components/ui/status-chip";
import { PurchaseReversalsClient } from "./purchase-reversals-client";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function PosPurchaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getResolvedContext();
  if (!ctx) return <div>No hay contexto de empresa activo.</div>;

  await requireModule(ctx.company.companyId, "pos");

  const { id } = await params;
  const supabase = await createClient();

  const { data: purchase } = await supabase
    .from("purchases")
    .select(`
      *,
      warehouses(name, code),
      suppliers(name, doc_type, doc_number, phone, email, address),
      purchase_items(*)
    `)
    .eq("id", id)
    .eq("company_id", ctx.company.companyId)
    .maybeSingle();

  if (!purchase) {
    notFound();
  }

  // Cargar devoluciones a proveedor asociadas
  const { data: purchaseReturns } = await supabase
    .from("purchase_returns")
    .select(`
      *,
      purchase_return_items(*)
    `)
    .eq("purchase_id", id)
    .eq("company_id", ctx.company.companyId)
    .order("created_at", { ascending: false });

  const returnedMap: Record<string, number> = {};
  (purchaseReturns || []).forEach((ret: any) => {
    (ret.purchase_return_items || []).forEach((ri: any) => {
      returnedMap[ri.purchase_item_id] = (returnedMap[ri.purchase_item_id] || 0) + Number(ri.quantity);
    });
  });

  const enrichedItems = (purchase.purchase_items || []).map((pi: any) => ({
    id: pi.id,
    name_snapshot: pi.name_snapshot,
    sku_snapshot: pi.sku_snapshot,
    unit_snapshot: pi.unit_snapshot,
    quantity: Number(pi.quantity),
    unit_cost: Number(pi.unit_cost),
    line_total: Number(pi.line_total),
    already_returned: returnedMap[pi.id] || 0,
  }));

  return (
    <div className="space-y-6">
      <PosSubNav activePath="/app/pos/purchases" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-foreground font-mono">
              Compra {purchase.document_number}
            </h2>
            <StatusChip tone={purchase.status === "confirmed" ? "success" : "neutral"}>
              {purchase.status === "confirmed" ? "Confirmada" : purchase.status}
            </StatusChip>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Registrada el {new Date(purchase.created_at).toLocaleString("es-PE")} · Ingresada a {purchase.warehouses?.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/app/pos/purchases"
            className="px-4 py-2 text-sm font-semibold rounded-lg border border-border hover:bg-muted"
          >
            Volver a Compras
          </Link>
          <Link
            href="/app/pos/inventory"
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Ver Kardex / Stock
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Info Proveedor */}
        <div className="p-4 rounded-xl border border-border bg-card space-y-2 text-sm">
          <h3 className="font-bold text-xs text-muted-foreground uppercase">Proveedor</h3>
          <p className="font-semibold text-foreground">{purchase.suppliers?.name}</p>
          <p className="text-xs text-muted-foreground font-mono">
            {purchase.suppliers?.doc_type}: {purchase.suppliers?.doc_number}
          </p>
          {purchase.suppliers?.address && (
            <p className="text-xs text-muted-foreground">{purchase.suppliers.address}</p>
          )}
        </div>

        {/* Info Documento */}
        <div className="p-4 rounded-xl border border-border bg-card space-y-2 text-sm">
          <h3 className="font-bold text-xs text-muted-foreground uppercase">Comprobante de Proveedor</h3>
          <p className="font-semibold text-foreground">
            {purchase.supplier_doc_type || "Factura"}: {purchase.supplier_doc_number || "S/N"}
          </p>
          <p className="text-xs text-muted-foreground">
            Fecha Emisión: {purchase.supplier_doc_date ? new Date(purchase.supplier_doc_date).toLocaleDateString("es-PE") : "-"}
          </p>
        </div>

        {/* Info Almacén */}
        <div className="p-4 rounded-xl border border-border bg-card space-y-2 text-sm">
          <h3 className="font-bold text-xs text-muted-foreground uppercase">Almacén de Destino</h3>
          <p className="font-semibold text-foreground">{purchase.warehouses?.name}</p>
          <p className="text-xs text-muted-foreground font-mono">Código: {purchase.warehouses?.code}</p>
        </div>
      </div>

      {/* Items Snapshot Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold text-xs">
            <tr>
              <th className="px-4 py-3">Descripción</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3 text-center">Cant. Ingresada</th>
              <th className="px-4 py-3 text-center">Devuelta a Prov.</th>
              <th className="px-4 py-3 text-right">Costo Unit.</th>
              <th className="px-4 py-3 text-right">IGV</th>
              <th className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border font-medium">
            {enrichedItems.map((item: any) => (
              <tr key={item.id}>
                <td className="px-4 py-3 font-semibold text-foreground">{item.name_snapshot}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.sku_snapshot || "-"}</td>
                <td className="px-4 py-3 text-center font-bold text-success">
                  +{item.quantity.toFixed(0)} {item.unit_snapshot}
                </td>
                <td className="px-4 py-3 text-center font-mono text-xs text-amber-600 dark:text-amber-400 font-bold">
                  {item.already_returned > 0 ? `-${item.already_returned.toFixed(0)}` : "-"}
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground">
                  S/ {item.unit_cost.toFixed(2)}
                </td>
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
              <td className="px-4 py-2 text-right">S/ {Number(purchase.subtotal).toFixed(2)}</td>
            </tr>
            <tr>
              <td colSpan={6} className="px-4 py-2 text-right text-muted-foreground">
                I.G.V. (18%):
              </td>
              <td className="px-4 py-2 text-right">S/ {Number(purchase.tax_total).toFixed(2)}</td>
            </tr>
            <tr className="text-base font-bold text-foreground border-t border-border">
              <td colSpan={6} className="px-4 py-3 text-right">
                TOTAL COMPRA:
              </td>
              <td className="px-4 py-3 text-right text-primary font-black">
                S/ {Number(purchase.total).toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Componente de Devolución a Proveedores */}
      <PurchaseReversalsClient
        companyId={ctx.company.companyId}
        purchaseId={purchase.id}
        purchaseStatus={purchase.status}
        items={enrichedItems}
        returns={purchaseReturns || []}
      />
    </div>
  );
}
