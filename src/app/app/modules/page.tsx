import { getCompanyContexts } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { setCompanyModule } from "./actions";
import { StatusChip } from "@/components/ui/status-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { getCompanySubscription } from "@/lib/plans/limits";

export default async function Modules() {
  const companies = await getCompanyContexts();
  const s = await createClient();
  const { data: catalog } = await s.from("modules").select("id,code,name,status").order("name");

  return (
    <main className="app-content premium-real">
      <div className="premium-page-head real-head">
        <div>
          <span>ECOSISTEMA</span>
          <h2>Módulos</h2>
          <p>Capacidades activadas para cada empresa y opciones disponibles según tu plan.</p>
        </div>
      </div>
      {await Promise.all(
        companies.map(async (c) => {
          const sub = await getCompanySubscription(c.companyId);
          const entitledCodes = new Set((sub?.plan as any)?.module_codes ?? ["core"]);
          const { data: enabled } = await s
            .from("company_modules")
            .select("module_id,enabled")
            .eq("company_id", c.companyId);
          const activeIds = new Set((enabled ?? []).filter((x) => x.enabled).map((x) => x.module_id));
          const canManage = c.permissions.includes("modules.manage");

          return (
            <section className="tenant-section" key={c.companyId}>
              <div className="tenant-section-head">
                <div>
                  <span>EMPRESA</span>
                  <h3>{c.companyName}</h3>
                  <p>
                    {activeIds.size} módulos activos · Plan: <b>{sub?.plan?.name ?? "Free"}</b>
                  </p>
                </div>
                {canManage ? (
                  <StatusChip tone="info">Gestión habilitada</StatusChip>
                ) : (
                  <StatusChip tone="neutral">Solo lectura</StatusChip>
                )}
              </div>
              {catalog?.length ? (
                <div className="module-market-grid real-module-market">
                  {catalog.map((m) => {
                    const active = activeIds.has(m.id);
                    const isEntitled = entitledCodes.has(m.code);
                    const isReady = m.status === "available" || m.code === "core";

                    let chipLabel = "Disponible";
                    let chipTone: "success" | "info" | "neutral" | "warning" = "info";

                    if (active) {
                      chipLabel = "Activo";
                      chipTone = "success";
                    } else if (!isReady) {
                      chipLabel = "Próximamente";
                      chipTone = "neutral";
                    } else if (!isEntitled) {
                      chipLabel = "No incluido en plan";
                      chipTone = "warning";
                    }

                    return (
                      <article key={m.id}>
                        <div className="module-market-head">
                          <span>{m.code.toUpperCase()}</span>
                          <StatusChip tone={chipTone}>{chipLabel}</StatusChip>
                        </div>
                        <h3>{m.name}</h3>
                        <p>
                          {m.code === "core"
                            ? "Núcleo operativo base de PROCESA Cloud."
                            : !isEntitled
                            ? `Requiere plan superior para acceder. Plan actual: ${sub?.plan?.name ?? "Free"}.`
                            : !isReady
                            ? "En fase de desarrollo activo para PROCESA Cloud."
                            : "Módulo empresarial integrado listo para activar."}
                        </p>
                        <div className="module-market-foot">
                          {active ? (
                            canManage && m.code !== "core" ? (
                              <form action={setCompanyModule}>
                                <input type="hidden" name="companyId" value={c.companyId} />
                                <input type="hidden" name="moduleId" value={m.id} />
                                <input type="hidden" name="enabled" value="false" />
                                <button className="secondary-btn">Desactivar</button>
                              </form>
                            ) : (
                              <button className="secondary-btn" disabled>
                                Núcleo activo
                              </button>
                            )
                          ) : isEntitled && isReady && canManage ? (
                            <form action={setCompanyModule}>
                              <input type="hidden" name="companyId" value={c.companyId} />
                              <input type="hidden" name="moduleId" value={m.id} />
                              <input type="hidden" name="enabled" value="true" />
                              <button className="primary-btn">Activar módulo</button>
                            </form>
                          ) : (
                            <button className="secondary-btn" disabled>
                              {!isEntitled ? "No disponible en tu plan" : !isReady ? "Próximamente" : "Solo lectura"}
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <section className="table-card">
                  <EmptyState
                    title="Sin módulos publicados"
                    text="El catálogo de módulos aparecerá aquí cuando esté disponible."
                  />
                </section>
              )}
            </section>
          );
        })
      )}
    </main>
  );
}