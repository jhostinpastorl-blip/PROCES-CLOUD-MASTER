export const ACTIVATION_STEPS = [
  "Perfil",
  "Tu negocio",
  "Recomendación",
  "Oferta",
  "Empresa",
  "Sucursal",
  "Activación",
  "Siguiente acción",
] as const;

export type CanonicalOnboardingStep =
  | "identity"
  | "profile"
  | "business"
  | "recommendation"
  | "offer"
  | "company"
  | "branch"
  | "activation"
  | "solution_setup"
  | "go_live"
  | "complete";

export type OnboardingStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED";
