"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPurchaseReturnAction } from "../actions";

interface PurchaseItem {
  id: string;
  name_snapshot: string;
  sku_snapshot?: string | null;
  unit_snapshot?: string;
  quantity: number;
  unit_cost: number;
  line_total: number;
  already_returned: number;
}

interface PurchaseReversalsClientProps {
  companyId: string;
  purchaseId: string;
  purchaseStatus: string;
  items: PurchaseItem[];
  returns: any[];
}

export function PurchaseReversalsClient({
  companyId,
  purchaseId,
  purchaseStatus,
  items,
  returns,
}: PurchaseReversalsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [returnReason, setReturnReason] = useState("");
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});

  const totalReturnableQty = items.reduce(
    (acc, it) => acc + Math.max(0, it.quantity - (it.already_returned || 0)),
    0
  );

  const isReversible = purchaseStatus === "confirmed" && totalReturnableQty > 0;

  const handleReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const selectedItems = Object.entries(returnQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([purchase_item_id, quantity]) => ({
        purchase_item_id,
        quantity,
      }));

    if (selectedItems.length === 0) {
      setErrorMsg("Debe seleccionar al menos un producto e ingresar una cantidad a devolver mayor a 0.");
      return;
    }

    if (!returnReason.trim()) {
      setErrorMsg("El motivo de devolución es obligatorio.");
      return;
    }

    startTransition(async () => {
      try {
        await createPurchaseReturnAction({
          companyId,
          purchaseId,
          reason: returnReason,
          items: selectedItems,
        });
        setShowReturnModal(false);
        setReturnReason("");
        setReturnQuantities({});
        router.refresh();
      } catch (err: any) {
        setErrorMsg(err.message || "Error al procesar la devolución al proveedor.");
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Botón Devolución */}
      {isReversible && (
        <div className="pt-2 border-t border-border">
          <button
            type="button"
            onClick={() => {
              setErrorMsg(null);
              setShowReturnModal(true);
            }}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
          >
            Devolver al Proveedor
          </button>
        </div>
      )}

      {/* Historial de Devoluciones a Proveedores */}
      {returns && returns.length > 0 && (
        <div className="mt-6 space-y-3">
          <h3 className="font-bold text-sm text-foreground uppercase tracking-wide">
            Historial de Devoluciones a Proveedores ({returns.length})
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
                      Devolución Proveedor
                    </span>
                  </div>
                  <span className="font-bold text-foreground">
                    Monto a Reclamar: S/ {Number(ret.refund_expected).toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Motivo: <span className="font-medium text-foreground">{ret.reason}</span> ·{" "}
                  {new Date(ret.created_at).toLocaleString("es-PE")}
                </p>
                {ret.purchase_return_items && ret.purchase_return_items.length > 0 && (
                  <div className="pt-2 border-t border-border/50 text-xs space-y-1">
                    <p className="font-semibold text-muted-foreground">Ítems devueltos:</p>
                    {ret.purchase_return_items.map((ri: any) => (
                      <div key={ri.id} className="flex justify-between text-muted-foreground">
                        <span>
                          {ri.name_snapshot} ({Number(ri.quantity).toFixed(0)} unid.)
                        </span>
                        <span>S/ {Number(ri.line_total).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Devolución a Proveedor */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-foreground">Registrar Devolución al Proveedor</h3>
            <p className="text-xs text-muted-foreground">
              Seleccione la cantidad de mercadería que retornará físicamente al proveedor. Esta operación descontará
              el stock del almacén con un movimiento PURCHASE_RETURN_OUT.
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
                          Compradas: {Number(it.quantity).toFixed(0)} | Ya devueltas: {Number(it.already_returned || 0).toFixed(0)} | Disponibles: {rem.toFixed(0)}
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
                  Motivo de la Devolución al Proveedor *
                </label>
                <input
                  type="text"
                  required
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="Ej. Mercadería dañada en transporte, vencimiento próximo..."
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
                  {isPending ? "Procesando..." : "Confirmar Salida a Proveedor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
