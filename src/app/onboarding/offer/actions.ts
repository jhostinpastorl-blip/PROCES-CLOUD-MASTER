"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { SOLUTIONS, type SolutionCode } from "@/lib/activation/catalog";
import { saveCanonicalOnboarding } from "@/lib/onboarding/persist";
import { createClient } from "@/lib/supabase/server";

const solutionSchema = z.enum(["pos","rest","conta","gym","vet"]);

export async function chooseSolution(formData: FormData) {
  const code = solutionSchema.parse(formData.get("solutionCode"));
  const solution = SOLUTIONS[code as SolutionCode];
  if (!solution.activatable || !solution.packageCode) redirect(`/onboarding/offer?roadmap=${code}`);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: current } = await supabase.from("business_profiles").select("recommended_solution_code").eq("user_id", user.id).single();
  const { error } = await supabase.from("business_profiles").update({ selected_solution_code: code, selection_changed: current?.recommended_solution_code !== code, updated_at: new Date().toISOString() }).eq("user_id", user.id);
  if (error) throw error;
  await saveCanonicalOnboarding("company", { lastCompletedStep: "offer", plan: "pro", modules: ["pos"], metadata: { selectedSolutionCode: code, packageCode: solution.packageCode } });
  redirect("/onboarding/company");
}
