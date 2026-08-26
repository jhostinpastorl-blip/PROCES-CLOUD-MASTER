import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/platform/admin";
import { StatusChip } from "@/components/ui/status-chip";
import { getSubscriptionStatusLabel, getSubscriptionStatusTone } from "@/lib/plans/limits";

export default async function Admin() {
  const { s } = await requirePlatformAdmin();

  const [
    { count: totalCompanies },
    { count: activeCompanies },
    { count: totalMemberships },
    { count: activeMemberships },
    { data: subsData },
    { data: plansData },
    { data: recentCompanies },
    { data: demoRequests },
  ] = await Promise.all([
    s.from("companies").select("id", { count: "exact", head: true }),
    s.from("companies").select("id", { count: "exact", head: true }).eq("status", "active"),
    s.from("company_memberships").select("id", { count: "exact", head: true }),
    s.from("company_memberships").select("id", { count: "exact", head: true }).eq("status", "active"),
    s.from("subscriptions").select("status, plan_id, plans(code, name)"),
    s.from("plans").select("id, code, name, is_active").order("code"),
    s
      .from("companies")
      .select("id, name, legal_name, tax_id, status, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
    s.from("demo_requests").select("id", { count: "exact", head: true }).eq("status", "new"),
  ]);

  // Aggregate subscription metrics
  const subsByStatus: Record<string, number> = {
    trial: 0,
    active: 0,
    past_due: 0,
    suspended: 0,
    expired: 0,
    cancelled: 0,
  };
  const subsByPlan: Record<string, number> = {};

  (subsData ?? []).forEach((sub) => {
    subsByStatus[sub.status] = (subsByStatus[sub.status] ?? 0) + 1;
    const planName = (sub.plans as any)?.name ?? (sub.plans as any)?.code ?? "Sin plan";
    subsByPlan[planName] = (subsByPlan[planName] ?? 0) + 1;
  });

  return (
    <main className="app-content premium-real admin-real">
      <div className="premium-page-head real-head">
        <div>
          <span>PLATFORM CONTROL PLANE</span>
          <h2>PROCESA Cloud Super Admin</h2>
          <p>Consola de control operativo de PROCESA CORP. Gestión de planes, suscripciones y tenants.</p>
        </div>
        <StatusChip tone="info">Super Admin</StatusChip>
      </div>

      {/* Real Core Platform KPIs */}
      <div className="admin-kpis real-admin-kpis">
        <article>
          <span>Empresas Registradas</span>
          <b>{totalCompanies ?? 0}</b>
          <small>{activeCompanies ?? 0} activas</small>
        </article>
        <article>
          <span>Usuarios Totales</span>
          <b>{totalMemberships ?? 0}</b>
          <small>{activeMemberships ?? 0} activos</small>
        </article>
        <article>
          <span>Suscripciones en Trial</span>
          <b>{subsByStatus.trial ?? 0}</b>
          <small>{subsByStatus.active ?? 0} activas definitivas</small>
        </article>
        <article>
          <span>Leads Demo</span>
          <b>{demoRequests?.length ?? 0}</b>
          <small>Nuevas solicitudes</small>
        </article>
      </div>

      {/* Subscription Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
        <section className="panel p-5 bg-card/60 border rounded-lg">
          <h3 className="text-base font-semibold mb-3">Distribución por Estado de Suscripción</h3>
          <div className="space-y-2">
            {Object.entries(subsByStatus).map(([st, cnt]) => (
              <div key={st} className="flex items-center justify-between py-1 border-b border-border/40 text-sm">
                <div className="flex items-center gap-2">
                  <StatusChip tone={getSubscriptionStatusTone(st) as any}>
                    {getSubscriptionStatusLabel(st)}
                  </StatusChip>
                </div>
                <b className="font-mono">{cnt}</b>
              </div>
            ))}
          </div>
        </section>

        <section className="panel p-5 bg-card/60 border rounded-lg">
          <h3 className="text-base font-semibold mb-3">Distribución por Plan</h3>
          <div className="space-y-2">
            {(plansData ?? []).map((p) => {
              const count = subsByPlan[p.name] ?? 0;
              return (
                <div key={p.id} className="flex items-center justify-between py-1 border-b border-border/40 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{p.name}</span>
                    <small className="text-muted text-xs">({p.code})</small>
                  </div>
                  <b className="font-mono">{count}</b>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Recent Companies */}
      <section className="panel p-5 bg-card/60 border rounded-lg my-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">Empresas Registradas Recientes</h3>
          <Link href="/procesa-admin/companies" className="text-xs text-primary hover:underline font-medium">
            Ver todas ({totalCompanies ?? 0}) →
          </Link>
        </div>
        <div className="table-like">
          {recentCompanies?.map((x) => (
            <div className="table-row flex items-center justify-between p-3 border-b border-border/40" key={x.id}>
              <div>
                <Link href={`/procesa-admin/companies/${x.id}`} className="font-semibold text-primary hover:underline">
                  {x.name}
                </Link>
                <div className="text-xs text-muted">
                  {x.legal_name ?? "Sin razón social"} · RUC/ID: {x.tax_id ?? "—"} · Creada:{" "}
                  {new Date(x.created_at).toLocaleDateString("es-PE")}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusChip tone={x.status === "active" ? "success" : "neutral"}>{x.status}</StatusChip>
                <Link
                  href={`/procesa-admin/companies/${x.id}`}
                  className="secondary-btn text-xs py-1 px-3"
                >
                  Gestionar
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Navigation Quick Links */}
      <section className="admin-command-grid">
        <Link href="/procesa-admin/companies">
          <span>TENANTS</span>
          <h3>Gestión de Empresas</h3>
          <p>Consultar, cambiar planes, extender trials y suspender suscripciones.</p>
          <b>Entrar →</b>
        </Link>
        <Link href="/procesa-admin/plans">
          <span>CATÁLOGO</span>
          <h3>Planes y Capacidades</h3>
          <p>Configurar límites de usuarios, sucursales y módulos por plan.</p>
          <b>Entrar →</b>
        </Link>
        <Link href="/procesa-admin/modules">
          <span>ECOSISTEMA</span>
          <h3>Módulos Globales</h3>
          <p>Revisar catálogo de módulos y estado de publicación.</p>
          <b>Entrar →</b>
        </Link>
        <Link href="/procesa-admin/audit">
          <span>SEGURIDAD</span>
          <h3>Auditoría de Plataforma</h3>
          <p>Trazabilidad inmutable de acciones ejecutadas por Super Admins.</p>
          <b>Entrar →</b>
        </Link>
      </section>
    </main>
  );
}