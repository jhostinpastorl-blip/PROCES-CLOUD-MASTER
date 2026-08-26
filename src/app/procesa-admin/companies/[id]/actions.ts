"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requirePlatformAdmin, logPlatformAction } from "@/lib/platform/admin";
import { notifyPlanChanged } from "@/lib/notifications/notify";

export async function changeCompanyPlan(f: FormData) {
  const companyId = z.string().uuid().parse(f.get("companyId"));
  const newPlanId = z.string().uuid().parse(f.get("planId"));
  const { s, user } = await requirePlatformAdmin();

  const { data: newPlan } = await s.from("plans").select("id, code, name").eq("id", newPlanId).single();
  if (!newPlan) throw new Error("PLAN_NOT_FOUND");

  // Get current active subscription
  const { data: currentSub } = await s
    .from("subscriptions")
    .select("id, plan_id, status")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (currentSub) {
    const { error } = await s
      .from("subscriptions")
      .update({ plan_id: newPlanId })
      .eq("id", currentSub.id);
    if (error) throw error;
  } else {
    // Create new subscription if none existed
    const { error } = await s.from("subscriptions").insert({
      company_id: companyId,
      plan_id: newPlanId,
      status: "active",
    });
    if (error) throw error;
  }

  await logPlatformAction(user.id, "subscription.plan_changed", "company", companyId, {
    old_plan_id: currentSub?.plan_id ?? null,
    new_plan_id: newPlanId,
    new_plan_name: newPlan.name,
  });

  // Notify tenant
  await notifyPlanChanged(companyId, newPlan.name).catch(() => {});

  revalidatePath(`/procesa-admin/companies/${companyId}`);
  revalidatePath("/procesa-admin/companies");
  revalidatePath("/procesa-admin");
}

export async function extendCompanyTrial(f: FormData) {
  const companyId = z.string().uuid().parse(f.get("companyId"));
  const daysToAdd = z.coerce.number().int().positive().max(365).parse(f.get("daysToAdd"));
  const { s, user } = await requirePlatformAdmin();

  const { data: currentSub } = await s
    .from("subscriptions")
    .select("id, status, ends_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!currentSub) throw new Error("SUBSCRIPTION_NOT_FOUND");

  const baseDate = currentSub.ends_at && new Date(currentSub.ends_at) > new Date()
    ? new Date(currentSub.ends_at)
    : new Date();

  const newEndsAt = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await s
    .from("subscriptions")
    .update({ ends_at: newEndsAt, status: "trial" })
    .eq("id", currentSub.id);
  if (error) throw error;

  await logPlatformAction(user.id, "trial.extended", "company", companyId, {
    days_added: daysToAdd,
    new_ends_at: newEndsAt,
  });

  revalidatePath(`/procesa-admin/companies/${companyId}`);
  revalidatePath("/procesa-admin/companies");
  revalidatePath("/procesa-admin");
}

export const extendTrial = extendCompanyTrial;

export async function toggleCompanySuspension(f: FormData) {
  const companyId = z.string().uuid().parse(f.get("companyId"));
  const suspend = String(f.get("suspend")) === "true";
  const reason = z.string().max(300).optional().parse(f.get("reason") ?? "");
  const { s, user } = await requirePlatformAdmin();

  const newStatus = suspend ? "suspended" : "active";

  // Update subscription status
  const { data: currentSub } = await s
    .from("subscriptions")
    .select("id")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (currentSub) {
    const { error: subErr } = await s
      .from("subscriptions")
      .update({ status: newStatus })
      .eq("id", currentSub.id);
    if (subErr) throw subErr;
  }

  // Update company status as well
  const { error: compErr } = await s
    .from("companies")
    .update({ status: newStatus })
    .eq("id", companyId);
  if (compErr) throw compErr;

  await logPlatformAction(
    user.id,
    suspend ? "subscription.suspended" : "subscription.reactivated",
    "company",
    companyId,
    { reason, status: newStatus }
  );

  revalidatePath(`/procesa-admin/companies/${companyId}`);
  revalidatePath("/procesa-admin/companies");
  revalidatePath("/procesa-admin");
}
