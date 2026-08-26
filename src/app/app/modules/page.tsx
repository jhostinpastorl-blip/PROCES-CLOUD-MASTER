import{getCompanyContexts}from"@/lib/auth/context";
import{createClient}from"@/lib/supabase/server";
import{setCompanyModule}from"./actions";
import{StatusChip}from"@/components/ui/status-chip";
import{EmptyState}from"@/components/ui/empty-state";
export default async function Modules(){
 const companies=await getCompanyContexts();const s=await createClient();
 const{data:catalog}=await s.from("modules").select("id,code,name,status").order("name");
 return <main className="app-content premium-real">
  <div className="premium-page-head real-head"><div><span>ECOSISTEMA</span><h2>Módulos</h2><p>Capacidades activadas para cada empresa y opciones disponibles.</p></div></div>
  {await Promise.all(companies.map(async c=>{
   const{data:enabled}=await s.from("company_modules").select("module_id,enabled").eq("company_id",c.companyId);
   const activeIds=new Set((enabled??[]).filter(x=>x.enabled).map(x=>x.module_id));
   const canManage=c.permissions.includes("modules.manage");
   return <section className="tenant-section" key={c.companyId}>
    <div className="tenant-section-head"><div><span>EMPRESA</span><h3>{c.companyName}</h3><p>{activeIds.size} módulos activos</p></div>{canManage?<StatusChip tone="info">Gestión habilitada</StatusChip>:<StatusChip tone="neutral">Solo lectura</StatusChip>}</div>
    {catalog?.length?<div className="module-market-grid real-module-market">{catalog.map(m=>{
      const active=activeIds.has(m.id);
      return <article key={m.id}><div className="module-market-head"><span>{m.code}</span><StatusChip tone={active?"success":m.status!=="disabled"?"info":"neutral"}>{active?"Activo":m.status!=="disabled"?"Disponible":"No disponible"}</StatusChip></div><h3>{m.name}</h3><p>{"Módulo empresarial integrado a PROCESA Cloud."}</p><div className="module-market-foot">{canManage&&m.status!=="disabled"?<form action={setCompanyModule}><input type="hidden" name="companyId" value={c.companyId}/><input type="hidden" name="moduleId" value={m.id}/><input type="hidden" name="enabled" value={active?"false":"true"}/><button className={active?"secondary-btn":"primary-btn"}>{active?"Desactivar":"Activar módulo"}</button></form>:<button className="secondary-btn" disabled>{active?"Activo":"No disponible"}</button>}</div></article>
    })}</div>:<section className="table-card"><EmptyState title="Sin módulos publicados" text="El catálogo de módulos aparecerá aquí cuando esté disponible."/></section>}
   </section>
  }))}
 </main>
}