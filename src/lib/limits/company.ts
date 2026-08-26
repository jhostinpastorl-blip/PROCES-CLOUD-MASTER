// src/lib/limits/company.ts
// Server-side limits enforcement using DB RPCs
// Single source of truth: check_branch_limit / check_user_limit / check_module_entitlement

import { createClient } from "@/lib/supabase/server";

export type CompanyUsage = {
  plan: string;
  planCode: string;
  status: string;
  users: number;
  maxUsers: number | null;
  branches: number;
  maxBranches: number | null;
  moduleCodes: string[];
  isOperative: boolean;
};

export async function getCompanyLimits(companyId: string): Promise<CompanyUsage> {
  const s = await createClient();

  const [planRes, usersRes, branchRes] = await Promise.all([
    s.rpc("get_company_plan", { p_company_id: companyId }),
    s.from("company_memberships")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("status", "active"),
    s.from("branches")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("is_active", true),
  ]);

  const plan = planRes.data?.[0];
  return {
    plan: plan?.plan_name ?? "Sin plan",
    planCode: plan?.plan_code ?? "none",
    status: plan?.status ?? "none",
    isOperative: plan?.is_operative ?? false,
    users: usersRes.count ?? 0,
    maxUsers: plan?.max_users ?? null,
    branches: branchRes.count ?? 0,
    maxBranches: plan?.max_branches ?? null,
    moduleCodes: plan?.module_codes ?? [],
  };
}

/** Throws PLAN_BRANCH_LIMIT_EXCEEDED if at limit. Call before creating a branch. */
export async function enforceBranchLimit(companyId: string): Promise<void> {
  const s = await createClient();
  const { error } = await s.rpc("check_branch_limit", { p_company_id: companyId });
  if (error) throw new Error(error.message);
}

/** Throws PLAN_USER_LIMIT_EXCEEDED if at limit. Call before inviting a user. */
export async function enforceUserLimit(companyId: string): Promise<void> {
  const s = await createClient();
  const { error } = await s.rpc("check_user_limit", { p_company_id: companyId });
  if (error) throw new Error(error.message);
}

/** Throws MODULE_NOT_ENTITLED if module not in plan. Call before enabling a module. */
export async function enforceModuleEntitlement(companyId: string, moduleCode: string): Promise<void> {
  const s = await createClient();
  const { error } = await s.rpc("check_module_entitlement", {
    p_company_id: companyId,
    p_module_code: moduleCode,
  });
  if (error) throw new Error(error.message);
}

/** Human-readable error messages for limit errors */
export function getLimitErrorMessage(errorMessage: string): string {
  if (errorMessage.includes("PLAN_BRANCH_LIMIT_EXCEEDED"))
    return "Has alcanzado el límite de sucursales de tu plan. Contacta a PROCESA para ampliar tu capacidad.";
  if (errorMessage.includes("PLAN_USER_LIMIT_EXCEEDED"))
    return "Has alcanzado el límite de usuarios de tu plan. Contacta a PROCESA para ampliar tu capacidad.";
  if (errorMessage.includes("MODULE_NOT_ENTITLED"))
    return "Este módulo no está incluido en tu plan actual. Contacta a PROCESA para ampliar tu plan.";
  return errorMessage;
}