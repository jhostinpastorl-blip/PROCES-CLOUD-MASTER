"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
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

interface PaymentLine {
  id: string;
  method: "cash" | "card" | "transfer" | "digital";
  amount: number;
  receivedAmount?: number;
  reference?: string;
}

interface SuspendedTicket {
  id: number;
  label: string;
  cart: CartItem[];
  customerId: string;
}

// Decimal precision helper for retail money math
function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
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
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Active Context
  const [selectedBranchId] = useState(branchId || branches[0]?.id || "");
  const [selectedWarehouseId] = useState(
    warehouses.find((w) => w.branch_id === selectedBranchId)?.id || warehouses.find((w) => w.is_default)?.id || warehouses[0]?.id || ""
  );

  // Multi-cart state (Ventas en espera / Parked sales)
  const [activeTicketId, setActiveTicketId] = useState<number>(1);
  const [tickets, setTickets] = useState<SuspendedTicket[]>([
    { id: 1, label: "Ticket 1", cart: [], customerId: "" },
    { id: 2, label: "Ticket 2", cart: [], customerId: "" },
    { id: 3, label: "Ticket 3", cart: [], customerId: "" },
  ]);

  const currentTicket = tickets.find((t) => t.id === activeTicketId) || tickets[0];
  const cart = currentTicket.cart;
  const selectedCustomerId = currentTicket.customerId;

  const [search, setSearch] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals state
  const [showOpenModal, setShowOpenModal] = useState(!activeSession);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [openRegisterId, setOpenRegisterId] = useState(
    cashRegisters.find((r) => r.branch_id === selectedBranchId)?.id || cashRegisters[0]?.id || ""
  );
  const [openingAmount, setOpeningAmount] = useState<number>(0);
  const [declaredCash, setDeclaredCash] = useState<number>(0);

  // Payment modal state (Mixed Payments UI)
  const [showPayModal, setShowPayModal] = useState(false);
  const [paymentMode, setPaymentMode] = useState<"single" | "mixed">("single");
  const [singleMethod, setSingleMethod] = useState<"cash" | "card" | "transfer" | "digital">("cash");
  const [singleReceived, setSingleReceived] = useState<number>(0);
  const [paymentLines, setPaymentLines] = useState<PaymentLine[]>([]);
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);
  const [lastSaleResult, setLastSaleResult] = useState<any>(null);

  // Focus Search input helper
  const focusSearchInput = useCallback(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Keyboard Shortcuts Listener (F2, F4, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape: Close active modals
      if (e.key === "Escape") {
        if (showPayModal) {
          setShowPayModal(false);
          focusSearchInput();
        } else if (showCloseModal) {
          setShowCloseModal(false);
          focusSearchInput();
        } else if (lastSaleResult) {
          setLastSaleResult(null);
          focusSearchInput();
        } else if (search) {
          setSearch("");
          focusSearchInput();
        }
        return;
      }

      // F2: Focus Barcode / Search input
      if (e.key === "F2") {
        e.preventDefault();
        focusSearchInput();
        return;
      }

      // F4: Open Payment Modal
      if (e.key === "F4") {
        e.preventDefault();
        if (cart.length > 0 && activeSession && !showPayModal) {
          openCheckoutModal();
        }
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showPayModal, showCloseModal, lastSaleResult, search, cart, activeSession, focusSearchInput]);

  // Cart Calculations
  const subtotal = round2(cart.reduce((acc, item) => acc + (item.product.price * item.quantity - item.discount), 0));
  const igv = round2(subtotal * (0.18 / 1.18));
  const baseImponible = round2(subtotal - igv);
  const total = subtotal;

  // Single mode change calculation
  const singleChange = round2(Math.max(0, singleReceived - total));

  // Mixed mode sum calculations
  const mixedPaidTotal = round2(paymentLines.reduce((acc, line) => acc + (Number(line.amount) || 0), 0));
  const mixedRemaining = round2(total - mixedPaidTotal);

  // Cart mutators updating current active ticket
  const updateCurrentTicket = (updater: (prev: SuspendedTicket) => SuspendedTicket) => {
    setTickets((prev) => prev.map((t) => (t.id === activeTicketId ? updater(t) : t)));
  };

  const setSelectedCustomerId = (custId: string) => {
    updateCurrentTicket((prev) => ({ ...prev, customerId: custId }));
  };

  // Add Product to Cart (or increment quantity if already exists)
  const addToCart = (product: Product) => {
    setErrorMsg(null);
    updateCurrentTicket((prev) => {
      const existing = prev.cart.find((item) => item.product.id === product.id);
      const currentStock = initialBalances[product.id] ?? 0;

      if (existing) {
        if (product.allows_inventory && existing.quantity + 1 > currentStock) {
          setErrorMsg(`Stock máximo disponible para ${product.name} es ${currentStock}`);
          return prev;
        }
        return {
          ...prev,
          cart: prev.cart.map((item) =>
            item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
          ),
        };
      } else {
        if (product.allows_inventory && currentStock < 1) {
          setErrorMsg(`No hay stock disponible para ${product.name}`);
          return prev;
        }
        return {
          ...prev,
          cart: [...prev.cart, { product, quantity: 1, discount: 0 }],
        };
      }
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setErrorMsg(null);
    updateCurrentTicket((prev) => ({
      ...prev,
      cart: prev.cart
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
        .filter(Boolean) as CartItem[],
    }));
  };

  const removeFromCart = (productId: string) => {
    updateCurrentTicket((prev) => ({
      ...prev,
      cart: prev.cart.filter((item) => item.product.id !== productId),
    }));
  };

  const clearCart = () => {
    updateCurrentTicket((prev) => ({ ...prev, cart: [] }));
    focusSearchInput();
  };

  // Barcode / Search Enter handler for continuous scanning without losing focus
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && search.trim()) {
      e.preventDefault();
      const q = search.trim().toLowerCase();

      // Find exact match by barcode, SKU or code first
      const exactMatch = products.find(
        (p) =>
          (p.barcode && p.barcode.toLowerCase() === q) ||
          (p.sku && p.sku.toLowerCase() === q) ||
          p.code.toLowerCase() === q
      );

      if (exactMatch) {
        addToCart(exactMatch);
        setSearch("");
        setSuccessMsg(`Agregado: ${exactMatch.name}`);
        setTimeout(() => setSuccessMsg(null), 2000);
      } else {
        // If 1 filtered product matches name
        const matches = products.filter((p) => p.name.toLowerCase().includes(q));
        if (matches.length === 1) {
          addToCart(matches[0]);
          setSearch("");
          setSuccessMsg(`Agregado: ${matches[0].name}`);
          setTimeout(() => setSuccessMsg(null), 2000);
        } else if (matches.length === 0) {
          setErrorMsg(`Código o producto '${search}' no encontrado.`);
        }
      }
    }
  };

  // Filter products for catalog grid
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

  // Open Checkout Modal
  const openCheckoutModal = () => {
    if (!activeSession) {
      setErrorMsg("Debes abrir un turno de caja antes de realizar una venta.");
      setShowOpenModal(true);
      return;
    }
    if (cart.length === 0) {
      setErrorMsg("El carrito de venta está vacío.");
      return;
    }
    setErrorMsg(null);
    setSingleReceived(total);
    setPaymentLines([
      { id: "1", method: "cash", amount: round2(total * 0.5) || total, receivedAmount: round2(total * 0.5) || total },
      { id: "2", method: "digital", amount: round2(total * 0.5) || 0, reference: "" },
    ]);
    setShowPayModal(true);
  };

  // Mixed Payment Line Management
  const addPaymentLine = () => {
    const remaining = Math.max(0, mixedRemaining);
    setPaymentLines((prev) => [
      ...prev,
      { id: Date.now().toString(), method: "card", amount: remaining, reference: "" },
    ]);
  };

  const updatePaymentLine = (id: string, updates: Partial<PaymentLine>) => {
    setPaymentLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)));
  };

  const removePaymentLine = (id: string) => {
    if (paymentLines.length <= 1) return;
    setPaymentLines((prev) => prev.filter((l) => l.id !== id));
  };

  // Confirm Sale Handler with Double-Submit Guard
  const handleConfirmSale = async () => {
    if (isSubmittingSale || isPending) return;

    if (!activeSession) {
      setErrorMsg("Debes abrir un turno de caja antes de realizar una venta.");
      setShowOpenModal(true);
      return;
    }
    if (cart.length === 0) {
      setErrorMsg("El carrito está vacío.");
      return;
    }

    let finalPayments: Array<{
      payment_method: "cash" | "card" | "transfer" | "digital";
      amount: number;
      received_amount?: number;
      change_amount?: number;
      reference?: string | null;
    }> = [];

    if (paymentMode === "single") {
      if (singleMethod === "cash" && singleReceived < total) {
        setErrorMsg("El monto recibido en efectivo es menor al total a cobrar.");
        return;
      }
      finalPayments = [
        {
          payment_method: singleMethod,
          amount: total,
          received_amount: singleMethod === "cash" ? singleReceived : total,
          change_amount: singleMethod === "cash" ? singleChange : 0,
        },
      ];
    } else {
      // Mixed mode validation
      if (Math.abs(mixedRemaining) > 0.01) {
        setErrorMsg(`La suma de pagos (S/ ${mixedPaidTotal.toFixed(2)}) no coincide con el total (S/ ${total.toFixed(2)}). Diferencia: S/ ${mixedRemaining.toFixed(2)}`);
        return;
      }
      finalPayments = paymentLines.map((line) => {
        const amt = Number(line.amount) || 0;
        const rec = line.method === "cash" ? Number(line.receivedAmount || amt) : amt;
        const chg = line.method === "cash" ? round2(Math.max(0, rec - amt)) : 0;
        return {
          payment_method: line.method,
          amount: amt,
          received_amount: rec,
          change_amount: chg,
          reference: line.reference || null,
        };
      });
    }

    setIsSubmittingSale(true);
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
          payments: finalPayments,
          idempotencyKey,
        });

        setLastSaleResult(res.data);
        clearCart();
        setShowPayModal(false);
        setSingleReceived(0);
        router.refresh();
      } catch (err: any) {
        setErrorMsg(err.message || "Error al procesar la venta. El carrito se ha conservado.");
      } finally {
        setIsSubmittingSale(false);
      }
    });
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

  return (
    <div className="space-y-4">
      {/* Top Banner: Status & Shortcuts Guide */}
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

        {/* Shortcuts pills & Session actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-lg border border-border">
            <span className="font-bold text-foreground">Atajos:</span>
            <kbd className="px-1.5 py-0.5 rounded bg-background border text-[10px] font-mono">[F2] Buscar</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-background border text-[10px] font-mono">[F4] Cobrar</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-background border text-[10px] font-mono">[ESC] Cerrar</kbd>
          </div>

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

      {/* Error & Success Feedback Banners */}
      {errorMsg && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-xs hover:underline font-bold">
            Cerrar [ESC]
          </button>
        </div>
      )}
      {successMsg && (
        <div className="p-2.5 rounded-lg bg-success/10 border border-success/20 text-success text-xs font-semibold flex items-center justify-between">
          <span>✓ {successMsg}</span>
        </div>
      )}

      {/* Main Grid: Catalog vs Cart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Product Catalog & Continuous Search/Scanner */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Escanear código de barras o buscar producto [F2]..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-sm"
              autoFocus
            />
            {search && (
              <button
                onClick={() => {
                  setSearch("");
                  focusSearchInput();
                }}
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground text-xs font-bold"
              >
                Limpiar [ESC]
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[600px] overflow-y-auto pr-1">
            {filteredProducts.map((prod) => {
              const stock = initialBalances[prod.id] ?? 0;
              const hasStock = !prod.allows_inventory || stock > 0;
              return (
                <button
                  key={prod.id}
                  onClick={() => {
                    if (hasStock && activeSession) {
                      addToCart(prod);
                      focusSearchInput();
                    }
                  }}
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
                No se encontraron productos coincidentes con '{search}'.
              </div>
            )}
          </div>
        </div>

        {/* Right: Cart, Parked Tickets & Checkout */}
        <div className="lg:col-span-5 rounded-2xl border border-border bg-card shadow-sm p-4 space-y-4">
          {/* Parked Tickets Bar (Ventas en espera) */}
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-1.5">
              {tickets.map((t) => {
                const isActive = t.id === activeTicketId;
                const count = t.cart.length;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setActiveTicketId(t.id);
                      focusSearchInput();
                    }}
                    className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all ${
                      isActive
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {t.label} {count > 0 && `(${count})`}
                  </button>
                );
              })}
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-destructive hover:underline font-semibold"
              >
                Vaciar
              </button>
            )}
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
          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
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
                    S/ {round2(item.product.price * item.quantity).toFixed(2)}
                  </span>
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="text-muted-foreground hover:text-destructive text-xs ml-1 font-bold"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
            {cart.length === 0 && (
              <div className="py-8 text-center text-muted-foreground text-xs">
                Escanea códigos de barras o selecciona productos del catálogo.
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

          {/* Checkout Action Button */}
          <button
            onClick={openCheckoutModal}
            disabled={cart.length === 0 || !activeSession || isPending}
            className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-black text-base shadow-md hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            <span>COBRAR S/ {total.toFixed(2)}</span>
            <kbd className="px-2 py-0.5 text-xs font-mono bg-primary-foreground/20 rounded">[F4]</kbd>
          </button>
        </div>
      </div>

      {/* MODAL: Apertura de Turno */}
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

      {/* MODAL: COBRO Y PAGOS (Soporte de Pago Simple y Cobro Mixto) */}
      {showPayModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-lg text-foreground">Cobrar Venta</h3>
                <p className="text-xs text-muted-foreground">Selecciona el método o divide el cobro en partes</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted-foreground block font-bold">TOTAL A COBRAR</span>
                <span className="text-2xl font-black text-primary">S/ {total.toFixed(2)}</span>
              </div>
            </div>

            {/* Toggle Single vs Mixed Mode */}
            <div className="flex rounded-lg bg-muted p-1 border border-border">
              <button
                type="button"
                onClick={() => setPaymentMode("single")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                  paymentMode === "single" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Pago Simple (1 Medio)
              </button>
              <button
                type="button"
                onClick={() => setPaymentMode("mixed")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                  paymentMode === "mixed" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Cobro Mixto (Múltiples Medios)
              </button>
            </div>

            {/* MODE 1: PAGO SIMPLE */}
            {paymentMode === "single" && (
              <div className="space-y-4">
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
                          setSingleMethod(m.id as any);
                          if (m.id !== "cash") setSingleReceived(total);
                        }}
                        className={`py-2 px-1 text-xs font-bold rounded-lg border text-center transition-all ${
                          singleMethod === m.id
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border text-foreground hover:bg-muted"
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {singleMethod === "cash" && (
                  <div className="space-y-3 p-3 bg-muted/30 rounded-xl border border-border">
                    <label className="text-xs font-semibold text-muted-foreground block">Monto Recibido en Efectivo (S/)</label>
                    <input
                      type="number"
                      step="0.50"
                      value={singleReceived}
                      onChange={(e) => setSingleReceived(Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-lg font-black text-foreground"
                      autoFocus
                    />

                    {/* Quick cash pills */}
                    <div className="flex gap-2 flex-wrap">
                      {[total, 10, 20, 50, 100, 200].filter((amt) => amt >= total || [10, 20, 50, 100, 200].includes(amt)).slice(0, 6).map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setSingleReceived(amt >= total ? amt : total)}
                          className="px-2.5 py-1 rounded-md bg-card border border-border text-xs font-semibold hover:bg-muted"
                        >
                          S/ {amt.toFixed(2)}
                        </button>
                      ))}
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-border">
                      <span className="font-semibold text-sm">Vuelto a entregar:</span>
                      <span className="font-black text-lg text-success">S/ {singleChange.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MODE 2: COBRO MIXTO */}
            {paymentMode === "mixed" && (
              <div className="space-y-3">
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {paymentLines.map((line, idx) => (
                    <div key={line.id} className="p-3 rounded-lg border border-border bg-background space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-muted-foreground">Pago #{idx + 1}</span>
                        {paymentLines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePaymentLine(line.id)}
                            className="text-xs text-destructive hover:underline font-bold"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] font-semibold text-muted-foreground block mb-0.5">Medio</label>
                          <select
                            value={line.method}
                            onChange={(e) => updatePaymentLine(line.id, { method: e.target.value as any })}
                            className="w-full px-2 py-1.5 text-xs rounded border border-border bg-background"
                          >
                            <option value="cash">Efectivo</option>
                            <option value="card">Tarjeta</option>
                            <option value="digital">Yape / Plin</option>
                            <option value="transfer">Transferencia</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-semibold text-muted-foreground block mb-0.5">Monto (S/)</label>
                          <input
                            type="number"
                            step="0.10"
                            min="0"
                            value={line.amount}
                            onChange={(e) => updatePaymentLine(line.id, { amount: Number(e.target.value) })}
                            className="w-full px-2 py-1.5 text-xs rounded border border-border bg-background font-bold"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-semibold text-muted-foreground block mb-0.5">
                            {line.method === "cash" ? "Recibido Efectivo" : "Referencia / Op."}
                          </label>
                          {line.method === "cash" ? (
                            <input
                              type="number"
                              step="0.50"
                              min="0"
                              placeholder="Recibido"
                              value={line.receivedAmount || line.amount}
                              onChange={(e) => updatePaymentLine(line.id, { receivedAmount: Number(e.target.value) })}
                              className="w-full px-2 py-1.5 text-xs rounded border border-border bg-background font-mono"
                            />
                          ) : (
                            <input
                              type="text"
                              placeholder="Nro. operación"
                              value={line.reference || ""}
                              onChange={(e) => updatePaymentLine(line.id, { reference: e.target.value })}
                              className="w-full px-2 py-1.5 text-xs rounded border border-border bg-background font-mono"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addPaymentLine}
                  className="w-full py-1.5 rounded-lg border border-dashed border-border text-xs font-bold text-primary hover:bg-primary/5 transition-colors"
                >
                  + Agregar Otro Medio de Pago
                </button>

                {/* Mixed Summary Status */}
                <div className="p-3 bg-muted/40 rounded-xl space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Pagado:</span>
                    <span className="font-bold">S/ {mixedPaidTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span className="text-muted-foreground">Saldo Pendiente:</span>
                    <span className={mixedRemaining === 0 ? "text-success font-black" : "text-destructive font-black"}>
                      S/ {mixedRemaining.toFixed(2)} {mixedRemaining === 0 ? "✓ Cuadre Exacto" : "(Debe ser 0.00)"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setShowPayModal(false)}
                disabled={isSubmittingSale}
                className="px-4 py-2.5 text-xs font-semibold border border-border rounded-xl"
              >
                Cancelar [ESC]
              </button>
              <button
                type="button"
                onClick={handleConfirmSale}
                disabled={
                  isSubmittingSale ||
                  isPending ||
                  (paymentMode === "single" && singleMethod === "cash" && singleReceived < total) ||
                  (paymentMode === "mixed" && Math.abs(mixedRemaining) > 0.01)
                }
                className="px-6 py-2.5 text-sm font-bold bg-primary text-primary-foreground rounded-xl shadow-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmittingSale || isPending ? (
                  <span>Procesando venta...</span>
                ) : (
                  <>
                    <span>Confirmar e Imprimir</span>
                    <kbd className="px-1.5 py-0.5 text-[10px] bg-primary-foreground/20 rounded font-mono">[Enter]</kbd>
                  </>
                )}
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
                onClick={() => {
                  setLastSaleResult(null);
                  focusSearchInput();
                }}
                className="px-4 py-2 text-xs font-semibold border border-border rounded-lg"
              >
                Nueva Venta [ESC]
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
