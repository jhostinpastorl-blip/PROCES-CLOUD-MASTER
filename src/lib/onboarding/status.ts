import { createClient } from "@/lib/supabase/server";
import { getCompanyContexts } from "@/lib/auth/context";
export async function getOnboardingStatus() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return { step: "profile" as const, companies: [] };
  const { data: state } = await s
    .from("onboarding_states")
    .select("current_step,status,last_completed_step,workflow_version,selected_plan_code,company_id,selected_module_codes,metadata,completed_at")
    .eq("user_id", user.id)
    .maybeSingle();
  const companies = await getCompanyContexts();
  if (state?.status === "COMPLETED" || state?.completed_at) return { step: "complete" as const, companies, state };
  if (state) return { step: state.current_step, companies, state };
  if (!companies.length) return { step: "profile" as const, companies };
  return { step: "complete" as const, companies };
}
