import { getResolvedContext } from "@/lib/company/resolve";
import { requireModule } from "@/lib/modules/entitlements";
import { createClient } from "@/lib/supabase/server";
import { PosSubNav } from "../components/PosSubNav";
import { InventoryHubClient } from "./inventory-hub-client";

export default async function PosInventoryPage() {
  const ctx = await getResolvedContext();
  if (!ctx) return <div>No hay contexto de empresa activo.</div>;

  await requireModule(ctx.company.companyId, "pos");

  const supabase = await createClient();

  // 1. Almacenes
  const { data: warehouses } = await supabase
    .from("warehouses")
    .select("id, name, code, is_default")
    .eq("company_id", ctx.company.companyId)
    .eq("is_active", true)
    .order("name");

  // 2. Productos inventariables
  const { data: products } = await supabase
    .from("products")
    .select("id, code, sku, barcode, name, cost, price, tax_type, allows_inventory")
    .eq("company_id", ctx.company.companyId)
    .eq("is_active", true)
    .order("name");

  // 3. Balances de Inventario
  const { data: balances } = await supabase
    .from("inventory_balances")
    .select(`
      id,
      warehouse_id,
      product_id,
      quantity,
      updated_at,
      warehouses(name, code),
      products(id, name, code, sku, cost, price, allows_inventory)
    `)
    .eq("company_id", ctx.company.companyId);

  // 4. Últimos movimientos (Kardex general)
  const { data: movements } = await supabase
    .from("inventory_movements")
    .select(`
      id,
      warehouse_id,
      product_id,
      movement_type,
      quantity,
      unit_cost,
      reference_type,
      reference_id,
      notes,
      created_at,
      warehouses(name),
      products(name, sku, code)
    `)
    .eq("company_id", ctx.company.companyId)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <PosSubNav activePath="/app/pos/inventory" />
      <InventoryHubClient
        companyId={ctx.company.companyId}
        warehouses={warehouses || []}
        products={products?.filter(p => p.allows_inventory) || []}
        initialBalances={balances || []}
        initialMovements={movements || []}
      />
    </div>
  );
}
