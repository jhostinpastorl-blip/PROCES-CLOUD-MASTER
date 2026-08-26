import { createClient } from "@/lib/supabase/server";

export interface CompanySubscription {
  id: string;
  status: string;
  starts_at: string;
  ends_at: string | null;
  plan: {
    id: string;
    code: string;
    name: string;
    max_users: number | null;
    max_branches: number | null;
    module_codes: string[];
    features: Record<string, unknown>;
  } | null;
}

export async function getCompanySubscription(
  companyId: string
): Promise<CompanySubscription | null> {
  const s = await createClient();
  const { data, error } = await s
    .from("subscriptions")
    .select("id,status,starts_at,ends_at,plans(id,code,name,max_users,max_branches,module_codes,features)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    status: data.status,
    starts_at: data.starts_at,
    ends_at: data.ends_at,
    plan: (data.plans as any) ?? null,
  };
}

export function isSubscriptionOperable(sub: CompanySubscription | null): boolean {
  if (!sub) return false;
  if (sub.status === "active") return true;
  if (sub.status === "trial") {
    if (!sub.ends_at) return true;
    return new Date(sub.ends_at) >= new Date();
  }
  return false;
}

export async function canCompanyOperate(companyId: string): Promise<boolean> {
  const sub = await getCompanySubscription(companyId);
  return isSubscriptionOperable(sub);
}

export function getSubscriptionStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    trial: "Trial",
    active: "Activa",
    past_due: "Vencida",
    suspended: "Suspendida",
    cancelled: "Cancelada",
    expired: "Expirada",
  };
  return labels[status] ?? status;
}

export function getSubscriptionStatusTone(status: string): string {
  const tones: Record<string, string> = {
    trial: "warning",
    active: "success",
    past_due: "error",
    suspended: "error",
    cancelled: "neutral",
    expired: "neutral",
  };
  return tones[status] ?? "neutral";
}

export function getTrialDaysRemaining(endsAt: string | null): number | null {
  if (!endsAt) return null;
  const diff = new Date(endsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

async function limitCheck(
  companyId: string,
  key: "max_users" | "max_branches",
  table: string,
  filters: Record<string, unknown> = {}
) {
  const s = await createClient();
  const sub = await getCompanySubscription(companyId);
  const max = (sub?.plan as any)?.[key] ?? null;
  if (max === null) return; // unlimited
  let q = s.from(table).select("id", { count: "exact", head: true }).eq("company_id", companyId);
  for (const [k, v] of Object.entries(filters)) q = q.eq(k, v as any);
  const { count, error } = await q;
  if (error) throw error;
  if ((count ?? 0) >= max)
    throw Object.assign(new Error(key === "max_users" ? "PLAN_USER_LIMIT" : "PLAN_BRANCH_LIMIT"), {
      planLimit: true,
      max,
      current: count,
      key,
      friendlyMessage:
        key === "max_users"
          ? `Has alcanzado el límite de usuarios de tu plan (${count}/${max}). Actualiza tu plan para añadir más.`
          : `Has alcanzado el límite de sucursales de tu plan (${count}/${max}). Actualiza tu plan para añadir más.`,
    });
}

export const assertBranchLimit = (id: string) =>
  limitCheck(id, "max_branches", "branches", { is_active: true });

export const assertUserLimit = (id: string) =>
  limitCheck(id, "max_users", "company_memberships", { status: "active" });

export async function assertModuleEntitled(
  companyId: string,
  moduleCode: string
): Promise<void> {
  if (moduleCode === "core") return;
  const sub = await getCompanySubscription(companyId);
  if (!sub || !isSubscriptionOperable(sub)) {
    throw Object.assign(new Error("SUBSCRIPTION_RESTRICTED"), {
      planLimit: true,
      friendlyMessage: "Tu plan no permite operaciones en este momento.",
    });
  }
  const allowed: string[] = (sub.plan as any)?.module_codes ?? [];
  if (!allowed.includes(moduleCode)) {
    throw Object.assign(new Error("MODULE_NOT_ENTITLED"), {
      planLimit: true,
      friendlyMessage: `El módulo «${moduleCode}» no está incluido en tu plan actual (${sub.plan?.name ?? ""}). Actualiza tu plan para acceder.`,
    });
  }
}

export async function assertCompanyOperable(companyId: string): Promise<void> {
  const sub = await getCompanySubscription(companyId);
  if (!isSubscriptionOperable(sub)) {
    throw Object.assign(new Error("SUBSCRIPTION_RESTRICTED"), {
      planLimit: true,
      friendlyMessage: "Tu suscripción no está activa. Contacta a PROCESA para reactivarla.",
    });
  }
}
