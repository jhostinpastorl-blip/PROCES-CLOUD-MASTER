import { getCompanyContexts } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { StatusChip } from "@/components/ui/status-chip";
import {
  getCompanySubscription,
  getSubscriptionStatusLabel,
  getSubscriptionStatusTone,
  getTrialDaysRemaining,
  isSubscriptionOperable,
} from "@/lib/plans/limits";

export default async function Subscription() {
  const companies = await getCompanyContexts();
  const s = await createClient();

  return (
    <main className="app-content premium-real">
      <div className="premium-page-head real-head">
        <div>
          <span>PLAN Y CAPACIDAD</span>
          <h2>Suscripción</h2>
          <p>Consulta el plan activo, estado del ciclo comercial y capacidades contratadas por empresa.</p>
        </div>
      </div>
      {await Promise.all(
        companies.map(async (c) => {
          const sub = await getCompanySubscription(c.companyId);
          const plan = sub?.plan;
          const status = sub?.status ?? "trial";
          const isOperable = isSubscriptionOperable(sub);
          const trialDays = sub?.status === "trial" ? getTrialDaysRemaining(sub.ends_at) : null;

          const [{ count: users }, { count: branches }] = await Promise.all([
            s
              .from("company_memberships")
              .select("id", { count: "exact", head: true })
              .eq("company_id", c.companyId)
              .eq("status", "active"),
            s
              .from("branches")
              .select("id", { count: "exact", head: true })
              .eq("company_id", c.companyId)
              .eq("is_active", true),
          ]);

          const userPct = plan?.max_users
            ? Math.min(100, Math.round(((users ?? 0) / plan.max_users) * 100))
            : 0;
          const branchPct = plan?.max_branches
            ? Math.min(100, Math.round(((branches ?? 0) / plan.max_branches) * 100))
            : 0;

          return (
            <section className="subscription-premium" key={c.companyId}>
              {!isOperable && (
                <div className="notice-banner error-banner mb-4 p-4 rounded bg-red-900/30 border border-red-500 text-red-200">
                  <b>Suscripción restringida:</b> Tu suscripción se encuentra {getSubscriptionStatusLabel(status).toLowerCase()}. Las operaciones de creación y modificación están temporalmente limitadas. Contacta al equipo de soporte de PROCESA CORP.
                </div>
              )}

              {status === "trial" && trialDays !== null && trialDays <= 5 && isOperable && (
                <div className="notice-banner warning-banner mb-4 p-4 rounded bg-amber-900/30 border border-amber-500 text-amber-200">
                  <b>Aviso de Trial:</b> Te quedan {trialDays} día{trialDays !== 1 ? "s" : ""} de período de prueba. Contacta a PROCESA para seleccionar tu plan definitivo.
                </div>
              )}

              <div className="subscription-hero">
                <div>
                  <span>EMPRESA</span>
                  <h3>{c.companyName}</h3>
                  <p>Plan actual y capacidad operativa.</p>
                </div>
                <div className="plan-badge-large">
                  <small>PLAN</small>
                  <b>{plan?.name ?? "Sin plan"}</b>
                  <StatusChip tone={getSubscriptionStatusTone(status) as any}>
                    {getSubscriptionStatusLabel(status)}
                  </StatusChip>
                </div>
              </div>

              <div className="capacity-grid">
                <article>
                  <div>
                    <span>Usuarios</span>
                    <b>
                      {users ?? 0}
                      {plan?.max_users ? ` / ${plan.max_users}` : " (Ilimitados)"}
                    </b>
                  </div>
                  <div className="progress">
                    <i style={{ width: `${plan?.max_users ? userPct : 0}%` }} />
                  </div>
                  <small>
                    {plan?.max_users ? `${userPct}% de capacidad usada` : "Capacidad sin límite"}
                  </small>
                </article>
                <article>
                  <div>
                    <span>Sucursales</span>
                    <b>
                      {branches ?? 0}
                      {plan?.max_branches ? ` / ${plan.max_branches}` : " (Ilimitadas)"}
                    </b>
                  </div>
                  <div className="progress">
                    <i style={{ width: `${plan?.max_branches ? branchPct : 0}%` }} />
                  </div>
                  <small>
                    {plan?.max_branches ? `${branchPct}% de capacidad usada` : "Capacidad sin límite"}
                  </small>
                </article>
              </div>

              <div className="subscription-info-grid">
                <article>
                  <span>ESTADO COMERCIAL</span>
                  <b>{getSubscriptionStatusLabel(status)}</b>
                </article>
                <article>
                  <span>{status === "trial" ? "VENCIMIENTO TRIAL" : "VENCIMIENTO PERIODO"}</span>
                  <b>
                    {sub?.ends_at
                      ? `${new Date(sub.ends_at).toLocaleDateString("es-PE")} ${trialDays !== null ? `(${trialDays}d)` : ""}`
                      : "Permanente"}
                  </b>
                </article>
                <article>
                  <span>FACTURACIÓN</span>
                  <b>PROCESA CORP (Gestión Directa)</b>
                </article>
              </div>
            </section>
          );
        })
      )}
    </main>
  );
}