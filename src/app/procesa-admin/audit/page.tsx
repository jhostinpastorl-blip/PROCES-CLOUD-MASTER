import { requirePlatformAdmin } from "@/lib/platform/admin";
import { StatusChip } from "@/components/ui/status-chip";

export default async function Audit({
  searchParams,
}: {
  searchParams?: Promise<{ action?: string }>;
}) {
  const { s } = await requirePlatformAdmin();
  const params = await searchParams;
  const filterAction = params?.action;

  let query = s
    .from("platform_audit_logs")
    .select("id, action, entity_type, entity_id, actor_user_id, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (filterAction) {
    query = query.eq("action", filterAction);
  }

  const { data: logs, error } = await query;
  if (error) console.error("Error fetching platform audit logs:", error);

  return (
    <main className="app-content premium-real admin-real">
      <div className="premium-page-head real-head">
        <div>
          <span>SEGURIDAD Y CONTROL</span>
          <h2>Auditoría de Plataforma</h2>
          <p>Trazabilidad inmutable de acciones ejecutadas por Super Admins de PROCESA CORP.</p>
        </div>
        <StatusChip tone="info">Platform Logs</StatusChip>
      </div>

      <section className="panel bg-card border rounded-lg overflow-hidden my-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 border-b border-border/60 text-xs font-semibold text-muted uppercase tracking-wider">
              <tr>
                <th className="p-3">Fecha y Hora</th>
                <th className="p-3">Acción</th>
                <th className="p-3">Entidad</th>
                <th className="p-3">ID Entidad</th>
                <th className="p-3">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {logs?.map((x) => (
                <tr key={x.id} className="hover:bg-muted/20 transition-colors">
                  <td className="p-3 text-xs text-muted whitespace-nowrap">
                    {new Date(x.created_at).toLocaleString("es-PE")}
                  </td>
                  <td className="p-3 font-semibold text-primary">{x.action}</td>
                  <td className="p-3 text-xs uppercase font-mono">{x.entity_type ?? "platform"}</td>
                  <td className="p-3 text-xs font-mono text-muted">{x.entity_id ?? "—"}</td>
                  <td className="p-3 text-xs font-mono max-w-xs truncate">
                    {JSON.stringify(x.metadata)}
                  </td>
                </tr>
              ))}
              {(!logs || logs.length === 0) && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted">
                    No hay eventos de auditoría registrados en la plataforma.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}