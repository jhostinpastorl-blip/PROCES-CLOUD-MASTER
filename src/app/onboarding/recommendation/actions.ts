"use server";

import { redirect } from "next/navigation";
import { saveCanonicalOnboarding } from "@/lib/onboarding/persist";
import { createClient } from "@/lib/supabase/server";

export async function acceptRecommendation() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile, error: readError } = await supabase.from("business_profiles").select("recommended_solution_code").eq("user_id", user.id).single();
  if (readError || !profile?.recommended_solution_code) throw readError ?? new Error("RECOMMENDATION_NOT_FOUND");
  const { error } = await supabase.from("business_profiles").update({ selected_solution_code: profile.recommended_solution_code, selection_changed: false, updated_at: new Date().toISOString() }).eq("user_id", user.id);
  if (error) throw error;
  await saveCanonicalOnboarding("offer", { lastCompletedStep: "recommendation", metadata: { selectedSolutionCode: profile.recommended_solution_code } });
  redirect("/onboarding/offer");
}
