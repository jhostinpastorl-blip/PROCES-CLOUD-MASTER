import{getCompanyContexts}from"@/lib/auth/context";
import{createClient}from"@/lib/supabase/server";
import{EmptyState}from"@/components/ui/empty-state";
import{StatusChip}from"@/components/ui/status-chip";
export default async function Notifications(){
 const companies=await getCompanyContexts();const s=await createClient();
 return <main className="app-content premium-real">
  <div className="premium-page-head real-head"><div><span>CENTRO DE AVISOS</span><h2>Notificaciones</h2><p>Alertas operativas, seguridad y actividad relevante.</p></div></div>
  {await Promise.all(companies.map(async c=>{
   const{data}=await s.from("notifications").select("id,title,body,type,read_at,created_at").eq("company_id",c.companyId).order("created_at",{ascending:false}).limit(50);
   const unread=(data??[]).filter(x=>!x.read_at).length;
   return <section className="tenant-section" key={c.companyId}><div className="tenant-section-head"><div><span>EMPRESA</span><h3>{c.companyName}</h3><p>{unread} sin leer</p></div>{unread>0&&<StatusChip tone="info">{unread} nuevas</StatusChip>}</div><section className="notification-list">{data?.length?data.map(n=><article className={!n.read_at?"unread":""} key={n.id}><i>{n.type==="security"?"▣":n.type==="warning"?"!":"◆"}</i><div><div><h3>{n.title}</h3>{!n.read_at&&<span>NUEVA</span>}</div><p>{n.body}</p><small>{new Date(n.created_at).toLocaleString("es-PE")}</small></div></article>):<EmptyState title="Todo al día" text="No tienes notificaciones para esta empresa."/ >}</section></section>
  }))}
 </main>
}