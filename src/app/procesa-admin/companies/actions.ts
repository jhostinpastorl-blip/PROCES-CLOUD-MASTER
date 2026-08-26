"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/lib/platform/admin";

const changePlanSchema = z.object({
  companyId: z.string().uuid(),
  planCode: z.enum(["free", "lite", "pro", "business", "enterprise"]),
});

export async function platformChangePlan(f: FormData) {
  const p = changePlanSchema.parse(Object.fromEntries(f));
  const { s } = await requirePlatformAdmin();
  const { error } = await s.rpc("platform_change_plan", {
    p_company_id: p.companyId,
    p_plan_code: p.planCode,
    p_actor_id: null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/procesa-admin/companies");
  revalidatePath(`/procesa-admin/companies/${p.companyId}`);
}

export async function platformSuspendSubscription(f: FormData) {
  const companyId = z.string().uuid().parse(f.get("companyId"));
  const reason = String(f.get("reason") ?? "");
  const { s } = await requirePlatformAdmin();
  const { error } = await s.rpc("platform_suspend_subscription", {
    p_company_id: companyId,
    p_reason: reason,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/procesa-admin/companies");
  revalidatePath(`/procesa-admin/companies/${companyId}`);
}

export async function platformReactivateSubscription(f: FormData) {
  const companyId = z.string().uuid().parse(f.get("companyId"));
  const { s } = await requirePlatformAdmin();
  const { error } = await s.rpc("platform_reactivate_subscription", {
    p_company_id: companyId,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/procesa-admin/companies");
  revalidatePath(`/procesa-admin/companies/${companyId}`);
}

export async function platformExtendTrial(f: FormData) {
  const companyId = z.string().uuid().parse(f.get("companyId"));
  const days = z.coerce.number().min(1).max(90).parse(f.get("days") ?? "14");
  const { s } = await requirePlatformAdmin();
  const { error } = await s.rpc("platform_extend_trial", {
    p_company_id: companyId,
    p_days: days,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/procesa-admin/companies");
  revalidatePath(`/procesa-admin/companies/${companyId}`);
}
