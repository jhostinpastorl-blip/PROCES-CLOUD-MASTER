import { getCompanyContexts } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusChip } from "@/components/ui/status-chip";
import { markRead, markAllRead } from "./actions";

export default async function Notifications() {
  const companies = await getCompanyContexts();
  const s = await createClient();

  return (
    <main className="app-content premium-real">
      <div className="premium-page-head real-head">
        <div>
          <span>CENTRO DE AVISOS</span>
          <h2>Notificaciones</h2>
          <p>Alertas operativas, avisos de plan, seguridad y eventos relevantes de tu empresa.</p>
        </div>
      </div>
      {await Promise.all(
        companies.map(async (c) => {
          const { data } = await s
            .from("notifications")
            .select("id,title,body,type,read_at,created_at")
            .eq("company_id", c.companyId)
            .order("created_at", { ascending: false })
            .limit(50);

          const unread = (data ?? []).filter((x) => !x.read_at).length;

          return (
            <section className="tenant-section" key={c.companyId}>
              <div className="tenant-section-head">
                <div>
                  <span>EMPRESA</span>
                  <h3>{c.companyName}</h3>
                  <p>{unread} sin leer</p>
                </div>
                <div className="flex items-center gap-3">
                  {unread > 0 && <StatusChip tone="info">{unread} nuevas</StatusChip>}
                  {unread > 0 && (
                    <form action={markAllRead}>
                      <input type="hidden" name="companyId" value={c.companyId} />
                      <button className="secondary-btn text-xs py-1 px-2">Marcar todas leídas</button>
                    </form>
                  )}
                </div>
              </div>
              <section className="notification-list">
                {data?.length ? (
                  data.map((n) => {
                    const isUnread = !n.read_at;
                    const tone =
                      n.type === "error"
                        ? "error"
                        : n.type === "warning"
                        ? "warning"
                        : n.type === "success"
                        ? "success"
                        : "info";

                    return (
                      <article className={isUnread ? "unread" : ""} key={n.id}>
                        <i>
                          {n.type === "error"
                            ? "✖"
                            : n.type === "warning"
                            ? "!"
                            : n.type === "success"
                            ? "✓"
                            : "◆"}
                        </i>
                        <div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <h3>{n.title}</h3>
                              <StatusChip tone={tone as any}>{n.type ?? "info"}</StatusChip>
                              {isUnread && <span className="badge-new">NUEVA</span>}
                            </div>
                            {isUnread && (
                              <form action={markRead}>
                                <input type="hidden" name="id" value={n.id} />
                                <button className="text-xs text-muted hover:text-white underline">
                                  Marcar leída
                                </button>
                              </form>
                            )}
                          </div>
                          <p>{n.body}</p>
                          <small>{new Date(n.created_at).toLocaleString("es-PE")}</small>
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <EmptyState title="Todo al día" text="No tienes notificaciones pendientes para esta empresa." />
                )}
              </section>
            </section>
          );
        })
      )}
    </main>
  );
}