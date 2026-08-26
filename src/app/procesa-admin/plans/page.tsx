import { requirePlatformAdmin } from "@/lib/platform/admin";
import { StatusChip } from "@/components/ui/status-chip";

export default async function Plans() {
  const { s } = await requirePlatformAdmin();
  const { data: plans } = await s
    .from("plans")
    .select("id, code, name, max_users, max_branches, module_codes, is_active")
    .order("code");

  return (
    <main className="app-content premium-real admin-real">
      <div className="premium-page-head real-head">
        <div>
          <span>CATÁLOGO Y LÍMITES</span>
          <h2>Planes de PROCESA Cloud</h2>
          <p>Definición de capacidades técnicas, cuotas de usuarios/sucursales y entitlements de módulos por plan.</p>
        </div>
        <StatusChip tone="info">Catálogo Central</StatusChip>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 my-6">
        {plans?.map((p) => {
          const modules: string[] = (p.module_codes as string[]) ?? [];

          return (
            <div
              key={p.id}
              className="panel p-6 bg-card border rounded-lg flex flex-col justify-between space-y-4 hover:border-primary/50 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="eyebrow uppercase font-mono text-xs text-primary">{p.code}</span>
                  <StatusChip tone={p.is_active ? "success" : "neutral"}>
                    {p.is_active ? "Activo" : "Inactivo"}
                  </StatusChip>
                </div>
                <h2 className="text-xl font-bold mb-3">{p.name}</h2>

                <div className="space-y-2 py-3 border-y border-border/40 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted">Usuarios Máximos:</span>
                    <b className="font-mono">{p.max_users ?? "Ilimitados (∞)"}</b>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Sucursales Máximas:</span>
                    <b className="font-mono">{p.max_branches ?? "Ilimitadas (∞)"}</b>
                  </div>
                </div>

                <div className="mt-4">
                  <span className="text-xs text-muted block font-semibold mb-2 uppercase tracking-wider">
                    Módulos con Entitlement ({modules.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {modules.map((m) => (
                      <span
                        key={m}
                        className="text-[11px] font-mono px-2 py-0.5 rounded bg-muted/40 text-foreground border border-border/40"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-muted pt-3 border-t border-border/40 font-mono">
                ID: {p.id}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}