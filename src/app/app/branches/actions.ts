"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/permissions";
import { audit } from "@/lib/audit/log";
import { assertBranchLimit } from "@/lib/plans/limits";
import { assertCompanyOperable } from "@/lib/plans/limits";
import { parseBranchActiveState } from "@/lib/branches/contracts";

const createSchema = z.object({
  companyId: z.string().uuid(),
  name: z.string().min(2).max(120),
  code: z.string().min(1).max(30).regex(/^[A-Za-z0-9_-]+$/),
});

export async function createBranch(f: FormData) {
  const p = createSchema.parse(Object.fromEntries(f));
  await requirePermission(p.companyId, "branches.manage");
  await assertCompanyOperable(p.companyId);
  await assertBranchLimit(p.companyId);
  const s = await createClient();
  const { data, error } = await s
    .from("branches")
    .insert({ company_id: p.companyId, name: p.name, code: p.code.toUpperCase(), is_active: true })
    .select("id")
    .single();

  if (error) {
    if (error.message?.includes("PLAN_BRANCH_LIMIT")) {
      throw new Error("Has alcanzado el límite de sucursales de tu plan.");
    }
    if (error.message?.includes("SUBSCRIPTION_RESTRICTED")) {
      throw new Error("Tu suscripción no está activa. Contacta a PROCESA.");
    }
    throw error;
  }
  await audit(p.companyId, "branch.created", "branch", data.id, { name: p.name, code: p.code });
  revalidatePath("/app/branches");
}

const updateSchema = z.object({
  companyId: z.string().uuid(),
  branchId: z.string().uuid(),
  name: z.string().min(2).max(120),
  code: z.string().min(1).max(30).regex(/^[A-Za-z0-9_-]+$/),
});

export async function updateBranch(f: FormData) {
  const p = updateSchema.parse(Object.fromEntries(f));
  await requirePermission(p.companyId, "branches.manage");
  const s = await createClient();

  const { data: existing } = await s
    .from("branches")
    .select("id")
    .eq("id", p.branchId)
    .eq("company_id", p.companyId)
    .single();

  if (!existing) throw new Error("BRANCH_NOT_FOUND");

  const { error } = await s
    .from("branches")
    .update({ name: p.name, code: p.code.toUpperCase() })
    .eq("id", p.branchId)
    .eq("company_id", p.companyId);

  if (error) throw error;
  await audit(p.companyId, "branch.updated", "branch", p.branchId, { name: p.name, code: p.code });
  revalidatePath("/app/branches");
}

export async function toggleBranchStatus(f: FormData) {
  const companyId = z.string().uuid().parse(f.get("companyId"));
  const branchId = z.string().uuid().parse(f.get("branchId"));
  const enable = parseBranchActiveState(f.get("enable"));
  await requirePermission(companyId, "branches.manage");
  if (enable) await assertBranchLimit(companyId);
  const s = await createClient();
  const { error } = await s
    .from("branches")
    .update({ is_active: enable })
    .eq("id", branchId)
    .eq("company_id", companyId);
  if (error) throw error;
  await audit(companyId, enable ? "branch.activated" : "branch.deactivated", "branch", branchId);
  revalidatePath("/app/branches");
}

export const toggleBranch = toggleBranchStatus;
