"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/permissions";
import { requireModule } from "@/lib/modules/entitlements";
import { audit } from "@/lib/audit/log";

const cashRegisterSchema = z.object({
  companyId: z.string().uuid(),
  branchId: z.string().uuid(),
  code: z.string().min(1).max(30).regex(/^[A-Za-z0-9_-]+$/),
  name: z.string().min(2).max(100),
});

export async function createCashRegister(f: FormData) {
  const p = cashRegisterSchema.parse({
    companyId: f.get("companyId"),
    branchId: f.get("branchId"),
    code: String(f.get("code") || "").toUpperCase(),
    name: f.get("name"),
  });

  await requireModule(p.companyId, "pos");
  await requirePermission(p.companyId, "pos.cash_registers.manage");

  const s = await createClient();

  // Validate branch belongs to company
  const { data: br } = await s
    .from("branches")
    .select("id")
    .eq("id", p.branchId)
    .eq("company_id", p.companyId)
    .maybeSingle();

  if (!br) throw new Error("BRANCH_NOT_FOUND");

  const { data, error } = await s
    .from("cash_registers")
    .insert({
      company_id: p.companyId,
      branch_id: p.branchId,
      code: p.code,
      name: p.name,
      status: "closed",
      is_active: true,
    })
    .select("id")
    .single();

  if (error) {
    if (error.message.includes("cash_registers_company_id_branch_id_code_key")) {
      throw new Error("El código de caja ya existe en esta sucursal.");
    }
    throw error;
  }

  await audit(p.companyId, "cash_register.created", "cash_register", data.id, {
    branchId: p.branchId,
    code: p.code,
    name: p.name,
  });

  revalidatePath("/app/pos/cash-registers");
  revalidatePath("/app/pos");
}

export async function toggleCashRegisterStatus(f: FormData) {
  const cashRegisterId = z.string().uuid().parse(f.get("cashRegisterId"));
  const companyId = z.string().uuid().parse(f.get("companyId"));
  const isActive = String(f.get("isActive")) === "true";

  await requireModule(companyId, "pos");
  await requirePermission(companyId, "pos.cash_registers.manage");

  const s = await createClient();
  const { error } = await s
    .from("cash_registers")
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", cashRegisterId)
    .eq("company_id", companyId);

  if (error) throw error;

  await audit(companyId, isActive ? "cash_register.activated" : "cash_register.deactivated", "cash_register", cashRegisterId);
  revalidatePath("/app/pos/cash-registers");
  revalidatePath("/app/pos");
}
