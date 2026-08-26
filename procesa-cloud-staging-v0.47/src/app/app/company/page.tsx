import Link from"next/link";
import{getCompanyContexts}from"@/lib/auth/context";
import{EmptyState}from"@/components/ui/empty-state";
import{StatusChip}from"@/components/ui/status-chip";
export default async function Company(){
 const companies=await getCompanyContexts();
 return <main className="app-content premium-real">
  <div className="premium-page-head real-head"><div><span>ORGANIZACIÓN</span><h2>Mis empresas</h2><p>Espacios empresariales a los que tienes acceso efectivo.</p></div></div>
  {companies.length?<div className="real-company-grid">{companies.map(c=><article className="real-company-card" key={c.companyId}>
   <div className="real-company-card-head"><span className="company-avatar large">{c.companyName.slice(0,2).toUpperCase()}</span><StatusChip tone="success">Activa</StatusChip></div>
   <h3>{c.companyName}</h3><p>{c.roleCodes.length?c.roleCodes.join(" · "):"Sin rol asignado"}</p>
   <div className="real-company-meta"><div><span>Permisos</span><b>{c.permissions.length}</b></div><div><span>Contexto</span><b>Disponible</b></div></div>
   <footer><Link className="secondary-btn" href={`/app/context?company=${c.companyId}`}>Seleccionar</Link><Link className="primary-btn" href={`/app/dashboard?company=${c.companyId}`}>Entrar →</Link></footer>
  </article>)}</div>:<section className="table-card"><EmptyState title="No tienes empresas disponibles" text="Cuando pertenezcas a una empresa activa, aparecerá aquí."/></section>}
 </main>
}