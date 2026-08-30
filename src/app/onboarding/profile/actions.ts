"use server";

import { redirect } from "next/navigation";
import { onboardingProfileSchema } from "@/lib/forms/schemas";
import { formDataObject } from "@/lib/forms/from-data";
import { saveCanonicalOnboarding } from "@/lib/onboarding/persist";
import { createClient } from "@/lib/supabase/server";

export async function saveProfile(formData: FormData) {
  const input = onboardingProfileSchema.parse(formDataObject(formData));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await supabase.from("profiles").update({
    full_name: input.fullName,
    phone: input.phone || null,
    job_title: input.jobTitle || null,
  }).eq("id", user.id);
  if (error) throw error;
  await saveCanonicalOnboarding("business", { lastCompletedStep: "profile" });
  redirect("/onboarding/business");
}
