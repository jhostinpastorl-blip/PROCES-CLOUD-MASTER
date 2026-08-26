import { createClient } from "@/lib/supabase/server";

export interface FlagEvaluationContext {
  companyId?: string;
  planCode?: string;
  userId?: string;
}

export async function isFeatureEnabled(
  flagKey: string,
  context: FlagEvaluationContext = {}
): Promise<boolean> {
  const s = await createClient();
  const { data: flag } = await s
    .from("feature_flags")
    .select("key, scope, target_value, is_enabled")
    .eq("key", flagKey)
    .maybeSingle();

  if (!flag) return false;
  if (!flag.is_enabled) return false;

  if (flag.scope === "GLOBAL") return true;

  if (flag.scope === "PLAN" && flag.target_value && context.planCode) {
    const targetPlans = flag.target_value.split(",").map((x: string) => x.trim().toLowerCase());
    return targetPlans.includes(context.planCode.toLowerCase());
  }

  if (flag.scope === "COMPANY" && flag.target_value && context.companyId) {
    const targetCompanies = flag.target_value.split(",").map((x: string) => x.trim());
    return targetCompanies.includes(context.companyId);
  }

  return flag.is_enabled;
}
