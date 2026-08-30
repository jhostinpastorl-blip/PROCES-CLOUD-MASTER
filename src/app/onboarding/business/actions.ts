"use server";

import { redirect } from "next/navigation";
import { RECOMMENDATION_RULESET_VERSION } from "@/lib/activation/catalog";
import { recommendSolution } from "@/lib/activation/recommendation";
import { businessDiscoverySchema } from "@/lib/forms/schemas";
import { saveCanonicalOnboarding } from "@/lib/onboarding/persist";
import { createClient } from "@/lib/supabase/server";

export async function saveBusinessDiscovery(formData: FormData) {
  const input = businessDiscoverySchema.parse({
    industry: formData.get("industry"), primaryNeed: formData.get("primaryNeed"),
    selectedNeeds: formData.getAll("selectedNeeds"), employeeRange: formData.get("employeeRange"), branchRange: formData.get("branchRange"),
  });
  const recommendation = recommendSolution(input);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await supabase.from("business_profiles").upsert({
    user_id: user.id, industry_code: input.industry, primary_need_code: input.primaryNeed,
    selected_need_codes: input.selectedNeeds, employee_range: input.employeeRange, branch_range: input.branchRange,
    recommended_solution_code: recommendation.solutionCode, recommendation_reason: recommendation.reason,
    recommendation_version: RECOMMENDATION_RULESET_VERSION, completed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (error) throw error;
  await saveCanonicalOnboarding("recommendation", { lastCompletedStep: "business", metadata: { recommendation } });
  redirect("/onboarding/recommendation");
}
