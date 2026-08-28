import { createClient } from "@/lib/supabase/server";
import { ACTIVATION_WORKFLOW_VERSION } from "@/lib/activation/catalog";
import type { CanonicalOnboardingStep, OnboardingStatus } from "./workflow";

type SaveInput = {
  lastCompletedStep?: CanonicalOnboardingStep | null;
  plan?: string;
  companyId?: string;
  modules?: string[];
  metadata?: Record<string, unknown>;
  status?: OnboardingStatus;
  complete?: boolean;
};

export async function saveCanonicalOnboarding(step: CanonicalOnboardingStep, input: SaveInput = {}) {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  const { data: current } = await s
    .from("onboarding_states")
    .select("selected_plan_code,company_id,selected_module_codes,metadata,started_at")
    .eq("user_id", user.id)
    .maybeSingle();
  const now = new Date().toISOString();
  const payload = {
    user_id: user.id,
    current_step: step,
    last_completed_step: input.lastCompletedStep ?? null,
    status: input.complete ? "COMPLETED" : input.status ?? "IN_PROGRESS",
    workflow_version: ACTIVATION_WORKFLOW_VERSION,
    selected_plan_code: input.plan ?? current?.selected_plan_code ?? null,
    company_id: input.companyId ?? current?.company_id ?? null,
    selected_module_codes: input.modules ?? current?.selected_module_codes ?? [],
    metadata: { ...((current?.metadata as Record<string, unknown> | null) ?? {}), ...(input.metadata ?? {}) },
    started_at: current?.started_at ?? now,
    completed_at: input.complete ? now : null,
    updated_at: now,
  };
  const { error } = await s.from("onboarding_states").upsert(payload, { onConflict: "user_id" });
  if (error) throw error;
}

/** Legacy compatibility wrapper. New code must use saveCanonicalOnboarding. */
export async function saveOnboardingState(
  step: "plan" | "company" | "modules" | "branch" | "complete",
  data: { plan?: string; companyId?: string; modules?: string[]; complete?: boolean } = {}
) {
  const map: Record<typeof step, CanonicalOnboardingStep> = {
    plan: "profile",
    company: "company",
    modules: "branch",
    branch: "activation",
    complete: "complete",
  };
  return saveCanonicalOnboarding(map[step], { ...data, complete: data.complete });
}
