import { logout } from "@/app/logout/actions";
import { getResolvedContext } from "@/lib/company/resolve";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export async function AppTopbar() {
  const c = await getResolvedContext();
  return (
    <header className="app-topbar">
      <div>
        <b>{c?.company.companyName ?? "PROCESA Cloud"}</b>
        <small>{c?.branch ? ` · ${c.branch.name}` : " · Todas las sucursales"}</small>
      </div>
      <div className="topbar-actions">
        <ThemeToggle />
        <a className="topbar-icon" href="/app/notifications" title="Notificaciones">
          ●
        </a>
        <form action={logout}>
          <button className="pc-btn pc-btn-secondary pc-btn-sm">Salir</button>
        </form>
      </div>
    </header>
  );
}