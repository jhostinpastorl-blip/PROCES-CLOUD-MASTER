import { getResolvedContext } from "@/lib/company/resolve";
import { requireModule } from "@/lib/modules/entitlements";
import { requirePermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function PosCashSessionSummaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getResolvedContext();
  if (!ctx) return <div>No hay contexto de empresa activo.</div>;

  await requireModule(ctx.company.companyId, "pos");
  await requirePermission(ctx.company.companyId, "pos.cash_sessions.read" as any);

  const { id } = await params;
  const supabase = await createClient();

  // Fetch session details
  const { data: session } = await supabase
    .from("cash_sessions")
    .select(`
      *,
      companies(name, legal_name, tax_id),
      branches(name, address),
      cash_registers(name, code)
    `)
    .eq("id", id)
    .eq("company_id", ctx.company.companyId)
    .maybeSingle();

  if (!session) {
    notFound();
  }

  // Fetch all cash movements for this session
  const { data: movements } = await supabase
    .from("cash_movements")
    .select("*")
    .eq("cash_session_id", id)
    .eq("company_id", ctx.company.companyId)
    .order("created_at", { ascending: true });

  // Fetch sales payments breakdown for this session
  const { data: sales } = await supabase
    .from("sales")
    .select(`
      id,
      total,
      created_at,
      payment_records(*)
    `)
    .eq("cash_session_id", id)
    .eq("company_id", ctx.company.companyId);

  // Calculate payment method aggregates
  let cashSalesTotal = 0;
  let cardSalesTotal = 0;
  let digitalSalesTotal = 0;
  let transferSalesTotal = 0;

  sales?.forEach((sale: any) => {
    sale.payment_records?.forEach((p: any) => {
      const amt = Number(p.amount) || 0;
      if (p.payment_method === "cash") cashSalesTotal += amt;
      else if (p.payment_method === "card") cardSalesTotal += amt;
      else if (p.payment_method === "digital") digitalSalesTotal += amt;
      else if (p.payment_method === "transfer") transferSalesTotal += amt;
    });
  });

  const totalSalesAmount = cashSalesTotal + cardSalesTotal + digitalSalesTotal + transferSalesTotal;
  const openingAmount = Number(session.opening_amount) || 0;
  const expectedCash = Number(session.expected_cash) || 0;
  const declaredCash = session.declared_cash !== null ? Number(session.declared_cash) : null;
  const difference = session.difference !== null ? Number(session.difference) : null;

  let reconciliationLabel = "EN CURSO";
  let reconciliationTone = "text-muted-foreground";
  if (difference !== null) {
    if (difference === 0) {
      reconciliationLabel = "CUADRADA (Sin Diferencias)";
      reconciliationTone = "text-success";
    } else if (difference > 0) {
      reconciliationLabel = `SOBRANTE (+S/ ${difference.toFixed(2)})`;
      reconciliationTone = "text-warning";
    } else {
      reconciliationLabel = `FALTANTE (-S/ ${Math.abs(difference).toFixed(2)})`;
      reconciliationTone = "text-destructive";
    }
  }

  return (
    <div className="min-h-screen bg-muted/40 p-4 sm:p-8 flex flex-col items-center">
      {/* Navigation & Print Controls (Hidden on Print) */}
      <div className="w-full max-w-[80mm] flex items-center justify-between mb-4 print:hidden gap-2">
        <Link
          href="/app/pos/cash-sessions"
          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-background hover:bg-muted"
        >
          ← Volver
        </Link>
        <button
          onClick={() => {}}
          className="px-4 py-1.5 text-xs font-bold rounded-lg bg-primary text-primary-foreground shadow hover:bg-primary/90"
        >
          Imprimir Resumen
        </button>
      </div>

      {/* 80mm Thermal Receipt Card */}
      <div className="w-full max-w-[80mm] bg-white text-black p-4 font-mono text-[11px] leading-tight shadow-xl print:shadow-none print:p-0 print:m-0 border border-gray-200 print:border-none">
        {/* Header */}
        <div className="text-center space-y-1 pb-3 border-b border-dashed border-gray-400">
          <h1 className="font-bold text-sm uppercase">{session.companies?.legal_name || session.companies?.name}</h1>
          <p className="text-[10px]">RUC: {session.companies?.tax_id}</p>
          <p className="text-[10px]">{session.branches?.name} - {session.branches?.address || "Sucursal Principal"}</p>
          <div className="pt-2 font-bold text-xs">
            RESUMEN DE CIERRE DE CAJA
            <br />
            {session.cash_registers?.name} ({session.cash_registers?.code})
          </div>
        </div>

        {/* Metadata */}
        <div className="py-2 border-b border-dashed border-gray-400 space-y-0.5 text-[10px]">
          <p><span className="font-bold">Turno ID:</span> {session.id.slice(0, 8)}</p>
          <p><span className="font-bold">Apertura:</span> {new Date(session.opened_at).toLocaleString("es-PE")}</p>
          <p>
            <span className="font-bold">Cierre:</span>{" "}
            {session.closed_at ? new Date(session.closed_at).toLocaleString("es-PE") : "Turno Abierto"}
          </p>
          <p><span className="font-bold">Estado:</span> {session.status.toUpperCase()}</p>
        </div>

        {/* Sales by Payment Method */}
        <div className="py-2 border-b border-dashed border-gray-400 space-y-1 text-[10px]">
          <div className="font-bold text-xs pb-1 border-b border-gray-200">VENTAS POR MEDIO DE PAGO</div>
          <div className="flex justify-between">
            <span>Efectivo:</span>
            <span>S/ {cashSalesTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tarjeta:</span>
            <span>S/ {cardSalesTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Billetera Digital (Yape/Plin):</span>
            <span>S/ {digitalSalesTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Transferencia:</span>
            <span>S/ {transferSalesTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold pt-1 border-t border-gray-200">
            <span>TOTAL VENTAS ({sales?.length || 0} tickets):</span>
            <span>S/ {totalSalesAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* Cash Reconciliation (Arqueo) */}
        <div className="py-2 border-b border-dashed border-gray-400 space-y-1 text-[10px]">
          <div className="font-bold text-xs pb-1 border-b border-gray-200">ARQUEO DE EFECTIVO</div>
          <div className="flex justify-between">
            <span>(+) Saldo Inicial Apertura:</span>
            <span>S/ {openingAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>(+) Ventas en Efectivo:</span>
            <span>S/ {cashSalesTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold pt-1 border-t border-gray-200">
            <span>(=) Efectivo Esperado en Caja:</span>
            <span>S/ {expectedCash.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>(=) Efectivo Físico Declarado:</span>
            <span>{declaredCash !== null ? `S/ ${declaredCash.toFixed(2)}` : "No cerrado"}</span>
          </div>
          <div className="flex justify-between font-black text-xs pt-1 border-t border-gray-300">
            <span>DIFERENCIA:</span>
            <span>{difference !== null ? `S/ ${difference.toFixed(2)}` : "-"}</span>
          </div>
          <div className="pt-1 text-center font-bold text-[10px]">
            {reconciliationLabel}
          </div>
        </div>

        {/* Notes */}
        {session.notes && (
          <div className="py-2 border-b border-dashed border-gray-400 text-[10px]">
            <span className="font-bold">Observaciones: </span>
            <span>{session.notes}</span>
          </div>
        )}

        {/* Signature lines */}
        <div className="pt-8 pb-2 space-y-6 text-center text-[10px]">
          <div className="border-t border-gray-400 pt-1 mx-4">
            <p className="font-bold">Firma del Cajero</p>
          </div>
          <div className="border-t border-gray-400 pt-1 mx-4">
            <p className="font-bold">Firma del Supervisor</p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 text-center text-[9px] text-gray-500">
          <p>PROCESA CLOUD POS — CONTROL DE CAJA</p>
          <p>Impreso: {new Date().toLocaleString("es-PE")}</p>
        </div>
      </div>
    </div>
  );
}
