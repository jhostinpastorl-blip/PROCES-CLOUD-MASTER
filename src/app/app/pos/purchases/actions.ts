"use server";

import { createClient } from "@/lib/supabase/server";
import { requireModule } from "@/lib/modules/entitlements";
import { requirePermission } from "@/lib/auth/permissions";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const createPurchaseSchema = z.object({
  companyId: z.string().uuid(),
  branchId: z.string().uuid().optional().nullable(),
  warehouseId: z.string().uuid(),
  supplierId: z.string().uuid(),
  supplierDocType: z.string().default("FACTURA"),
  supplierDocNumber: z.string().max(50).optional().nullable(),
  supplierDocDate: z.string().optional().nullable(),
  items: z.array(
    z.object({
      product_id: z.string().uuid(),
      quantity: z.number().positive("La cantidad debe ser mayor a 0"),
      unit_cost: z.number().min(0, "El costo unitario no puede ser negativo"),
    })
  ).min(1, "Debe agregar al menos un producto a la compra"),
  idempotencyKey: z.string().optional().nullable(),
  notes: z.string().max(250).optional().nullable(),
});

export async function createPosPurchase(input: z.infer<typeof createPurchaseSchema>) {
  const p = createPurchaseSchema.parse(input);
  await requireModule(p.companyId, "pos");
  await requirePermission(p.companyId, "pos.purchases.create");

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("create_pos_purchase", {
    p_company_id: p.companyId,
    p_warehouse_id: p.warehouseId,
    p_supplier_id: p.supplierId,
    p_items: p.items,
    p_branch_id: p.branchId ?? null,
    p_supplier_doc_type: p.supplierDocType,
    p_supplier_doc_number: p.supplierDocNumber ?? null,
    p_supplier_doc_date: p.supplierDocDate ?? new Date().toISOString().slice(0, 10),
    p_idempotency_key: p.idempotencyKey ?? null,
    p_notes: p.notes ?? null,
  });

  if (error) {
    if (error.message.includes("WAREHOUSE_NOT_FOUND")) {
      throw new Error("El almacén seleccionado no existe o no pertenece a la empresa.");
    }
    if (error.message.includes("SUPPLIER_NOT_FOUND")) {
      throw new Error("El proveedor seleccionado no existe o no pertenece a la empresa.");
    }
    if (error.message.includes("PRODUCT_INACTIVE")) {
      throw new Error("Uno de los productos seleccionados se encuentra inactivo.");
    }
    throw new Error(error.message);
  }

  revalidatePath("/app/pos");
  revalidatePath("/app/pos/purchases");
  revalidatePath("/app/pos/inventory");
  return { ok: true, data };
}

const createPurchaseReturnSchema = z.object({
  companyId: z.string().uuid(),
  purchaseId: z.string().uuid(),
  reason: z.string().min(3, "El motivo debe tener al menos 3 caracteres"),
  items: z.array(
    z.object({
      purchase_item_id: z.string().uuid(),
      quantity: z.number().positive("La cantidad a devolver debe ser mayor a 0"),
    })
  ).min(1, "Debe seleccionar al menos un ítem a devolver"),
  idempotencyKey: z.string().optional().nullable(),
  notes: z.string().max(250).optional().nullable(),
});

export async function createPurchaseReturnAction(input: z.infer<typeof createPurchaseReturnSchema>) {
  const p = createPurchaseReturnSchema.parse(input);
  await requireModule(p.companyId, "pos");
  await requirePermission(p.companyId, "pos.purchases.return");

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("create_purchase_return", {
    p_company_id: p.companyId,
    p_purchase_id: p.purchaseId,
    p_items: p.items,
    p_reason: p.reason,
    p_idempotency_key: p.idempotencyKey ?? null,
    p_notes: p.notes ?? null,
  });

  if (error) {
    if (error.message.includes("INSUFFICIENT_STOCK")) {
      throw new Error("Stock insuficiente en el almacén para completar la devolución al proveedor.");
    }
    if (error.message.includes("PURCHASE_RETURN_QUANTITY_EXCEEDED")) {
      throw new Error("La cantidad solicitada excede la cantidad comprada disponible para devolución.");
    }
    throw new Error(error.message);
  }

  revalidatePath("/app/pos");
  revalidatePath("/app/pos/purchases");
  revalidatePath(`/app/pos/purchases/${p.purchaseId}`);
  revalidatePath("/app/pos/inventory");
  return { ok: true, data };
}
