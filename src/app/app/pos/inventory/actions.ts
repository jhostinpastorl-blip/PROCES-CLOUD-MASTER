"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/permissions";
import { requireModule } from "@/lib/modules/entitlements";
import { audit } from "@/lib/audit/log";

const initialStockSchema = z.object({
  companyId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  productId: z.string().uuid(),
  quantity: z.coerce.number().positive(),
  unitCost: z.coerce.number().min(0).default(0),
  notes: z.string().max(300).optional().default("Stock inicial"),
});

export async function setInitialStockAction(f: FormData) {
  const p = initialStockSchema.parse({
    companyId: f.get("companyId"),
    warehouseId: f.get("warehouseId"),
    productId: f.get("productId"),
    quantity: f.get("quantity"),
    unitCost: f.get("unitCost") || 0,
    notes: f.get("notes") || "Stock inicial",
  });

  await requireModule(p.companyId, "pos");
  await requirePermission(p.companyId, "pos.inventory.manage");

  const s = await createClient();

  // Call the database RPC function to set initial stock and register movement
  const { error } = await s.rpc("set_initial_stock", {
    p_company_id: p.companyId,
    p_warehouse_id: p.warehouseId,
    p_product_id: p.productId,
    p_quantity: p.quantity,
    p_unit_cost: p.unitCost,
    p_notes: p.notes,
  });

  if (error) {
    if (error.message.includes("PRODUCT_DOES_NOT_ALLOW_INVENTORY")) {
      throw new Error("El producto seleccionado es un servicio y no maneja inventario.");
    }
    if (error.message.includes("INVALID_QUANTITY")) {
      throw new Error("La cantidad de stock inicial debe ser mayor a 0.");
    }
    throw error;
  }

  await audit(p.companyId, "inventory.initialized", "inventory", p.productId, {
    warehouseId: p.warehouseId,
    quantity: p.quantity,
    unitCost: p.unitCost,
  });

  revalidatePath("/app/pos/inventory");
  revalidatePath("/app/pos");
}
