import { getCompanyContexts } from "@/lib/auth/context";
import { getResolvedContext } from "@/lib/company/resolve";
import { isFeatureEnabled } from "@/lib/flags/feature-flags";
import { createClient } from "@/lib/supabase/server";
import { resolveFirstEntry, sanitizeNextPath, type EntryOnboardingState } from "./first-entry-policy";

export async function getFirstEntryDestination(next?: string | null): Promise<string> {
  const safeNext = sanitizeNextPath(next);
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return resolveFirstEntry({ authenticated: false, emailConfirmed: false, activationEnabled: false, safeNext, companyCount: 0, hasValidContext: false });

  const [activationEnabled, companies] = await Promise.all([
    isFeatureEnabled("activation_foundation", { userId: user.id }).catch(() => false),
    getCompanyContexts(),
  ]);

  let onboarding: EntryOnboardingState | null = null;
  const expanded = await s
    .from("onboarding_states")
    .select("current_step,status,completed_at,company_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!expanded.error && expanded.data) {
    onboarding = {
      currentStep: expanded.data.current_step,
      status: expanded.data.status,
      completedAt: expanded.data.completed_at,
      companyId: expanded.data.company_id,
    };
  } else if (expanded.error) {
    const legacy = await s.from("onboarding_states").select("current_step,completed_at,company_id").eq("user_id", user.id).maybeSingle();
    if (legacy.data) onboarding = { currentStep: legacy.data.current_step, completedAt: legacy.data.completed_at, companyId: legacy.data.company_id };
  }

  const context = companies.length ? await getResolvedContext().catch(() => null) : null;
  return resolveFirstEntry({
    authenticated: true,
    emailConfirmed: Boolean(user.email_confirmed_at),
    activationEnabled,
    pendingInvitationPath: safeNext?.startsWith("/aceptar-invitacion") ? safeNext : null,
    safeNext,
    onboarding,
    companyCount: companies.length,
    hasValidContext: Boolean(context),
  });
}
