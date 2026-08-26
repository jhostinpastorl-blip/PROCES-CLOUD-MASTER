import { createClient } from "@/lib/supabase/server";

export interface OnboardingStateRecord {
  id: string;
  current_step: number;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  company_id: string | null;
  metadata: Record<string, unknown>;
}

export async function getOnboardingState(): Promise<OnboardingStateRecord | null> {
  const s = await createClient();
  const {
    data: { user },
  } = await s.auth.getUser();
  if (!user) return null;

  const { data } = await s
    .from("user_onboarding_states")
    .select("id, current_step, status, company_id, metadata")
    .eq("user_id", user.id)
    .maybeSingle();

  return (data as any) ?? null;
}

export async function setOnboardingStep(
  step: number,
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED",
  companyId?: string,
  metadata: Record<string, unknown> = {}
) {
  const s = await createClient();
  const {
    data: { user },
  } = await s.auth.getUser();
  if (!user) throw new Error("UNAUTHENTICATED");

  const { error } = await s.from("user_onboarding_states").upsert(
    {
      user_id: user.id,
      current_step: step,
      status,
      company_id: companyId ?? null,
      metadata,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) throw error;
}
