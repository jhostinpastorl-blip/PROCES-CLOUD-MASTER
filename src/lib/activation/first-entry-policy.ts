export type EntryOnboardingState = {
  currentStep: string;
  status?: string | null;
  completedAt?: string | null;
  companyId?: string | null;
};

export type FirstEntryInput = {
  authenticated: boolean;
  emailConfirmed: boolean;
  activationEnabled: boolean;
  pendingInvitationPath?: string | null;
  safeNext?: string | null;
  onboarding?: EntryOnboardingState | null;
  companyCount: number;
  hasValidContext: boolean;
};

const SAFE_PREFIXES = ["/app/", "/onboarding", "/aceptar-invitacion", "/verificar-correo"];

export function sanitizeNextPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  try {
    const url = new URL(value, "https://app.procesacloud.invalid");
    if (url.origin !== "https://app.procesacloud.invalid") return null;
    return SAFE_PREFIXES.some((prefix) => `${url.pathname}${url.search}`.startsWith(prefix))
      ? `${url.pathname}${url.search}`
      : null;
  } catch {
    return null;
  }
}

export function onboardingRoute(state: EntryOnboardingState): string {
  const company = state.companyId ? `?company=${encodeURIComponent(state.companyId)}` : "";
  const routes: Record<string, string> = {
    identity: "/verificar-correo",
    profile: "/onboarding/profile",
    business: "/onboarding/business",
    recommendation: "/onboarding/recommendation",
    offer: "/onboarding/offer",
    company: "/onboarding/company",
    branch: `/onboarding/branch${company}`,
    activation: `/onboarding/activation${company}`,
    solution_setup: `/onboarding/solution-setup${company}`,
    go_live: `/onboarding/solution-setup${company}`,
    plan: "/onboarding/profile",
    modules: `/onboarding/branch${company}`,
  };
  return routes[state.currentStep] ?? "/onboarding/profile";
}

export function resolveFirstEntry(input: FirstEntryInput): string {
  const invitation = sanitizeNextPath(input.pendingInvitationPath);
  const next = sanitizeNextPath(input.safeNext);
  if (!input.authenticated) return next ? `/login?next=${encodeURIComponent(next)}` : "/login";
  if (invitation?.startsWith("/aceptar-invitacion")) return invitation;
  if (!input.emailConfirmed) return "/verificar-correo";

  const completed = input.onboarding?.status === "COMPLETED" || Boolean(input.onboarding?.completedAt);
  if (input.activationEnabled && input.onboarding && !completed) return onboardingRoute(input.onboarding);
  if (input.activationEnabled && !input.onboarding && input.companyCount === 0) return "/onboarding/profile";
  if (!input.activationEnabled && input.companyCount === 0) return "/onboarding";
  if (input.companyCount > 0 && !input.hasValidContext) return "/app/context";
  return next ?? "/app/dashboard";
}
