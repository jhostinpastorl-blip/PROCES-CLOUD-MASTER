// src/lib/subscriptions/resolver.ts
// Central subscription resolver — single source of truth
// Resolves: can company operate? what are the limits? what modules?

import { createClient } from "@/lib/supabase/server";

export type CompanyPlan = {
  subscriptionId: string;
  status: string;
  planCode: string;
  planName: string;
  maxUsers: number | null;
  maxBranches: number | null;
  moduleCodes: string[];
  startsAt: string;
  endsAt: string | null;
  isOperative: boolean;
};

export async function getCompanyPlan(companyId: string): Promise<CompanyPlan | null> {
  const s = await createClient();
  const { data, error } = await s.rpc("get_company_plan", { p_company_id: companyId });
  if (error || !data || data.length === 0) return null;
  const row = data[0];
  return {
    subscriptionId: row.subscription_id,
    status: row.status,
    planCode: row.plan_code,
    planName: row.plan_name,
    maxUsers: row.max_users,
    maxBranches: row.max_branches,
    moduleCodes: row.module_codes ?? [],
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    isOperative: row.is_operative,
  };
}

export function isOperativeStatus(status: string): boolean {
  return status === "trial" || status === "active";
}

export function getSubscriptionBadge(status: string): { label: string; tone: "ok" | "warn" | "error" | "info" } {
  switch (status) {
    case "trial":     return { label: "Trial",     tone: "info" };
    case "active":    return { label: "Activo",    tone: "ok" };
    case "past_due":  return { label: "Vencido",   tone: "warn" };
    case "suspended": return { label: "Suspendido",tone: "error" };
    case "cancelled": return { label: "Cancelado", tone: "error" };
    case "expired":   return { label: "Expirado",  tone: "error" };
    default:          return { label: status,       tone: "warn" };
  }
}

export function getDaysRemaining(endsAt: string | null): number | null {
  if (!endsAt) return null;
  const ms = new Date(endsAt).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}
