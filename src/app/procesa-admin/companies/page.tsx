import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/platform/admin";
import { StatusChip } from "@/components/ui/status-chip";
import { getSubscriptionStatusLabel, getSubscriptionStatusTone } from "@/lib/plans/limits";

export default async function Companies({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; status?: string; plan?: string }>;
}) {
  const { s } = await requirePlatformAdmin();
  const params = await searchParams;
  const q = params?.q?.trim();

  let query = s
    .from("companies")
    .select(`
      id,
      name,
      legal_name,
      tax_id,
      currency,
      status,
      created_at,
      subscriptions(id, status, ends_at, plans(code, name, max_users, max_branches)),
      company_memberships(id),
      branches(id)
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  if (q) {
    query = query.or(`name.ilike.%${q}%,legal_name.ilike.%${q}%,tax_id.ilike.%${q}%`);
  }

  const { data: companies, error } = await query;
  if (error) console.error("Error fetching companies:", error);

  return (
    <main className="app-content premium-real admin-real">
      <div className="premium-page-head real-head">
        <div>
          <span>CONTROL PLANE</span>
          <h2>Empresas (Tenants)</h2>
          <p>Registro global de empresas cliente. Administra planes, estados de suscripción y límites.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">Total mostradas: {companies?.length ?? 0}</span>
        </div>
      </div>

      {/* Filter / Search bar */}
      <div className="my-4 p-4 bg-card/60 border rounded-lg flex flex-wrap items-center gap-3 justify-between">
        <form className="flex items-center gap-2 flex-1 max-w-md">
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar por nombre, razón social o RUC..."
            className="w-full bg-background border px-3 py-2 rounded text-sm"
          />
          <button className="primary-btn text-sm py-2 px-4">Buscar</button>
          {q && (
            <Link href="/procesa-admin/companies" className="secondary-btn text-sm py-2 px-3">
              Limpiar
            </Link>
          )}
        </form>
      </div>

      {/* Companies Table */}
      <section className="panel bg-card border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 border-b border-border/60 text-xs font-semibold text-muted uppercase tracking-wider">
              <tr>
                <th className="p-3">Empresa</th>
                <th className="p-3">RUC / Tax ID</th>
                <th className="p-3">Plan</th>
                <th className="p-3">Suscripción</th>
                <th className="p-3">Usuarios</th>
                <th className="p-3">Sucursales</th>
                <th className="p-3">Fecha Alta</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {companies?.map((c) => {
                const sub = (c.subscriptions as any)?.[0] ?? null;
                const plan = sub?.plans ?? null;
                const userCount = (c.company_memberships as any)?.length ?? 0;
                const branchCount = (c.branches as any)?.length ?? 0;
                const subStatus = sub?.status ?? "trial";

                return (
                  <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-3">
                      <Link href={`/procesa-admin/companies/${c.id}`} className="font-semibold hover:underline text-primary">
                        {c.name}
                      </Link>
                      <div className="text-xs text-muted">{c.legal_name ?? "—"}</div>
                    </td>
                    <td className="p-3 font-mono text-xs">{c.tax_id ?? "—"}</td>
                    <td className="p-3">
                      <span className="font-medium">{plan?.name ?? "Free"}</span>
                    </td>
                    <td className="p-3">
                      <StatusChip tone={getSubscriptionStatusTone(subStatus) as any}>
                        {getSubscriptionStatusLabel(subStatus)}
                      </StatusChip>
                    </td>
                    <td className="p-3 font-mono text-xs">
                      {userCount}
                      {plan?.max_users ? ` / ${plan.max_users}` : ""}
                    </td>
                    <td className="p-3 font-mono text-xs">
                      {branchCount}
                      {plan?.max_branches ? ` / ${plan.max_branches}` : ""}
                    </td>
                    <td className="p-3 text-xs text-muted">
                      {new Date(c.created_at).toLocaleDateString("es-PE")}
                    </td>
                    <td className="p-3 text-right">
                      <Link
                        href={`/procesa-admin/companies/${c.id}`}
                        className="secondary-btn text-xs py-1 px-3 inline-block"
                      >
                        Detalle →
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {(!companies || companies.length === 0) && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted">
                    No se encontraron empresas con el criterio especificado.
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