import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/platform/admin";
import { logout } from "@/app/logout/actions";
import { ProcesaLogo } from "@/components/ui/procesa-logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requirePlatformAdmin();
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <Link className="sidebar-brand-link" href="/procesa-admin">
          <ProcesaLogo variant="dark" />
        </Link>
        <div className="sidebar-label">PLATAFORMA</div>
        <nav>
          <Link className="sidebar-link" href="/procesa-admin">Resumen</Link>
          <Link className="sidebar-link" href="/procesa-admin/companies">Empresas</Link>
          <Link className="sidebar-link" href="/procesa-admin/plans">Planes</Link>
          <Link className="sidebar-link" href="/procesa-admin/modules">Módulos</Link>
          <Link className="sidebar-link" href="/procesa-admin/demo-requests">Solicitudes demo</Link>
          <Link className="sidebar-link" href="/procesa-admin/audit">Auditoría plataforma</Link>
        </nav>
      </aside>
      <div className="app-main">
        <header className="app-topbar">
          <div>
            <b>PROCESA CORP</b>
            <small> · Super Admin</small>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ThemeToggle />
            <form action={logout}>
              <button className="pc-btn pc-btn-secondary pc-btn-sm">Salir</button>
            </form>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}