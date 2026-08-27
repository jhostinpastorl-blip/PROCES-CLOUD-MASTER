import { getResolvedContext } from "@/lib/company/resolve";
import { requireModule } from "@/lib/modules/entitlements";
import { createClient } from "@/lib/supabase/server";
import { PosSubNav } from "../../components/PosSubNav";
import { PurchaseFormClient } from "./purchase-form-client";

export default async function PosNewPurchasePage() {
  const ctx = await getResolvedContext();
  if (!ctx) return <div>No hay contexto de empresa activo.</div>;

  await requireModule(ctx.company.companyId, "pos");

  const supabase = await createClient();

  // 1. Proveedores
  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("id, name, doc_type, doc_number")
    .eq("company_id", ctx.company.companyId)
    .eq("is_active", true)
    .order("name");

  // 2. Almacenes
  const { data: warehouses } = await supabase
    .from("warehouses")
    .select("id, name, code, is_default")
    .eq("company_id", ctx.company.companyId)
    .eq("is_active", true)
    .order("name");

  // 3. Productos inventariables
  const { data: products } = await supabase
    .from("products")
    .select("id, code, sku, barcode, name, cost, price, tax_type, allows_inventory")
    .eq("company_id", ctx.company.companyId)
    .eq("is_active", true)
    .order("name");

  return (
    <div className="space-y-6">
      <PosSubNav activePath="/app/pos/purchases" />
      <PurchaseFormClient
        companyId={ctx.company.companyId}
        suppliers={suppliers || []}
        warehouses={warehouses || []}
        products={products || []}
      />
    </div>
  );
}
