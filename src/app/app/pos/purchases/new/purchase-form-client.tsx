"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPosPurchase } from "../actions";
import Link from "next/link";

interface Props {
  companyId: string;
  suppliers: Array<{ id: string; name: string; doc_type: string; doc_number: string }>;
  warehouses: Array<{ id: string; name: string; code: string; is_default: boolean }>;
  products: Array<{ id: string; code: string; sku: string | null; barcode: string | null; name: string; cost: number; price: number; tax_type: string; allows_inventory: boolean }>;
}

interface ItemRow {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitCost: number;
  taxType: string;
  currentCost: number;
}

export function PurchaseFormClient({ companyId, suppliers, warehouses, products }: Props) {
  const router = useRouter();

  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || "");
  const [warehouseId, setWarehouseId] = useState(warehouses.find(w => w.is_default)?.id || warehouses[0]?.id || "");
  const [docType, setDocType] = useState("FACTURA");
  const [docNumber, setDocNumber] = useState("");
  const [docDate, setDocDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  const [items, setItems] = useState<ItemRow[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAddItem = () => {
    if (!selectedProductId) return;
    const prod = products.find(p => p.id === selectedProductId);
    if (!prod) return;

    const existingIndex = items.findIndex(i => i.productId === prod.id);
    if (existingIndex >= 0) {
      const updated = [...items];
      updated[existingIndex].quantity += 1;
      setItems(updated);
    } else {
      setItems([
        ...items,
        {
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku || prod.code,
          quantity: 1,
          unitCost: Number(prod.cost) || 0,
          taxType: prod.tax_type,
          currentCost: Number(prod.cost) || 0,
        },
      ]);
    }
    setSelectedProductId("");
  };

  const handleUpdateItem = (index: number, field: "quantity" | "unitCost", value: number) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Subtotals
  let subtotal = 0;
  let taxTotal = 0;
  for (const item of items) {
    const lineSubtotal = item.quantity * item.unitCost;
    const lineTax = item.taxType === "igv_18" ? lineSubtotal * 0.18 : 0;
    subtotal += lineSubtotal;
    taxTotal += lineTax;
  }
  const total = subtotal + taxTotal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      setErrorMsg("Debe seleccionar un proveedor.");
      return;
    }
    if (!warehouseId) {
      setErrorMsg("Debe seleccionar un almacén de destino.");
      return;
    }
    if (items.length === 0) {
      setErrorMsg("Debe agregar al menos un producto a la compra.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const result = await createPosPurchase({
        companyId,
        warehouseId,
        supplierId,
        supplierDocType: docType,
        supplierDocNumber: docNumber || undefined,
        supplierDocDate: docDate || undefined,
        items: items.map(i => ({
          product_id: i.productId,
          quantity: Number(i.quantity),
          unit_cost: Number(i.unitCost),
        })),
        idempotencyKey: `pur-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        notes: notes || undefined,
      });

      router.push(`/app/pos/purchases/${result.data.purchase_id}`);
    } catch (err: any) {
      setErrorMsg(err.message || "Error al procesar la compra.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Registrar Nueva Compra</h2>
          <p className="text-sm text-muted-foreground">
            Ingreso de mercadería, recálculo atómico de costo promedio ponderado (CPP) y Kardex valorizado.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/app/pos/purchases"
            className="px-4 py-2 text-sm font-semibold rounded-lg border border-border hover:bg-muted"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading || items.length === 0}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Confirmando..." : "Confirmar & Ingresar Stock"}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
          {errorMsg}
        </div>
      )}

      {/* Cabecera Proveedor & Almacén */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl border border-border bg-card">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Proveedor *</label>
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-medium"
            required
          >
            <option value="">Seleccione proveedor...</option>
            {suppliers.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.doc_number})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Almacén de Ingreso *</label>
          <select
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-medium"
            required
          >
            <option value="">Seleccione almacén...</option>
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Tipo Doc.</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full px-2 py-2 rounded-lg border border-border bg-background text-sm"
            >
              <option value="FACTURA">Factura</option>
              <option value="BOLETA">Boleta</option>
              <option value="GUIA">Guía de Remisión</option>
              <option value="NOTA">Nota de Ingreso</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Nº Comprobante</label>
            <input
              type="text"
              value={docNumber}
              onChange={(e) => setDocNumber(e.target.value)}
              placeholder="F001-00123"
              className="w-full px-2.5 py-2 rounded-lg border border-border bg-background text-sm font-mono"
            />
          </div>
        </div>
      </div>

      {/* Selector de Producto */}
      <div className="flex gap-2 items-center p-4 rounded-xl border border-border bg-card">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Agregar Producto</label>
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-medium"
          >
            <option value="">Buscar o seleccionar producto...</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} [{p.sku || p.code}] - Costo Actual: S/ {Number(p.cost).toFixed(4)}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={handleAddItem}
          disabled={!selectedProductId}
          className="mt-5 px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          + Agregar Ítem
        </button>
      </div>

      {/* Items Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold text-xs">
            <tr>
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3 w-28 text-center">Cantidad</th>
              <th className="px-4 py-3 w-32 text-right">Costo Compra (S/)</th>
              <th className="px-4 py-3 text-right">Costo Actual (S/)</th>
              <th className="px-4 py-3 text-right">Subtotal</th>
              <th className="px-4 py-3 text-right">Total (+IGV)</th>
              <th className="px-4 py-3 w-16 text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border font-medium">
            {items.map((item, idx) => {
              const lineSubtotal = item.quantity * item.unitCost;
              const lineTax = item.taxType === "igv_18" ? lineSubtotal * 0.18 : 0;
              const lineTotal = lineSubtotal + lineTax;

              return (
                <tr key={idx} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-semibold text-foreground">{item.productName}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.sku}</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleUpdateItem(idx, "quantity", Math.max(1, Number(e.target.value)))}
                      className="w-full text-center px-2 py-1 rounded border border-border bg-background text-sm font-bold"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      step="0.0001"
                      min="0"
                      value={item.unitCost}
                      onChange={(e) => handleUpdateItem(idx, "unitCost", Math.max(0, Number(e.target.value)))}
                      className="w-full text-right px-2 py-1 rounded border border-border bg-background text-sm font-bold"
                    />
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground font-mono">
                    S/ {Number(item.currentCost).toFixed(4)}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    S/ {lineSubtotal.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-foreground">
                    S/ {lineTotal.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="text-xs text-destructive hover:underline font-semibold"
                    >
                      Quitar
                    </button>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground text-sm">
                  Agregue productos utilizando el selector superior para confeccionar la orden de compra.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="border-t border-border bg-muted/20 font-semibold">
            <tr>
              <td colSpan={6} className="px-4 py-2 text-right text-muted-foreground">
                Base Imponible:
              </td>
              <td className="px-4 py-2 text-right font-semibold">S/ {subtotal.toFixed(2)}</td>
              <td></td>
            </tr>
            <tr>
              <td colSpan={6} className="px-4 py-2 text-right text-muted-foreground">
                I.G.V. (18%):
              </td>
              <td className="px-4 py-2 text-right font-semibold">S/ {taxTotal.toFixed(2)}</td>
              <td></td>
            </tr>
            <tr className="text-base font-bold text-foreground border-t border-border">
              <td colSpan={6} className="px-4 py-3 text-right">
                TOTAL COMPRA:
              </td>
              <td className="px-4 py-3 text-right text-primary font-black">
                S/ {total.toFixed(2)}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </form>
  );
}
