import{getCompanyContexts}from"@/lib/auth/context";
import{createClient}from"@/lib/supabase/server";
import{EmptyState}from"@/components/ui/empty-state";
export default async function Audit(){
 const companies=await getCompanyContexts();const s=await createClient();
 return <main className="app-content premium-real">
  <div className="premium-page-head real-head"><div><span>CONTROL</span><h2>Auditoría</h2><p>Historial inmutable de acciones críticas por empresa.</p></div></div>
  {await Promise.all(companies.map(async c=>{
   if(!c.permissions.includes("audit.read"))return <section className="tenant-section" key={c.companyId}><div className="tenant-section-head"><div><span>EMPRESA</span><h3>{c.companyName}</h3><p>No tienes permiso para consultar auditoría.</p></div></div></section>;
   const{data}=await s.from("audit_logs").select("id,action,entity_type,entity_id,actor_user_id,created_at,request_id,source").eq("company_id",c.companyId).order("created_at",{ascending:false}).limit(80);
   return <section className="tenant-section" key={c.companyId}><div className="tenant-section-head"><div><span>EMPRESA</span><h3>{c.companyName}</h3><p>{data?.length??0} eventos recientes</p></div></div><section className="table-card"><div className="table-card-head"><div><h3>Actividad reciente</h3><p>Eventos sensibles y trazabilidad del Core.</p></div></div>{data?.length?<div className="audit-timeline">{data.map(a=><div key={a.id}><span className="audit-dot"/><div><b>{a.action}</b><small>{a.entity_type}{a.entity_id?` · ${a.entity_id.slice(0,8)}…`:""}</small></div><div><span>{a.source??"app"}</span><small>{new Date(a.created_at).toLocaleString("es-PE")}</small></div></div>)}</div>:<EmptyState title="Sin eventos registrados" text="Las acciones críticas de esta empresa aparecerán aquí."/>}</section></section>
  }))}
 </main>
}