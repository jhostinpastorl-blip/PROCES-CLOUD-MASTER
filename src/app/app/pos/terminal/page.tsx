import { getResolvedContext } from "@/lib/company/resolve";
import { requireModule } from "@/lib/modules/entitlements";
import { createClient } from "@/lib/supabase/server";
import { PosSubNav } from "../components/PosSubNav";
import { TerminalClient } from "./terminal-client";

export default async function PosTerminalPage() {
  const ctx = await getResolvedContext();
  if (!ctx) return <div>No hay contexto de empresa activo.</div>;

  await requireModule(ctx.company.companyId, "pos");

  const supabase = await createClient();

  // 1. Obtener sucursales
  const { data: branches } = await supabase
    .from("branches")
    .select("id, name, code")
    .eq("company_id", ctx.company.companyId)
    .eq("is_active", true)
    .order("name");

  const currentBranchId = ctx.branch?.id || branches?.[0]?.id;

  // 2. Obtener cajas de la sucursal
  const { data: cashRegisters } = await supabase
    .from("cash_registers")
    .select("id, name, code, status, branch_id")
    .eq("company_id", ctx.company.companyId)
    .eq("is_active", true);

  // 3. Obtener almacenes
  const { data: warehouses } = await supabase
    .from("warehouses")
    .select("id, name, code, branch_id, is_default")
    .eq("company_id", ctx.company.companyId)
    .eq("is_active", true);

  // 4. Buscar sesión de caja activa para el usuario y sucursal
  const { data: activeSession } = await supabase
    .from("cash_sessions")
    .select("*, cash_registers(name, code)")
    .eq("company_id", ctx.company.companyId)
    .eq("branch_id", currentBranchId)
    .eq("status", "open")
    .order("opened_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 5. Cargar catálogo de productos y stock del almacén
  const defaultWarehouse = warehouses?.find((w) => w.branch_id === currentBranchId) || warehouses?.find((w) => w.is_default) || warehouses?.[0];

  const { data: products } = await supabase
    .from("products")
    .select("id, code, sku, barcode, name, price, type, allows_inventory, tax_type")
    .eq("company_id", ctx.company.companyId)
    .eq("is_active", true)
    .order("name");

  let balancesMap: Record<string, number> = {};
  if (defaultWarehouse) {
    const { data: balances } = await supabase
      .from("inventory_balances")
      .select("product_id, quantity")
      .eq("company_id", ctx.company.companyId)
      .eq("warehouse_id", defaultWarehouse.id);

    if (balances) {
      for (const b of balances) {
        balancesMap[b.product_id] = Number(b.quantity);
      }
    }
  }

  // 6. Cargar clientes
  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, doc_type, doc_number")
    .eq("company_id", ctx.company.companyId)
    .eq("is_active", true)
    .order("name")
    .limit(50);

  return (
    <div className="space-y-4">
      <PosSubNav activePath="/app/pos/terminal" />
      <TerminalClient
        companyId={ctx.company.companyId}
        branchId={currentBranchId}
        branches={branches || []}
        warehouses={warehouses || []}
        cashRegisters={cashRegisters || []}
        activeSession={activeSession}
        products={products || []}
        initialBalances={balancesMap}
        customers={customers || []}
      />
    </div>
  );
}
