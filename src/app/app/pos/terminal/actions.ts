"use server";

import { createClient } from "@/lib/supabase/server";
import { requireModule } from "@/lib/modules/entitlements";
import { requirePermission } from "@/lib/auth/permissions";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const openSessionSchema = z.object({
  companyId: z.string().uuid(),
  branchId: z.string().uuid(),
  cashRegisterId: z.string().uuid(),
  openingAmount: z.number().min(0, "El monto de apertura no puede ser negativo"),
  notes: z.string().max(250).optional().nullable(),
});

export async function openCashSession(input: z.infer<typeof openSessionSchema>) {
  const p = openSessionSchema.parse(input);
  await requireModule(p.companyId, "pos");
  await requirePermission(p.companyId, "pos.cash_sessions.open");

  const supabase = await createClient();

  const { data: sessionId, error } = await supabase.rpc("open_cash_session", {
    p_company_id: p.companyId,
    p_branch_id: p.branchId,
    p_cash_register_id: p.cashRegisterId,
    p_opening_amount: p.openingAmount,
    p_notes: p.notes ?? null,
  });

  if (error) {
    if (error.message.includes("CASH_REGISTER_ALREADY_OPEN")) {
      throw new Error("Esta caja registradora ya tiene un turno abierto.");
    }
    if (error.message.includes("CASH_REGISTER_INACTIVE")) {
      throw new Error("La caja registradora se encuentra inactiva.");
    }
    throw new Error(error.message);
  }

  revalidatePath("/app/pos");
  revalidatePath("/app/pos/terminal");
  revalidatePath("/app/pos/cash-sessions");
  return { ok: true, sessionId };
}

const closeSessionSchema = z.object({
  companyId: z.string().uuid(),
  sessionId: z.string().uuid(),
  declaredCash: z.number().min(0, "El monto declarado no puede ser negativo"),
  notes: z.string().max(250).optional().nullable(),
});

export async function closeCashSession(input: z.infer<typeof closeSessionSchema>) {
  const p = closeSessionSchema.parse(input);
  await requireModule(p.companyId, "pos");
  await requirePermission(p.companyId, "pos.cash_sessions.close");

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("close_cash_session", {
    p_company_id: p.companyId,
    p_session_id: p.sessionId,
    p_declared_cash: p.declaredCash,
    p_notes: p.notes ?? null,
  });

  if (error) {
    if (error.message.includes("CASH_SESSION_ALREADY_CLOSED")) {
      throw new Error("El turno de caja ya fue cerrado previamente.");
    }
    throw new Error(error.message);
  }

  revalidatePath("/app/pos");
  revalidatePath("/app/pos/terminal");
  revalidatePath("/app/pos/cash-sessions");
  return { ok: true, data };
}

const createSaleSchema = z.object({
  companyId: z.string().uuid(),
  branchId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  cashSessionId: z.string().uuid(),
  customerId: z.string().uuid().optional().nullable(),
  items: z.array(
    z.object({
      product_id: z.string().uuid(),
      quantity: z.number().positive("La cantidad debe ser mayor a 0"),
      discount: z.number().min(0).default(0),
    })
  ).min(1, "Debe agregar al menos un producto a la venta"),
  payments: z.array(
    z.object({
      payment_method: z.enum(["cash", "card", "transfer", "digital"]),
      amount: z.number().positive("El monto debe ser mayor a 0"),
      received_amount: z.number().min(0).optional(),
      change_amount: z.number().min(0).optional(),
      reference: z.string().max(100).optional().nullable(),
    })
  ).min(1, "Debe registrar al menos un medio de pago"),
  idempotencyKey: z.string().optional().nullable(),
  notes: z.string().max(250).optional().nullable(),
});

export async function createPosSale(input: z.infer<typeof createSaleSchema>) {
  const p = createSaleSchema.parse(input);
  await requireModule(p.companyId, "pos");
  await requirePermission(p.companyId, "pos.sales.create");

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("create_pos_sale", {
    p_company_id: p.companyId,
    p_branch_id: p.branchId,
    p_warehouse_id: p.warehouseId,
    p_cash_session_id: p.cashSessionId,
    p_items: p.items,
    p_payments: p.payments,
    p_customer_id: p.customerId ?? null,
    p_idempotency_key: p.idempotencyKey ?? null,
    p_notes: p.notes ?? null,
  });

  if (error) {
    if (error.message.includes("INSUFFICIENT_STOCK")) {
      throw new Error("No hay stock suficiente para completar la venta.");
    }
    if (error.message.includes("CASH_SESSION_CLOSED")) {
      throw new Error("El turno de caja está cerrado. Abre un nuevo turno para vender.");
    }
    if (error.message.includes("PAYMENT_MISMATCH")) {
      throw new Error("El monto pagado no cubre el total de la venta.");
    }
    if (error.message.includes("PRODUCT_INACTIVE")) {
      throw new Error("Uno de los productos seleccionados se encuentra inactivo.");
    }
    throw new Error(error.message);
  }

  revalidatePath("/app/pos");
  revalidatePath("/app/pos/terminal");
  revalidatePath("/app/pos/sales");
  revalidatePath("/app/pos/inventory");
  revalidatePath("/app/pos/cash-sessions");
  return { ok: true, data };
}
