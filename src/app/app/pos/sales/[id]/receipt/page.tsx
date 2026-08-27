import { getResolvedContext } from "@/lib/company/resolve";
import { requireModule } from "@/lib/modules/entitlements";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function PosSaleReceiptPage({
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
      companies(name, legal_name, tax_id),
      branches(name, address),
      customers(name, doc_type, doc_number),
      sale_items(*),
      sale_payments(*)
    `)
    .eq("id", id)
    .eq("company_id", ctx.company.companyId)
    .maybeSingle();

  if (!sale) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-muted/40 p-4 sm:p-8 flex flex-col items-center">
      {/* Control Buttons (hidden in print) */}
      <div className="w-full max-w-[80mm] flex justify-between mb-4 print:hidden">
        <button
          onClick={() => {}}
          className="px-3 py-1.5 text-xs font-semibold rounded bg-primary text-primary-foreground"
        >
          Imprimir Ticket
        </button>
        <span className="text-xs text-muted-foreground self-center">Formato Térmico 80mm</span>
      </div>

      {/* Thermal Ticket Card */}
      <div className="w-full max-w-[80mm] bg-white text-black p-4 font-mono text-[11px] leading-tight shadow-lg print:shadow-none print:p-0 print:m-0">
        {/* Header */}
        <div className="text-center space-y-1 pb-3 border-b border-dashed border-gray-400">
          <h1 className="font-bold text-sm uppercase">{sale.companies?.legal_name || sale.companies?.name}</h1>
          <p className="text-[10px]">RUC: {sale.companies?.tax_id}</p>
          <p className="text-[10px]">{sale.branches?.name} - {sale.branches?.address || "Lima, Perú"}</p>
          <div className="pt-2 font-bold text-xs">
            COMPROBANTE INTERNO
            <br />
            {sale.document_number}
          </div>
        </div>

        {/* Metadata */}
        <div className="py-2 border-b border-dashed border-gray-400 space-y-0.5 text-[10px]">
          <p>Fecha: {new Date(sale.created_at).toLocaleString("es-PE")}</p>
          <p>Cliente: {sale.customers?.name || "VENTA GENERAL"}</p>
          {sale.customers && <p>{sale.customers.doc_type}: {sale.customers.doc_number}</p>}
        </div>

        {/* Items List */}
        <div className="py-2 border-b border-dashed border-gray-400 space-y-1.5">
          <div className="flex justify-between font-bold text-[10px] pb-1 border-b border-gray-200">
            <span>CANT / DESCRIPCIÓN</span>
            <span>TOTAL</span>
          </div>
          {sale.sale_items?.map((item: any) => (
            <div key={item.id} className="flex justify-between items-start">
              <div className="flex-1 pr-2">
                <span className="font-bold">{Number(item.quantity).toFixed(0)}x </span>
                <span>{item.name_snapshot}</span>
              </div>
              <span className="font-bold">S/ {Number(item.line_total).toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="py-2 border-b border-dashed border-gray-400 space-y-1 text-[10px]">
          <div className="flex justify-between">
            <span>OP. GRAVADA:</span>
            <span>S/ {Number(sale.subtotal).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>I.G.V. (18%):</span>
            <span>S/ {Number(sale.tax_total).toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-black text-xs pt-1 border-t border-gray-300">
            <span>TOTAL A PAGAR:</span>
            <span>S/ {Number(sale.total).toFixed(2)}</span>
          </div>
        </div>

        {/* Payments Breakdown */}
        <div className="py-2 border-b border-dashed border-gray-400 space-y-0.5 text-[10px]">
          {sale.sale_payments?.map((p: any) => (
            <div key={p.id} className="flex justify-between">
              <span className="capitalize">PAGO {p.payment_method}:</span>
              <span>S/ {Number(p.amount).toFixed(2)}</span>
            </div>
          ))}
          {Number(sale.change_amount) > 0 && (
            <div className="flex justify-between">
              <span>VUELTO:</span>
              <span>S/ {Number(sale.change_amount).toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center pt-3 text-[9px] text-gray-500 space-y-1">
          <p>¡Gracias por su compra!</p>
          <p>PROCESA CLOUD · POS SYSTEM</p>
        </div>
      </div>
    </div>
  );
}
