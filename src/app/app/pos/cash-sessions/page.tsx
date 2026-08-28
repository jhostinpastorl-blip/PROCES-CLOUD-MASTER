import { getResolvedContext } from "@/lib/company/resolve";
import { requireModule } from "@/lib/modules/entitlements";
import { createClient } from "@/lib/supabase/server";
import { PosSubNav } from "../components/PosSubNav";
import { StatusChip } from "@/components/ui/status-chip";
import Link from "next/link";

export default async function PosCashSessionsPage() {
  const ctx = await getResolvedContext();
  if (!ctx) return <div>No hay contexto de empresa activo.</div>;

  await requireModule(ctx.company.companyId, "pos");

  const supabase = await createClient();

  const { data: sessions } = await supabase
    .from("cash_sessions")
    .select(`
      *,
      branches(name),
      cash_registers(name, code)
    `)
    .eq("company_id", ctx.company.companyId)
    .order("opened_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <PosSubNav activePath="/app/pos/cash-sessions" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Turnos y Arqueos de Caja</h2>
          <p className="text-sm text-muted-foreground">
            Aperturas, cierres a ciegas, conciliación de efectivo y comprobantes imprimibles por turno.
          </p>
        </div>
        <Link
          href="/app/pos/terminal"
          className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Ir al Terminal de Venta
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold text-xs">
            <tr>
              <th className="px-4 py-3">Caja / Sucursal</th>
              <th className="px-4 py-3">Apertura</th>
              <th className="px-4 py-3">Cierre</th>
              <th className="px-4 py-3 text-right">Monto Inicial</th>
              <th className="px-4 py-3 text-right">Efectivo Esperado</th>
              <th className="px-4 py-3 text-right">Declarado Físico</th>
              <th className="px-4 py-3 text-right">Diferencia</th>
              <th className="px-4 py-3 text-center">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border font-medium">
            {sessions?.map((s: any) => {
              const diff = s.difference !== null ? Number(s.difference) : null;
              let diffBadge = <span className="text-muted-foreground">-</span>;
              if (diff !== null) {
                if (diff === 0) {
                  diffBadge = <span className="text-success font-bold">S/ 0.00 (Cuadrada)</span>;
                } else if (diff > 0) {
                  diffBadge = <span className="text-warning font-bold">+S/ {diff.toFixed(2)} (Sobrante)</span>;
                } else {
                  diffBadge = <span className="text-destructive font-bold">-S/ {Math.abs(diff).toFixed(2)} (Faltante)</span>;
                }
              }

              return (
                <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-foreground">{s.cash_registers?.name || "Caja"}</p>
                    <p className="text-xs text-muted-foreground">{s.branches?.name || "Sucursal"}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(s.opened_at).toLocaleString("es-PE")}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {s.closed_at ? new Date(s.closed_at).toLocaleString("es-PE") : <span className="text-primary font-bold">En curso...</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    S/ {Number(s.opening_amount).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-foreground">
                    S/ {Number(s.expected_cash).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {s.declared_cash !== null ? `S/ ${Number(s.declared_cash).toFixed(2)}` : "-"}
                  </td>
                  <td className="px-4 py-3 text-right text-xs">
                    {diffBadge}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusChip tone={s.status === "open" ? "success" : "neutral"}>
                      {s.status === "open" ? "Abierto" : "Cerrado"}
                    </StatusChip>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/app/pos/cash-sessions/${s.id}/summary`}
                      className="px-2.5 py-1 text-xs font-semibold rounded-md border border-border bg-background hover:bg-muted text-foreground transition-colors inline-block"
                    >
                      Resumen / Ticket
                    </Link>
                  </td>
                </tr>
              );
            })}
            {(!sessions || sessions.length === 0) && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground text-sm">
                  No hay turnos de caja registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
