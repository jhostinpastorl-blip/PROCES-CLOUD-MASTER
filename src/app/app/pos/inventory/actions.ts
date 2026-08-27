"use server";

import { createClient } from "@/lib/supabase/server";
import { requireModule } from "@/lib/modules/entitlements";
import { requirePermission } from "@/lib/auth/permissions";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const createAdjustmentSchema = z.object({
  companyId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  reason: z.string().min(3, "El motivo del ajuste es obligatorio"),
  items: z.array(
    z.object({
      product_id: z.string().uuid(),
      adjustment_type: z.enum(["IN", "OUT"]),
      quantity: z.number().positive("La cantidad debe ser mayor a 0"),
      notes: z.string().max(150).optional().nullable(),
    })
  ).min(1, "Debe agregar al menos un ítem al ajuste"),
  notes: z.string().max(250).optional().nullable(),
});

export async function createInventoryAdjustmentAction(input: z.infer<typeof createAdjustmentSchema>) {
  const p = createAdjustmentSchema.parse(input);
  await requireModule(p.companyId, "pos");
  await requirePermission(p.companyId, "pos.inventory.adjust");

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("create_inventory_adjustment", {
    p_company_id: p.companyId,
    p_warehouse_id: p.warehouseId,
    p_reason: p.reason,
    p_items: p.items,
    p_notes: p.notes ?? null,
  });

  if (error) {
    if (error.message.includes("INSUFFICIENT_STOCK")) {
      throw new Error("No hay stock suficiente para realizar el ajuste de salida.");
    }
    if (error.message.includes("PRODUCT_DOES_NOT_ALLOW_INVENTORY")) {
      throw new Error("Los servicios no admiten ajustes de inventario.");
    }
    throw new Error(error.message);
  }

  revalidatePath("/app/pos");
  revalidatePath("/app/pos/inventory");
  return { ok: true, data };
}

const createTransferSchema = z.object({
  companyId: z.string().uuid(),
  sourceWarehouseId: z.string().uuid(),
  destinationWarehouseId: z.string().uuid(),
  items: z.array(
    z.object({
      product_id: z.string().uuid(),
      quantity: z.number().positive("La cantidad a transferir debe ser mayor a 0"),
    })
  ).min(1, "Debe agregar al menos un producto a la transferencia"),
  notes: z.string().max(250).optional().nullable(),
});

export async function createInventoryTransferAction(input: z.infer<typeof createTransferSchema>) {
  const p = createTransferSchema.parse(input);
  if (p.sourceWarehouseId === p.destinationWarehouseId) {
    throw new Error("El almacén origen y destino no pueden ser el mismo.");
  }

  await requireModule(p.companyId, "pos");
  await requirePermission(p.companyId, "pos.inventory.transfer");

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("create_inventory_transfer", {
    p_company_id: p.companyId,
    p_source_warehouse_id: p.sourceWarehouseId,
    p_destination_warehouse_id: p.destinationWarehouseId,
    p_items: p.items,
    p_notes: p.notes ?? null,
  });

  if (error) {
    if (error.message.includes("INSUFFICIENT_STOCK")) {
      throw new Error("Stock insuficiente en el almacén de origen para completar la transferencia.");
    }
    if (error.message.includes("SAME_WAREHOUSE_TRANSFER")) {
      throw new Error("No es posible transferir al mismo almacén.");
    }
    throw new Error(error.message);
  }

  revalidatePath("/app/pos");
  revalidatePath("/app/pos/inventory");
  return { ok: true, data };
}
