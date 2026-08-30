import { redirect } from "next/navigation";
import { onboardingRoute } from "@/lib/activation/first-entry-policy";
import { getOnboardingStatus } from "./status";
export async function redirectToOnboardingStep() {
  const result = await getOnboardingStatus();
  if (result.step === "complete") redirect("/app/context");
  redirect(onboardingRoute({ currentStep: result.step, companyId: result.state?.company_id ?? null }));
}
