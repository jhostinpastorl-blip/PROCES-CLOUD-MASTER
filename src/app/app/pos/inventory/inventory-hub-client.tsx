"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createInventoryAdjustmentAction, createInventoryTransferAction } from "./actions";
import { StatusChip } from "@/components/ui/status-chip";

interface Props {
  companyId: string;
  warehouses: Array<{ id: string; name: string; code: string; is_default: boolean }>;
  products: Array<{ id: string; code: string; sku: string | null; barcode: string | null; name: string; cost: number; price: number; tax_type: string; allows_inventory: boolean }>;
  initialBalances: any[];
  initialMovements: any[];
}

type TabType = "existencias" | "kardex" | "ajustes" | "transferencias";

export function InventoryHubClient({
  companyId,
  warehouses,
  products,
  initialBalances,
  initialMovements,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("existencias");

  // Filtros Existencias
  const [whFilter, setWhFilter] = useState<string>("all");
  const [searchProd, setSearchProd] = useState<string>("");

  // Filtros Kardex
  const [kardexProdId, setKardexProdId] = useState<string>(products[0]?.id || "");
  const [kardexWhId, setKardexWhId] = useState<string>("all");

  // Modal / Form Ajuste
  const [showAdjModal, setShowAdjModal] = useState(false);
  const [adjWarehouseId, setAdjWarehouseId] = useState(warehouses[0]?.id || "");
  const [adjReason, setAdjReason] = useState("");
  const [adjProductId, setAdjProductId] = useState(products[0]?.id || "");
  const [adjType, setAdjType] = useState<"IN" | "OUT">("IN");
  const [adjQty, setAdjQty] = useState<number>(1);
  const [adjNotes, setAdjNotes] = useState("");
  const [adjLoading, setAdjLoading] = useState(false);
  const [adjError, setAdjError] = useState<string | null>(null);

  // Modal / Form Transferencia
  const [showTrfModal, setShowTrfModal] = useState(false);
  const [trfSrcWhId, setTrfSrcWhId] = useState(warehouses[0]?.id || "");
  const [trfDstWhId, setTrfDstWhId] = useState(warehouses[1]?.id || warehouses[0]?.id || "");
  const [trfProductId, setTrfProductId] = useState(products[0]?.id || "");
  const [trfQty, setTrfQty] = useState<number>(1);
  const [trfNotes, setTrfNotes] = useState("");
  const [trfLoading, setTrfLoading] = useState(false);
  const [trfError, setTrfError] = useState<string | null>(null);

  // Filtrar existencias
  const filteredBalances = initialBalances.filter((b) => {
    if (whFilter !== "all" && b.warehouse_id !== whFilter) return false;
    if (searchProd) {
      const q = searchProd.toLowerCase();
      const pName = b.products?.name?.toLowerCase() || "";
      const pSku = b.products?.sku?.toLowerCase() || "";
      const pCode = b.products?.code?.toLowerCase() || "";
      if (!pName.includes(q) && !pSku.includes(q) && !pCode.includes(q)) return false;
    }
    return true;
  });

  // Filtrar movimientos Kardex
  const filteredMovements = initialMovements.filter((m) => {
    if (kardexProdId && m.product_id !== kardexProdId) return false;
    if (kardexWhId !== "all" && m.warehouse_id !== kardexWhId) return false;
    return true;
  });

  // Envío de Ajuste
  const handleCreateAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjReason.trim()) {
      setAdjError("El motivo del ajuste es obligatorio.");
      return;
    }
    setAdjLoading(true);
    setAdjError(null);

    try {
      await createInventoryAdjustmentAction({
        companyId,
        warehouseId: adjWarehouseId,
        reason: adjReason,
        items: [
          {
            product_id: adjProductId,
            adjustment_type: adjType,
            quantity: Number(adjQty),
            notes: adjNotes || undefined,
          },
        ],
        notes: adjNotes || undefined,
      });

      setShowAdjModal(false);
      setAdjReason("");
      setAdjNotes("");
      router.refresh();
    } catch (err: any) {
      setAdjError(err.message || "Error al registrar el ajuste.");
    } finally {
      setAdjLoading(false);
    }
  };

  // Envío de Transferencia
  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (trfSrcWhId === trfDstWhId) {
      setTrfError("El almacén origen y destino no pueden ser el mismo.");
      return;
    }
    setTrfLoading(true);
    setTrfError(null);

    try {
      await createInventoryTransferAction({
        companyId,
        sourceWarehouseId: trfSrcWhId,
        destinationWarehouseId: trfDstWhId,
        items: [
          {
            product_id: trfProductId,
            quantity: Number(trfQty),
          },
        ],
        notes: trfNotes || undefined,
      });

      setShowTrfModal(false);
      setTrfNotes("");
      router.refresh();
    } catch (err: any) {
      setTrfError(err.message || "Error al registrar la transferencia.");
    } finally {
      setTrfLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Inventario & Kardex Físico</h2>
          <p className="text-sm text-muted-foreground">
            Control de stock por almacén, movimientos inmutables, ajustes y transferencias internas.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowAdjModal(true)}
            className="px-3.5 py-2 text-sm font-semibold rounded-lg border border-border bg-card hover:bg-muted text-foreground transition-colors"
          >
            + Ajuste de Stock
          </button>
          <button
            type="button"
            onClick={() => setShowTrfModal(true)}
            className="px-3.5 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            + Transferir Stock
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border space-x-4">
        <button
          onClick={() => setActiveTab("existencias")}
          className={`pb-2.5 text-sm font-bold border-b-2 transition-colors ${
            activeTab === "existencias"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Existencias Actuales
        </button>
        <button
          onClick={() => setActiveTab("kardex")}
          className={`pb-2.5 text-sm font-bold border-b-2 transition-colors ${
            activeTab === "kardex"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Kardex Físico / Movimientos
        </button>
      </div>

      {/* TAB 1: EXISTENCIAS */}
      {activeTab === "existencias" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={searchProd}
              onChange={(e) => setSearchProd(e.target.value)}
              placeholder="Buscar por producto, SKU o código..."
              className="w-full sm:max-w-xs px-3 py-2 rounded-lg border border-border bg-background text-sm"
            />
            <select
              value={whFilter}
              onChange={(e) => setWhFilter(e.target.value)}
              className="w-full sm:max-w-xs px-3 py-2 rounded-lg border border-border bg-background text-sm font-medium"
            >
              <option value="all">Todos los Almacenes</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold text-xs">
                <tr>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Almacén</th>
                  <th className="px-4 py-3 text-right">Costo Promedio</th>
                  <th className="px-4 py-3 text-right">Precio Venta</th>
                  <th className="px-4 py-3 text-center">Stock Actual</th>
                  <th className="px-4 py-3 text-right">Valorización</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-medium">
                {filteredBalances.map((b) => {
                  const qty = Number(b.quantity);
                  const cost = Number(b.products?.cost) || 0;
                  const price = Number(b.products?.price) || 0;
                  const valuation = qty * cost;

                  return (
                    <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-semibold text-foreground">{b.products?.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {b.products?.sku || b.products?.code || "-"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{b.warehouses?.name}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">S/ {cost.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">S/ {price.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                            qty > 5
                              ? "bg-success/10 text-success"
                              : qty > 0
                              ? "bg-warning/10 text-warning"
                              : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {qty.toFixed(0)} un.
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-foreground">
                        S/ {valuation.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
                {filteredBalances.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground text-sm">
                      No se encontraron existencias para los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: KARDEX */}
      {activeTab === "kardex" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 p-4 rounded-xl border border-border bg-card">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Producto</label>
              <select
                value={kardexProdId}
                onChange={(e) => setKardexProdId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-medium"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} [{p.sku || p.code}]
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Almacén</label>
              <select
                value={kardexWhId}
                onChange={(e) => setKardexWhId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-medium"
              >
                <option value="all">Todos los Almacenes</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold text-xs">
                <tr>
                  <th className="px-4 py-3">Fecha y Hora</th>
                  <th className="px-4 py-3">Almacén</th>
                  <th className="px-4 py-3">Tipo de Movimiento</th>
                  <th className="px-4 py-3 text-right">Entrada (+)</th>
                  <th className="px-4 py-3 text-right">Salida (-)</th>
                  <th className="px-4 py-3 text-right">Costo Mov.</th>
                  <th className="px-4 py-3">Detalle / Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-medium">
                {filteredMovements.map((m) => {
                  const isIncoming = ["INITIAL_STOCK", "PURCHASE_IN", "IN_ADJUSTMENT", "TRANSFER_IN"].includes(
                    m.movement_type
                  );
                  const qty = Number(m.quantity);

                  return (
                    <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(m.created_at).toLocaleString("es-PE")}
                      </td>
                      <td className="px-4 py-3 text-xs">{m.warehouses?.name}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-bold text-primary">{m.movement_type}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-success font-bold font-mono">
                        {isIncoming ? `+${qty.toFixed(0)}` : "-"}
                      </td>
                      <td className="px-4 py-3 text-right text-destructive font-bold font-mono">
                        {!isIncoming ? `-${qty.toFixed(0)}` : "-"}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                        {m.unit_cost !== null ? `S/ ${Number(m.unit_cost).toFixed(2)}` : "-"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">
                        {m.notes || "-"}
                      </td>
                    </tr>
                  );
                })}
                {filteredMovements.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground text-sm">
                      No hay movimientos registrados para este producto.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL AJUSTE */}
      {showAdjModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-foreground">Ajuste de Stock</h3>
            <p className="text-xs text-muted-foreground">
              Ajuste físico manual positivo o negativo con motivo obligatorio para trazabilidad.
            </p>

            {adjError && (
              <div className="p-3 rounded bg-destructive/10 text-destructive text-xs font-medium border border-destructive/20">
                {adjError}
              </div>
            )}

            <form onSubmit={handleCreateAdjustment} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Almacén *</label>
                <select
                  value={adjWarehouseId}
                  onChange={(e) => setAdjWarehouseId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                  required
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Producto *</label>
                <select
                  value={adjProductId}
                  onChange={(e) => setAdjProductId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                  required
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} [{p.sku || p.code}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Tipo de Ajuste</label>
                  <select
                    value={adjType}
                    onChange={(e) => setAdjType(e.target.value as "IN" | "OUT")}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background font-bold"
                  >
                    <option value="IN">Entrada (+ Positivo)</option>
                    <option value="OUT">Salida (- Negativo)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Cantidad *</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={adjQty}
                    onChange={(e) => setAdjQty(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Motivo del Ajuste * (Obligatorio)
                </label>
                <input
                  type="text"
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  placeholder="Ej. Conteo físico de inventario, merma o daño..."
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdjModal(false)}
                  className="px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={adjLoading}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50"
                >
                  {adjLoading ? "Procesando..." : "Confirmar Ajuste"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TRANSFERENCIA */}
      {showTrfModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-foreground">Transferencia Interna entre Almacenes</h3>
            <p className="text-xs text-muted-foreground">
              Movimiento atómico de stock entre dos almacenes de la misma empresa (TRANSFER_OUT / TRANSFER_IN).
            </p>

            {trfError && (
              <div className="p-3 rounded bg-destructive/10 text-destructive text-xs font-medium border border-destructive/20">
                {trfError}
              </div>
            )}

            <form onSubmit={handleCreateTransfer} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Almacén Origen *</label>
                  <select
                    value={trfSrcWhId}
                    onChange={(e) => setTrfSrcWhId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                    required
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Almacén Destino *</label>
                  <select
                    value={trfDstWhId}
                    onChange={(e) => setTrfDstWhId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                    required
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Producto *</label>
                <select
                  value={trfProductId}
                  onChange={(e) => setTrfProductId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                  required
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} [{p.sku || p.code}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Cantidad a Transferir *</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={trfQty}
                  onChange={(e) => setTrfQty(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Notas (Opcional)</label>
                <input
                  type="text"
                  value={trfNotes}
                  onChange={(e) => setTrfNotes(e.target.value)}
                  placeholder="Ej. Reabastecimiento de tienda principal..."
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTrfModal(false)}
                  className="px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={trfLoading}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50"
                >
                  {trfLoading ? "Transfiriendo..." : "Confirmar Transferencia"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
