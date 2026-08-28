import { logout } from "@/app/logout/actions";
import { getResolvedContext } from "@/lib/company/resolve";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import Link from "next/link";

export async function AppTopbar() {
  const c = await getResolvedContext();
  return (
    <header className="app-topbar">
      <div className="topbar-context">
        <span className="topbar-context-label">CONTEXTO ACTIVO</span>
        <b>{c?.company.companyName ?? "PROCESA Cloud"}</b>
        <small>{c?.branch ? ` · ${c.branch.name}` : " · Todas las sucursales"}</small>
      </div>
      <div className="topbar-actions">
        <Link className="app-command-search" href="/app/modules"><span aria-hidden="true">⌕</span> Buscar en PROCESA <kbd>⌘K</kbd></Link>
        <ThemeToggle showLabel={false} />
        <Link className="topbar-icon" href="/app/notifications" title="Notificaciones" aria-label="Notificaciones">◌</Link>
        <span className="topbar-avatar" aria-label="Perfil de PROCESA Cloud">PC</span>
        <form action={logout}>
          <button className="pc-btn pc-btn-secondary pc-btn-sm">Salir</button>
        </form>
      </div>
    </header>
  );
}
