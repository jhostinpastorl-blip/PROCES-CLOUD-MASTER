import Link from"next/link";
import{getResolvedContext}from"@/lib/company/resolve";
import{getCompanyContexts}from"@/lib/auth/context";
import{createClient}from"@/lib/supabase/server";
import{EmptyState}from"@/components/ui/empty-state";
import{StatusChip}from"@/components/ui/status-chip";

export default async function Dashboard(){
 const active=await getResolvedContext();
 const companies=await getCompanyContexts();
 let branchCount=0,userCount=0,moduleCount=0,noticeCount=0;
 if(active){
  const s=await createClient();
  const[b,u,m,n]=await Promise.all([
   s.from("branches").select("id",{count:"exact",head:true}).eq("company_id",active.company.companyId).eq("is_active",true),
   s.from("company_memberships").select("id",{count:"exact",head:true}).eq("company_id",active.company.companyId).eq("status","active"),
   s.from("company_modules").select("module_id",{count:"exact",head:true}).eq("company_id",active.company.companyId).eq("enabled",true),
   s.from("notifications").select("id",{count:"exact",head:true}).eq("company_id",active.company.companyId).is("read_at",null)
  ]);
  branchCount=b.count??0;userCount=u.count??0;moduleCount=m.count??0;noticeCount=n.count??0;
 }
 return <main className="app-content premium-real">
  <div className="premium-page-head real-head">
   <div><span>PROCESA CLOUD CORE</span><h2>Panel general</h2><p>Resumen operativo del contexto activo de tu empresa.</p></div>
   <Link className="primary-btn" href="/app/context">Cambiar contexto</Link>
  </div>
  {active?<><section className="welcome-band real-welcome"><div><span>CONTEXTO ACTIVO</span><h2>{active.company.companyName}</h2><p>{active.branch?.name??"Todas las sucursales"} · {active.company.roleCodes.join(", ")||"Sin rol asignado"}</p></div><StatusChip tone="success">Acceso validado</StatusChip></section>
  <section className="stats-grid real-stats">
   <article className="stat-card"><span>Sucursales activas</span><strong>{branchCount}</strong><small>Empresa actual</small></article>
   <article className="stat-card"><span>Usuarios activos</span><strong>{userCount}</strong><small>Membresías vigentes</small></article>
   <article className="stat-card"><span>Módulos activos</span><strong>{moduleCount}</strong><small>Capacidades habilitadas</small></article>
   <article className="stat-card"><span>Notificaciones</span><strong>{noticeCount}</strong><small>Pendientes de lectura</small></article>
  </section>
  <section className="real-dashboard-grid">
   <article className="table-card context-premium"><div className="table-card-head"><div><h3>Contexto de trabajo</h3><p>Empresa, sucursal y autorización efectiva.</p></div></div><div className="context-premium-grid">
    <div><span>Empresa</span><b>{active.company.companyName}</b></div>
    <div><span>Sucursal</span><b>{active.branch?.name??"Todas"}</b></div>
    <div><span>Roles</span><b>{active.company.roleCodes.join(", ")||"Sin rol"}</b></div>
    <div><span>Permisos</span><b>{active.company.permissions.length}</b></div>
   </div></article>
   <article className="table-card quick-premium"><div className="table-card-head"><div><h3>Accesos rápidos</h3><p>Operaciones frecuentes del Core.</p></div></div><div className="quick-premium-grid">
    <Link href="/app/users"><span>Equipo</span><b>Usuarios</b><i>→</i></Link>
    <Link href="/app/branches"><span>Estructura</span><b>Sucursales</b><i>→</i></Link>
    <Link href="/app/modules"><span>Ecosistema</span><b>Módulos</b><i>→</i></Link>
    <Link href="/app/audit"><span>Control</span><b>Auditoría</b><i>→</i></Link>
   </div></article>
  </section></>:<section className="table-card"><EmptyState icon="◇" title="Selecciona una empresa" text="El dashboard se activa cuando defines el contexto de empresa y sucursal." action={<Link className="primary-btn" href="/app/context">Seleccionar contexto</Link>}/></section>}
  <section className="table-card company-switcher"><div className="table-card-head"><div><h3>Empresas disponibles</h3><p>Solo aparecen tus membresías activas.</p></div><Link href="/app/company">Administrar →</Link></div>
   <div className="company-switch-list">{companies.map(c=><div key={c.companyId}><span className="company-avatar">{c.companyName.slice(0,2).toUpperCase()}</span><div><b>{c.companyName}</b><small>{c.roleCodes.join(", ")||"Sin rol asignado"}</small></div><span>{c.permissions.length} permisos</span><Link href={`/app/context?company=${c.companyId}`}>Entrar →</Link></div>)}</div>
  </section>
 </main>
}