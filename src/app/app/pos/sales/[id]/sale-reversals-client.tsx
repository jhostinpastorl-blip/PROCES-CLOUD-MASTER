"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSaleReturnAction, voidSaleAction } from "../actions";

interface SaleItem {
  id: string;
  name_snapshot: string;
  sku_snapshot?: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
  already_returned: number;
}

interface SaleReversalsClientProps {
  companyId: string;
  saleId: string;
  saleStatus: string;
  items: SaleItem[];
  returns: any[];
}

export function SaleReversalsClient({
  companyId,
  saleId,
  saleStatus,
  items,
  returns,
}: SaleReversalsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Return Form State
  const [returnReason, setReturnReason] = useState("");
  const [refundMethod, setRefundMethod] = useState<"cash" | "card" | "transfer" | "digital">("cash");
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});

  // Void Form State
  const [voidReason, setVoidReason] = useState("");

  const totalReturnableQty = items.reduce(
    (acc, it) => acc + Math.max(0, it.quantity - (it.already_returned || 0)),
    0
  );

  const isReversible = (saleStatus === "completed" || saleStatus === "partially_returned") && totalReturnableQty > 0;

  const handleReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const selectedItems = Object.entries(returnQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([sale_item_id, quantity]) => ({
        sale_item_id,
        quantity,
      }));

    if (selectedItems.length === 0) {
      setErrorMsg("Debe seleccionar al menos un producto e ingresar una cantidad mayor a 0.");
      return;
    }

    if (!returnReason.trim()) {
      setErrorMsg("El motivo de la devolución es obligatorio.");
      return;
    }

    startTransition(async () => {
      try {
        await createSaleReturnAction({
          companyId,
          saleId,
          reason: returnReason,
          returnType: "partial_return",
          items: selectedItems,
          refunds: [
            {
              payment_method: refundMethod,
              amount: selectedItems.reduce((acc, it) => {
                const orig = items.find((x) => x.id === it.sale_item_id);
                if (!orig) return acc;
                return acc + (it.quantity / orig.quantity) * orig.line_total;
              }, 0),
            },
          ],
        });
        setShowReturnModal(false);
        setReturnReason("");
        setReturnQuantities({});
        router.refresh();
      } catch (err: any) {
        setErrorMsg(err.message || "Error al procesar la devolución.");
      }
    });
  };

  const handleVoidSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!voidReason.trim()) {
      setErrorMsg("El motivo de anulación es obligatorio.");
      return;
    }

    startTransition(async () => {
      try {
        await voidSaleAction({
          companyId,
          saleId,
          reason: voidReason,
        });
        setShowVoidModal(false);
        setVoidReason("");
        router.refresh();
      } catch (err: any) {
        setErrorMsg(err.message || "Error al anular la venta.");
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Botones de acción si es reversible */}
      {isReversible && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
          <button
            type="button"
            onClick={() => {
              setErrorMsg(null);
              setShowReturnModal(true);
            }}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
          >
            Devolver Productos
          </button>
          <button
            type="button"
            onClick={() => {
              setErrorMsg(null);
              setShowVoidModal(true);
            }}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-sm"
          >
            Anular Venta
          </button>
        </div>
      )}

      {/* Historial de Devoluciones */}
      {returns && returns.length > 0 && (
        <div className="mt-6 space-y-3">
          <h3 className="font-bold text-sm text-foreground uppercase tracking-wide">
            Historial de Devoluciones & Reversiones ({returns.length})
          </h3>
          <div className="space-y-3">
            {returns.map((ret: any) => (
              <div
                key={ret.id}
                className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2 text-sm"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                      {ret.document_number}
                    </span>
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 uppercase">
                      {ret.return_type === "void" ? "Anulación Total" : "Devolución"}
                    </span>
                  </div>
                  <span className="font-bold text-foreground">
                    Reembolsado: S/ {Number(ret.refund_total).toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Motivo: <span className="font-medium text-foreground">{ret.reason}</span> ·{" "}
                  {new Date(ret.created_at).toLocaleString("es-PE")}
                </p>
                {ret.sale_return_items && ret.sale_return_items.length > 0 && (
                  <div className="pt-2 border-t border-border/50 text-xs space-y-1">
                    <p className="font-semibold text-muted-foreground">Ítems devueltos:</p>
                    {ret.sale_return_items.map((ri: any) => (
                      <div key={ri.id} className="flex justify-between text-muted-foreground">
                        <span>
                          {ri.name_snapshot} ({Number(ri.quantity).toFixed(0)} unid.)
                        </span>
                        <span>S/ {Number(ri.line_refund_total).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Devolución */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-foreground">Registrar Devolución de Venta</h3>
            <p className="text-xs text-muted-foreground">
              Seleccione la cantidad a devolver por ítem. El stock se reintegrará al almacén original y se registrará
              el reembolso.
            </p>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs font-medium border border-destructive/20">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleReturnSubmit} className="space-y-4">
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {items.map((it) => {
                  const rem = Math.max(0, it.quantity - (it.already_returned || 0));
                  return (
                    <div
                      key={it.id}
                      className="flex items-center justify-between p-2 rounded-lg border border-border bg-muted/20 text-xs"
                    >
                      <div className="flex-1 pr-2">
                        <p className="font-semibold text-foreground">{it.name_snapshot}</p>
                        <p className="text-muted-foreground">
                          Vendidas: {Number(it.quantity).toFixed(0)} | Devueltas: {Number(it.already_returned || 0).toFixed(0)} | Disponibles: {rem.toFixed(0)}
                        </p>
                      </div>
                      <input
                        type="number"
                        min="0"
                        max={rem}
                        step="1"
                        placeholder="0"
                        disabled={rem <= 0 || isPending}
                        value={returnQuantities[it.id] ?? ""}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setReturnQuantities({
                            ...returnQuantities,
                            [it.id]: val > rem ? rem : val,
                          });
                        }}
                        className="w-20 px-2 py-1 text-center font-bold rounded border border-border bg-background"
                      />
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Medio de Reembolso
                </label>
                <select
                  value={refundMethod}
                  onChange={(e) => setRefundMethod(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background"
                >
                  <option value="cash">Efectivo (Impacta Turno de Caja)</option>
                  <option value="card">Tarjeta / POS (Reembolso electrónico)</option>
                  <option value="transfer">Transferencia Bancaria</option>
                  <option value="digital">Billetera Digital (Yape / Plin)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Motivo de la Devolución *
                </label>
                <input
                  type="text"
                  required
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="Ej. Producto defectuoso, cambio de talla..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setShowReturnModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-border hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {isPending ? "Procesando..." : "Confirmar Devolución"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Void */}
      {showVoidModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-destructive/30 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-destructive">Anulación Completa de Venta</h3>
            <p className="text-xs text-muted-foreground">
              Esta acción revertirá la totalidad de los productos restantes ({totalReturnableQty} unidades) y reintegrará
              los montos cobrados. La operación es irreversible y quedará registrada en auditoría.
            </p>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs font-medium border border-destructive/20">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleVoidSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Motivo de la Anulación *
                </label>
                <input
                  type="text"
                  required
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="Ej. Error de digitación, venta duplicada..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setShowVoidModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-border hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
                >
                  {isPending ? "Anulando..." : "Confirmar Anulación"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
