"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/permissions";
import { requireModule } from "@/lib/modules/entitlements";
import { audit } from "@/lib/audit/log";

const warehouseSchema = z.object({
  companyId: z.string().uuid(),
  branchId: z.string().uuid().optional().nullable(),
  code: z.string().min(1).max(30).regex(/^[A-Za-z0-9_-]+$/),
  name: z.string().min(2).max(100),
  address: z.string().max(300).optional().default(""),
  isDefault: z.boolean().default(false),
});

export async function createWarehouse(f: FormData) {
  const rawBranchId = f.get("branchId");
  const p = warehouseSchema.parse({
    companyId: f.get("companyId"),
    branchId: rawBranchId && rawBranchId !== "" ? rawBranchId : null,
    code: String(f.get("code") || "").toUpperCase(),
    name: f.get("name"),
    address: f.get("address") || "",
    isDefault: f.get("isDefault") === "true",
  });

  await requireModule(p.companyId, "pos");
  await requirePermission(p.companyId, "pos.warehouses.manage");

  const s = await createClient();

  // Validate branch belongs to company if provided
  if (p.branchId) {
    const { data: br } = await s
      .from("branches")
      .select("id")
      .eq("id", p.branchId)
      .eq("company_id", p.companyId)
      .maybeSingle();

    if (!br) throw new Error("BRANCH_NOT_FOUND");
  }

  const { data, error } = await s
    .from("warehouses")
    .insert({
      company_id: p.companyId,
      branch_id: p.branchId,
      code: p.code,
      name: p.name,
      address: p.address || null,
      is_default: p.isDefault,
      is_active: true,
    })
    .select("id")
    .single();

  if (error) {
    if (error.message.includes("warehouses_company_id_code_key")) {
      throw new Error("El código de almacén ya está en uso en esta empresa.");
    }
    throw error;
  }

  await audit(p.companyId, "warehouse.created", "warehouse", data.id, {
    code: p.code,
    name: p.name,
    branchId: p.branchId,
  });

  revalidatePath("/app/pos/warehouses");
  revalidatePath("/app/pos/inventory");
  revalidatePath("/app/pos");
}

export async function updateWarehouse(f: FormData) {
  const warehouseId = z.string().uuid().parse(f.get("warehouseId"));
  const companyId = z.string().uuid().parse(f.get("companyId"));
  const rawBranchId = f.get("branchId");

  const p = warehouseSchema.parse({
    companyId,
    branchId: rawBranchId && rawBranchId !== "" ? rawBranchId : null,
    code: String(f.get("code") || "").toUpperCase(),
    name: f.get("name"),
    address: f.get("address") || "",
    isDefault: f.get("isDefault") === "true",
  });

  await requireModule(companyId, "pos");
  await requirePermission(companyId, "pos.warehouses.manage");

  const s = await createClient();
  const { error } = await s
    .from("warehouses")
    .update({
      branch_id: p.branchId,
      code: p.code,
      name: p.name,
      address: p.address || null,
      is_default: p.isDefault,
      updated_at: new Date().toISOString(),
    })
    .eq("id", warehouseId)
    .eq("company_id", companyId);

  if (error) throw error;

  await audit(companyId, "warehouse.updated", "warehouse", warehouseId, {
    code: p.code,
    name: p.name,
  });

  revalidatePath("/app/pos/warehouses");
  revalidatePath("/app/pos/inventory");
  revalidatePath("/app/pos");
}

export async function toggleWarehouseStatus(f: FormData) {
  const warehouseId = z.string().uuid().parse(f.get("warehouseId"));
  const companyId = z.string().uuid().parse(f.get("companyId"));
  const isActive = String(f.get("isActive")) === "true";

  await requireModule(companyId, "pos");
  await requirePermission(companyId, "pos.warehouses.manage");

  const s = await createClient();
  const { error } = await s
    .from("warehouses")
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", warehouseId)
    .eq("company_id", companyId);

  if (error) throw error;

  await audit(companyId, isActive ? "warehouse.activated" : "warehouse.deactivated", "warehouse", warehouseId);
  revalidatePath("/app/pos/warehouses");
  revalidatePath("/app/pos/inventory");
  revalidatePath("/app/pos");
}
