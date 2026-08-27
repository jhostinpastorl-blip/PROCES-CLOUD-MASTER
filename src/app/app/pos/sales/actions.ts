"use server";

import { createClient } from "@/lib/supabase/server";
import { requireModule } from "@/lib/modules/entitlements";
import { requirePermission } from "@/lib/auth/permissions";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const createSaleReturnSchema = z.object({
  companyId: z.string().uuid(),
  saleId: z.string().uuid(),
  reason: z.string().min(3, "El motivo debe tener al menos 3 caracteres"),
  items: z.array(
    z.object({
      sale_item_id: z.string().uuid(),
      quantity: z.number().positive("La cantidad debe ser mayor a 0"),
    })
  ).min(1, "Debe seleccionar al menos un ítem a devolver"),
  refunds: z.array(
    z.object({
      payment_method: z.enum(["cash", "card", "transfer", "digital"]),
      amount: z.number().positive("El monto a reembolsar debe ser mayor a 0"),
      reference_notes: z.string().optional().nullable(),
    })
  ).optional().nullable(),
  cashSessionId: z.string().uuid().optional().nullable(),
  returnType: z.enum(["partial_return", "full_return"]).default("partial_return"),
  idempotencyKey: z.string().optional().nullable(),
  notes: z.string().max(250).optional().nullable(),
});

export async function createSaleReturnAction(input: z.infer<typeof createSaleReturnSchema>) {
  const p = createSaleReturnSchema.parse(input);
  await requireModule(p.companyId, "pos");
  await requirePermission(p.companyId, "pos.sales.return");

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("create_sale_return", {
    p_company_id: p.companyId,
    p_sale_id: p.saleId,
    p_items: p.items,
    p_reason: p.reason,
    p_refunds: p.refunds ?? null,
    p_cash_session_id: p.cashSessionId ?? null,
    p_return_type: p.returnType,
    p_idempotency_key: p.idempotencyKey ?? null,
    p_notes: p.notes ?? null,
  });

  if (error) {
    if (error.message.includes("RETURN_QUANTITY_EXCEEDED")) {
      throw new Error("La cantidad a devolver excede la cantidad vendida disponible.");
    }
    if (error.message.includes("CASH_SESSION_CLOSED")) {
      throw new Error("El turno de caja para reembolso en efectivo se encuentra cerrado.");
    }
    throw new Error(error.message);
  }

  revalidatePath("/app/pos");
  revalidatePath("/app/pos/sales");
  revalidatePath(`/app/pos/sales/${p.saleId}`);
  revalidatePath("/app/pos/inventory");
  return { ok: true, data };
}

const voidSaleSchema = z.object({
  companyId: z.string().uuid(),
  saleId: z.string().uuid(),
  reason: z.string().min(3, "El motivo de anulación es obligatorio"),
  cashSessionId: z.string().uuid().optional().nullable(),
  idempotencyKey: z.string().optional().nullable(),
  notes: z.string().max(250).optional().nullable(),
});

export async function voidSaleAction(input: z.infer<typeof voidSaleSchema>) {
  const p = voidSaleSchema.parse(input);
  await requireModule(p.companyId, "pos");
  await requirePermission(p.companyId, "pos.sales.void");

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("void_sale", {
    p_company_id: p.companyId,
    p_sale_id: p.saleId,
    p_reason: p.reason,
    p_cash_session_id: p.cashSessionId ?? null,
    p_idempotency_key: p.idempotencyKey ?? null,
    p_notes: p.notes ?? null,
  });

  if (error) {
    if (error.message.includes("SALE_ALREADY_VOIDED") || error.message.includes("SALE_ALREADY_FULLY_REVERSED")) {
      throw new Error("La venta ya ha sido anulada o devuelta en su totalidad previamente.");
    }
    throw new Error(error.message);
  }

  revalidatePath("/app/pos");
  revalidatePath("/app/pos/sales");
  revalidatePath(`/app/pos/sales/${p.saleId}`);
  revalidatePath("/app/pos/inventory");
  return { ok: true, data };
}
