import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/platform/admin";
import { StatusChip } from "@/components/ui/status-chip";
import { getSubscriptionStatusLabel, getSubscriptionStatusTone, getTrialDaysRemaining } from "@/lib/plans/limits";
import { changeCompanyPlan, extendTrial, toggleCompanySuspension } from "./actions";

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { s } = await requirePlatformAdmin();

  const [
    { data: company },
    { data: sub },
    { data: allPlans },
    { data: memberships },
    { data: branches },
    { data: companyModules },
    { data: allModules },
    { data: auditLogs },
  ] = await Promise.all([
    s.from("companies").select("*").eq("id", id).maybeSingle(),
    s
      .from("subscriptions")
      .select("id, status, starts_at, ends_at, plan_id, plans(id, code, name, max_users, max_branches, module_codes)")
      .eq("company_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    s.from("plans").select("id, code, name, max_users, max_branches, is_active").order("code"),
    s
      .from("company_memberships")
      .select("id, status, created_at, user_id, profiles(full_name)")
      .eq("company_id", id),
    s.from("branches").select("id, name, code, is_active, created_at").eq("company_id", id),
    s.from("company_modules").select("module_id, enabled").eq("company_id", id),
    s.from("modules").select("id, code, name, status").order("code"),
    s
      .from("platform_audit_logs")
      .select("id, action, entity_type, metadata, created_at")
      .eq("entity_id", id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  if (!company) notFound();

  const plan = (sub?.plans as any) ?? null;
  const subStatus = sub?.status ?? "trial";
  const activeMembers = (memberships ?? []).filter((m) => m.status === "active").length;
  const activeBranches = (branches ?? []).filter((b) => b.is_active).length;
  const trialDays = subStatus === "trial" ? getTrialDaysRemaining(sub?.ends_at ?? null) : null;
  const enabledModuleIds = new Set((companyModules ?? []).filter((cm) => cm.enabled).map((cm) => cm.module_id));
  const entitledCodes = new Set(plan?.module_codes ?? ["core"]);

  return (
    <main className="app-content premium-real admin-real space-y-6">
      {/* Head */}
      <div className="premium-page-head real-head">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/procesa-admin/companies" className="text-xs text-muted hover:text-primary">
              ← Volver a Empresas
            </Link>
          </div>
          <span>DETALLE DE EMPRESA</span>
          <h2>{company.name}</h2>
          <p>
            {company.legal_name ?? "Sin razón social"} · RUC: {company.tax_id ?? "—"} · Moneda: {company.currency} · Timezone: {company.timezone}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusChip tone={company.status === "active" ? "success" : "neutral"}>
            Empresa {company.status}
          </StatusChip>
          <StatusChip tone={getSubscriptionStatusTone(subStatus) as any}>
            Suscripción {getSubscriptionStatusLabel(subStatus)}
          </StatusChip>
        </div>
      </div>

      {/* Subscription & Plan Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <section className="panel p-5 bg-card border rounded-lg md:col-span-2">
          <h3 className="text-base font-semibold mb-4">Suscripción y Capacidad</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div>
              <small className="text-muted block text-xs">Plan Actual</small>
              <b className="text-lg text-primary">{plan?.name ?? "Free"}</b>
            </div>
            <div>
              <small className="text-muted block text-xs">Estado</small>
              <b className="text-lg">{getSubscriptionStatusLabel(subStatus)}</b>
            </div>
            <div>
              <small className="text-muted block text-xs">Vencimiento</small>
              <b className="text-sm">
                {sub?.ends_at ? new Date(sub.ends_at).toLocaleDateString("es-PE") : "Permanente"}
                {trialDays !== null && <span className="text-xs text-muted block">({trialDays} días restantes)</span>}
              </b>
            </div>
            <div>
              <small className="text-muted block text-xs">Fecha Alta</small>
              <b className="text-sm">{new Date(company.created_at).toLocaleDateString("es-PE")}</b>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Límite de Usuarios</span>
                <b>
                  {activeMembers} / {plan?.max_users ?? "∞"} ({Math.round(((activeMembers / (plan?.max_users || 1)) * 100))}% usado)
                </b>
              </div>
              <div className="w-full bg-muted/40 h-2 rounded overflow-hidden">
                <div
                  className="bg-primary h-full transition-all"
                  style={{
                    width: `${plan?.max_users ? Math.min(100, (activeMembers / plan.max_users) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Límite de Sucursales</span>
                <b>
                  {activeBranches} / {plan?.max_branches ?? "∞"} ({Math.round(((activeBranches / (plan?.max_branches || 1)) * 100))}% usado)
                </b>
              </div>
              <div className="w-full bg-muted/40 h-2 rounded overflow-hidden">
                <div
                  className="bg-primary h-full transition-all"
                  style={{
                    width: `${plan?.max_branches ? Math.min(100, (activeBranches / plan.max_branches) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Operational Actions Panel (Super Admin) */}
        <section className="panel p-5 bg-card border rounded-lg space-y-4">
          <h3 className="text-base font-semibold">Acciones de Plataforma</h3>

          {/* Change Plan Form */}
          <form action={changeCompanyPlan} className="space-y-2 border-b pb-4 border-border/40">
            <input type="hidden" name="companyId" value={company.id} />
            <label className="text-xs text-muted block font-medium">Cambiar Plan</label>
            <div className="flex gap-2">
              <select
                name="planId"
                defaultValue={plan?.id ?? ""}
                className="bg-background border rounded px-2 py-1 text-xs flex-1"
              >
                {allPlans?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.max_users ?? "∞"} u / {p.max_branches ?? "∞"} suc)
                  </option>
                ))}
              </select>
              <button className="primary-btn text-xs py-1 px-3">Actualizar</button>
            </div>
          </form>

          {/* Extend Trial Form */}
          <form action={extendTrial} className="space-y-2 border-b pb-4 border-border/40">
            <input type="hidden" name="companyId" value={company.id} />
            <label className="text-xs text-muted block font-medium">Extender Trial</label>
            <div className="flex gap-2">
              <input
                type="number"
                name="daysToAdd"
                defaultValue={14}
                min={1}
                max={365}
                className="bg-background border rounded px-2 py-1 text-xs w-20"
              />
              <span className="text-xs self-center">días</span>
              <button className="secondary-btn text-xs py-1 px-3 ml-auto">Extender</button>
            </div>
          </form>

          {/* Suspend / Reactivate */}
          <form action={toggleCompanySuspension} className="space-y-2">
            <input type="hidden" name="companyId" value={company.id} />
            <input type="hidden" name="suspend" value={company.status === "active" ? "true" : "false"} />
            <label className="text-xs text-muted block font-medium">Estado Comercial</label>
            <input
              type="text"
              name="reason"
              placeholder="Motivo (opcional)"
              className="bg-background border rounded px-2 py-1 text-xs w-full mb-2"
            />
            <button
              className={`w-full text-xs py-2 px-3 rounded font-semibold ${
                company.status === "active"
                  ? "bg-red-600/80 hover:bg-red-600 text-white"
                  : "bg-emerald-600/80 hover:bg-emerald-600 text-white"
              }`}
            >
              {company.status === "active" ? "Suspender Empresa" : "Reactivar Empresa"}
            </button>
          </form>
        </section>
      </div>

      {/* Modules Matrix for this Company */}
      <section className="panel p-5 bg-card border rounded-lg">
        <h3 className="text-base font-semibold mb-3">Módulos: Entitlements y Estado</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          {allModules?.map((m) => {
            const isEnabled = enabledModuleIds.has(m.id);
            const isEntitled = entitledCodes.has(m.code);

            return (
              <div
                key={m.id}
                className={`p-3 rounded border text-center ${
                  isEnabled
                    ? "bg-emerald-950/20 border-emerald-500/50"
                    : isEntitled
                    ? "bg-blue-950/20 border-blue-500/30"
                    : "bg-muted/10 border-border/40 opacity-60"
                }`}
              >
                <div className="font-semibold text-xs mb-1">{m.name}</div>
                <div className="text-[10px] uppercase font-mono text-muted mb-2">{m.code}</div>
                <StatusChip tone={isEnabled ? "success" : isEntitled ? "info" : "neutral"}>
                  {isEnabled ? "Activo" : isEntitled ? "Permitido" : "No incluido"}
                </StatusChip>
              </div>
            );
          })}
        </div>
      </section>

      {/* Members & Branches Grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="panel p-5 bg-card border rounded-lg">
          <h3 className="text-base font-semibold mb-3">Miembros ({memberships?.length ?? 0})</h3>
          <div className="divide-y divide-border/40 text-xs">
            {memberships?.map((m) => (
              <div key={m.id} className="py-2 flex items-center justify-between">
                <div>
                  <div className="font-medium">{(m.profiles as any)?.full_name ?? "Usuario"}</div>
                  <div className="text-[10px] text-muted font-mono">{m.user_id}</div>
                </div>
                <StatusChip tone={m.status === "active" ? "success" : "neutral"}>{m.status}</StatusChip>
              </div>
            ))}
          </div>
        </section>

        <section className="panel p-5 bg-card border rounded-lg">
          <h3 className="text-base font-semibold mb-3">Sucursales ({branches?.length ?? 0})</h3>
          <div className="divide-y divide-border/40 text-xs">
            {branches?.map((b) => (
              <div key={b.id} className="py-2 flex items-center justify-between">
                <div>
                  <div className="font-medium">{b.name}</div>
                  <div className="text-[10px] text-muted font-mono">{b.code}</div>
                </div>
                <StatusChip tone={b.is_active ? "success" : "neutral"}>
                  {b.is_active ? "Activa" : "Inactiva"}
                </StatusChip>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Platform Audit for this company */}
      <section className="panel p-5 bg-card border rounded-lg">
        <h3 className="text-base font-semibold mb-3">Auditoría de Plataforma Reciente</h3>
        <div className="divide-y divide-border/40 text-xs">
          {auditLogs?.map((log) => (
            <div key={log.id} className="py-2 flex items-center justify-between">
              <div>
                <b className="font-semibold text-primary">{log.action}</b>
                <div className="text-[10px] text-muted font-mono mt-0.5">
                  {JSON.stringify(log.metadata)}
                </div>
              </div>
              <small className="text-muted">{new Date(log.created_at).toLocaleString("es-PE")}</small>
            </div>
          ))}
          {(!auditLogs || auditLogs.length === 0) && (
            <p className="text-muted text-xs py-2">Sin acciones registradas para esta empresa.</p>
          )}
        </div>
      </section>
    </main>
  );
}
