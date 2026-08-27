"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { openCashSession, closeCashSession, createPosSale } from "./actions";
import { StatusChip } from "@/components/ui/status-chip";
import Link from "next/link";

interface Product {
  id: string;
  code: string;
  sku?: string | null;
  barcode?: string | null;
  name: string;
  price: number;
  type: string;
  allows_inventory: boolean;
  tax_type: string;
}

interface Customer {
  id: string;
  name: string;
  doc_type: string;
  doc_number: string;
}

interface CartItem {
  product: Product;
  quantity: number;
  discount: number;
}

export function TerminalClient({
  companyId,
  branchId,
  branches,
  warehouses,
  cashRegisters,
  activeSession,
  products,
  initialBalances,
  customers,
}: {
  companyId: string;
  branchId?: string;
  branches: Array<{ id: string; name: string; code: string }>;
  warehouses: Array<{ id: string; name: string; code: string; branch_id?: string | null; is_default: boolean }>;
  cashRegisters: Array<{ id: string; name: string; code: string; status: string; branch_id: string }>;
  activeSession: any;
  products: Product[];
  initialBalances: Record<string, number>;
  customers: Customer[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // State
  const [selectedBranchId, setSelectedBranchId] = useState(branchId || branches[0]?.id || "");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(
    warehouses.find((w) => w.branch_id === selectedBranchId)?.id || warehouses.find((w) => w.is_default)?.id || warehouses[0]?.id || ""
  );
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Open / Close session modals
  const [showOpenModal, setShowOpenModal] = useState(!activeSession);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [openRegisterId, setOpenRegisterId] = useState(
    cashRegisters.find((r) => r.branch_id === selectedBranchId)?.id || cashRegisters[0]?.id || ""
  );
  const [openingAmount, setOpeningAmount] = useState<number>(0);
  const [declaredCash, setDeclaredCash] = useState<number>(0);

  // Payment modal state
  const [showPayModal, setShowPayModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "transfer" | "digital">("cash");
  const [receivedAmount, setReceivedAmount] = useState<number>(0);
  const [lastSaleResult, setLastSaleResult] = useState<any>(null);

  // Filter products by branch and search
  const filteredProducts = products.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.barcode && p.barcode.toLowerCase().includes(q))
    );
  });

  // Cart calculations
  const subtotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity - item.discount), 0);
  const igv = subtotal * (0.18 / 1.18);
  const baseImponible = subtotal - igv;
  const total = subtotal;

  const change = Math.max(0, receivedAmount - total);

  // Add to cart
  const addToCart = (product: Product) => {
    setErrorMsg(null);
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      const currentStock = initialBalances[product.id] ?? 0;

      if (existing) {
        if (product.allows_inventory && existing.quantity + 1 > currentStock) {
          setErrorMsg(`Stock máximo disponible para ${product.name} es ${currentStock}`);
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        if (product.allows_inventory && currentStock < 1) {
          setErrorMsg(`No hay stock disponible para ${product.name}`);
          return prev;
        }
        return [...prev, { product, quantity: 1, discount: 0 }];
      }
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            const currentStock = initialBalances[item.product.id] ?? 0;
            if (item.product.allows_inventory && newQty > currentStock) {
              setErrorMsg(`Stock máximo disponible es ${currentStock}`);
              return item;
            }
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // Open Session Handler
  const handleOpenSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    startTransition(async () => {
      try {
        await openCashSession({
          companyId,
          branchId: selectedBranchId,
          cashRegisterId: openRegisterId,
          openingAmount,
        });
        setShowOpenModal(false);
        router.refresh();
      } catch (err: any) {
        setErrorMsg(err.message);
      }
    });
  };

  // Close Session Handler
  const handleCloseSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    startTransition(async () => {
      try {
        await closeCashSession({
          companyId,
          sessionId: activeSession.id,
          declaredCash,
        });
        setShowCloseModal(false);
        setShowOpenModal(true);
        router.refresh();
      } catch (err: any) {
        setErrorMsg(err.message);
      }
    });
  };

  // Confirm Sale Handler
  const handleConfirmSale = async () => {
    if (!activeSession) {
      setErrorMsg("Debes abrir un turno de caja antes de realizar una venta.");
      setShowOpenModal(true);
      return;
    }
    if (cart.length === 0) {
      setErrorMsg("El carrito está vacío.");
      return;
    }
    if (paymentMethod === "cash" && receivedAmount < total) {
      setErrorMsg("El monto recibido en efectivo es menor al total a cobrar.");
      return;
    }

    setErrorMsg(null);
    startTransition(async () => {
      try {
        const idempotencyKey = `sale_${companyId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const res = await createPosSale({
          companyId,
          branchId: selectedBranchId,
          warehouseId: selectedWarehouseId,
          cashSessionId: activeSession.id,
          customerId: selectedCustomerId || null,
          items: cart.map((i) => ({
            product_id: i.product.id,
            quantity: i.quantity,
            discount: i.discount,
          })),
          payments: [
            {
              payment_method: paymentMethod,
              amount: total,
              received_amount: paymentMethod === "cash" ? receivedAmount : total,
              change_amount: paymentMethod === "cash" ? change : 0,
            },
          ],
          idempotencyKey,
        });

        setLastSaleResult(res.data);
        setCart([]);
        setShowPayModal(false);
        setReceivedAmount(0);
        router.refresh();
      } catch (err: any) {
        setErrorMsg(err.message);
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Top Banner: Active Session status */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
            POS
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-foreground">Terminal de Venta Rápida</h2>
              {activeSession ? (
                <StatusChip tone="success">Turno Abierto</StatusChip>
              ) : (
                <StatusChip tone="danger">Caja Cerrada</StatusChip>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {activeSession
                ? `Caja: ${activeSession.cash_registers?.name || "General"} | Esperado en caja: S/ ${Number(activeSession.expected_cash).toFixed(2)}`
                : "Abre un turno de caja para emitir ventas"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeSession ? (
            <button
              onClick={() => {
                setDeclaredCash(Number(activeSession.expected_cash));
                setShowCloseModal(true);
              }}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border text-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
            >
              Cerrar Turno (Arqueo)
            </button>
          ) : (
            <button
              onClick={() => setShowOpenModal(true)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Abrir Turno de Caja
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-xs hover:underline">
            Cerrar
          </button>
        </div>
      )}

      {/* Main Grid: Products vs Cart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Product Catalog */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Buscar por nombre, código, SKU o código de barras..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[600px] overflow-y-auto pr-1">
            {filteredProducts.map((prod) => {
              const stock = initialBalances[prod.id] ?? 0;
              const hasStock = !prod.allows_inventory || stock > 0;
              return (
                <button
                  key={prod.id}
                  onClick={() => hasStock && addToCart(prod)}
                  disabled={!hasStock || !activeSession}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between min-h-[110px] ${
                    hasStock && activeSession
                      ? "border-border bg-card hover:border-primary/50 hover:shadow-sm"
                      : "border-border/40 bg-muted/30 opacity-60 cursor-not-allowed"
                  }`}
                >
                  <div>
                    <span className="text-xs font-mono text-muted-foreground">{prod.code}</span>
                    <h4 className="font-semibold text-sm text-foreground line-clamp-2 leading-tight mt-0.5">
                      {prod.name}
                    </h4>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                    <span className="font-bold text-primary text-sm">S/ {Number(prod.price).toFixed(2)}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {prod.allows_inventory ? `Stock: ${stock}` : "Servicio"}
                    </span>
                  </div>
                </button>
              );
            })}
            {filteredProducts.length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground text-sm">
                No se encontraron productos coincidentes.
              </div>
            )}
          </div>
        </div>

        {/* Right: Cart & Checkout */}
        <div className="lg:col-span-5 rounded-2xl border border-border bg-card shadow-sm p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="font-bold text-foreground">Comprobante de Venta</h3>
            <span className="text-xs text-muted-foreground font-medium">{cart.length} líneas</span>
          </div>

          {/* Customer Selector */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Cliente (Opcional)</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
            >
              <option value="">Cliente General / Venta Libre</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.doc_type}: {c.doc_number})
                </option>
              ))}
            </select>
          </div>

          {/* Cart Items List */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {cart.map((item) => (
              <div
                key={item.product.id}
                className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-background text-sm"
              >
                <div className="flex-1 min-w-0 pr-2">
                  <p className="font-semibold text-foreground truncate">{item.product.name}</p>
                  <p className="text-xs text-muted-foreground">S/ {Number(item.product.price).toFixed(2)} c/u</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center border border-border rounded-md">
                    <button
                      onClick={() => updateQuantity(item.product.id, -1)}
                      className="px-2 py-0.5 text-xs font-bold hover:bg-muted"
                    >
                      -
                    </button>
                    <span className="px-2 text-xs font-bold">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, 1)}
                      className="px-2 py-0.5 text-xs font-bold hover:bg-muted"
                    >
                      +
                    </button>
                  </div>
                  <span className="font-bold text-foreground w-16 text-right">
                    S/ {(item.product.price * item.quantity).toFixed(2)}
                  </span>
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="text-muted-foreground hover:text-destructive text-xs ml-1"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
            {cart.length === 0 && (
              <div className="py-8 text-center text-muted-foreground text-xs">
                Selecciona productos del catálogo para agregarlos al ticket.
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="space-y-1.5 border-t border-border pt-3 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Op. Gravadas (Base)</span>
              <span>S/ {baseImponible.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>I.G.V. (18%)</span>
              <span>S/ {igv.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-black text-foreground pt-2 border-t border-border">
              <span>TOTAL A COBRAR</span>
              <span className="text-primary">S/ {total.toFixed(2)}</span>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={() => {
              setReceivedAmount(total);
              setShowPayModal(true);
            }}
            disabled={cart.length === 0 || !activeSession || isPending}
            className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-black text-base shadow-md hover:bg-primary/90 disabled:opacity-50 transition-all"
          >
            COBRAR S/ {total.toFixed(2)}
          </button>
        </div>
      </div>

      {/* MODAL: Abrir Turno de Caja */}
      {showOpenModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-lg text-foreground">Apertura de Turno de Caja</h3>
            <p className="text-xs text-muted-foreground">
              Selecciona la caja física e ingresa el monto de efectivo inicial para comenzar a vender.
            </p>

            <form onSubmit={handleOpenSession} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Caja Registradora</label>
                <select
                  value={openRegisterId}
                  onChange={(e) => setOpenRegisterId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                  required
                >
                  {cashRegisters.map((reg) => (
                    <option key={reg.id} value={reg.id}>
                      {reg.name} ({reg.code}) - {reg.status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Monto Inicial (S/)</label>
                <input
                  type="number"
                  step="0.10"
                  min="0"
                  value={openingAmount}
                  onChange={(e) => setOpeningAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-bold"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                {activeSession && (
                  <button
                    type="button"
                    onClick={() => setShowOpenModal(false)}
                    className="px-4 py-2 text-xs font-semibold border border-border rounded-lg"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 text-xs font-semibold bg-primary text-primary-foreground rounded-lg"
                >
                  {isPending ? "Abriendo..." : "Abrir Turno"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Cerrar Turno de Caja (Arqueo) */}
      {showCloseModal && activeSession && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-lg text-foreground">Cierre y Arqueo de Turno</h3>
            <div className="p-3 rounded-lg bg-muted/40 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monto de Apertura:</span>
                <span className="font-semibold">S/ {Number(activeSession.opening_amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Efectivo Esperado:</span>
                <span className="font-bold text-primary">S/ {Number(activeSession.expected_cash).toFixed(2)}</span>
              </div>
            </div>

            <form onSubmit={handleCloseSession} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Efectivo Real en Caja (Declarado)
                </label>
                <input
                  type="number"
                  step="0.10"
                  min="0"
                  value={declaredCash}
                  onChange={(e) => setDeclaredCash(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-bold"
                  required
                />
              </div>

              {declaredCash !== Number(activeSession.expected_cash) && (
                <p className="text-xs font-medium text-warning">
                  Diferencia detectada: S/ {(declaredCash - Number(activeSession.expected_cash)).toFixed(2)}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  className="px-4 py-2 text-xs font-semibold border border-border rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 text-xs font-semibold bg-destructive text-destructive-foreground rounded-lg"
                >
                  {isPending ? "Cerrando..." : "Confirmar Cierre"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Cobro y Pago */}
      {showPayModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="font-bold text-lg text-foreground">Cobrar Venta</h3>
              <span className="text-2xl font-black text-primary">S/ {total.toFixed(2)}</span>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-2">Medio de Pago</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: "cash", label: "Efectivo" },
                  { id: "card", label: "Tarjeta" },
                  { id: "digital", label: "Yape / Plin" },
                  { id: "transfer", label: "Transferencia" },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(m.id as any);
                      if (m.id !== "cash") setReceivedAmount(total);
                    }}
                    className={`py-2 px-1 text-xs font-bold rounded-lg border text-center transition-all ${
                      paymentMethod === m.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cash details */}
            {paymentMethod === "cash" && (
              <div className="space-y-3 p-3 bg-muted/30 rounded-xl border border-border">
                <label className="text-xs font-semibold text-muted-foreground block">Monto Recibido (S/)</label>
                <input
                  type="number"
                  step="0.50"
                  value={receivedAmount}
                  onChange={(e) => setReceivedAmount(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-lg font-black text-foreground"
                />

                {/* Quick cash pills */}
                <div className="flex gap-2 flex-wrap">
                  {[total, 10, 20, 50, 100].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setReceivedAmount(amt >= total ? amt : total)}
                      className="px-2.5 py-1 rounded-md bg-card border border-border text-xs font-semibold hover:bg-muted"
                    >
                      S/ {amt.toFixed(2)}
                    </button>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-border">
                  <span className="font-semibold text-sm">Vuelto a entregar:</span>
                  <span className="font-black text-lg text-success">S/ {change.toFixed(2)}</span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setShowPayModal(false)}
                className="px-4 py-2.5 text-xs font-semibold border border-border rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmSale}
                disabled={isPending || (paymentMethod === "cash" && receivedAmount < total)}
                className="px-6 py-2.5 text-sm font-bold bg-primary text-primary-foreground rounded-xl shadow-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {isPending ? "Confirmando Venta..." : "Confirmar e Imprimir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Venta Exitosa & Comprobante */}
      {lastSaleResult && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-center">
            <div className="h-12 w-12 rounded-full bg-success/20 text-success flex items-center justify-center mx-auto text-xl font-black">
              ✓
            </div>
            <h3 className="font-bold text-lg text-foreground">¡Venta Completada con Éxito!</h3>
            <p className="text-sm font-mono text-primary font-bold">{lastSaleResult.document_number}</p>
            <p className="text-xs text-muted-foreground">
              Total Cobrado: <strong className="text-foreground">S/ {Number(lastSaleResult.total).toFixed(2)}</strong>
              {Number(lastSaleResult.change_amount) > 0 && ` | Vuelto: S/ ${Number(lastSaleResult.change_amount).toFixed(2)}`}
            </p>

            <div className="flex gap-2 justify-center pt-3">
              <Link
                href={`/app/pos/sales/${lastSaleResult.sale_id}/receipt`}
                target="_blank"
                className="px-4 py-2 text-xs font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                Ver / Imprimir Ticket
              </Link>
              <button
                onClick={() => setLastSaleResult(null)}
                className="px-4 py-2 text-xs font-semibold border border-border rounded-lg"
              >
                Nueva Venta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
