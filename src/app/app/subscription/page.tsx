import{getCompanyContexts}from"@/lib/auth/context";
import{createClient}from"@/lib/supabase/server";
import{StatusChip}from"@/components/ui/status-chip";
export default async function Subscription(){
 const companies=await getCompanyContexts();const s=await createClient();
 return <main className="app-content premium-real">
  <div className="premium-page-head real-head"><div><span>PLAN Y CAPACIDAD</span><h2>Suscripción</h2><p>Consulta el plan activo y los límites aplicables por empresa.</p></div></div>
  {await Promise.all(companies.map(async c=>{
   const{data:sub}=await s.from("subscriptions").select("id,status,ends_at,plan_id").eq("company_id",c.companyId).order("created_at",{ascending:false}).limit(1).maybeSingle();
   let plan:any=null;if(sub?.plan_id){const{data}=await s.from("plans").select("code,name,max_users,max_branches").eq("id",sub.plan_id).maybeSingle();plan=data}
   const [{count:users},{count:branches}]=await Promise.all([
    s.from("company_memberships").select("id",{count:"exact",head:true}).eq("company_id",c.companyId).eq("status","active"),
    s.from("branches").select("id",{count:"exact",head:true}).eq("company_id",c.companyId).eq("is_active",true)
   ]);
   const userPct=plan?.max_users?Math.min(100,Math.round(((users??0)/plan.max_users)*100)):0;
   const branchPct=plan?.max_branches?Math.min(100,Math.round(((branches??0)/plan.max_branches)*100)):0;
   return <section className="subscription-premium" key={c.companyId}>
    <div className="subscription-hero"><div><span>EMPRESA</span><h3>{c.companyName}</h3><p>Plan actual y capacidad contratada.</p></div><div className="plan-badge-large"><small>PLAN</small><b>{plan?.name??plan?.code??"Sin plan"}</b><StatusChip tone={sub?.status==="active"?"success":"warning"}>{sub?.status??"sin suscripción"}</StatusChip></div></div>
    <div className="capacity-grid"><article><div><span>Usuarios</span><b>{users??0}{plan?.max_users?` / ${plan.max_users}`:""}</b></div><div className="progress"><i style={{width:`${userPct}%`}}/></div><small>{userPct}% de capacidad usada</small></article><article><div><span>Sucursales</span><b>{branches??0}{plan?.max_branches?` / ${plan.max_branches}`:""}</b></div><div className="progress"><i style={{width:`${branchPct}%`}}/></div><small>{branchPct}% de capacidad usada</small></article></div>
    <div className="subscription-info-grid"><article><span>TRIAL HASTA</span><b>{sub?.status==="trial"&&sub?.ends_at?new Date(sub.ends_at).toLocaleDateString("es-PE"):"—"}</b></article><article><span>PRÓXIMO PERIODO</span><b>{sub?.ends_at?new Date(sub.ends_at).toLocaleDateString("es-PE"):"—"}</b></article><article><span>FACTURACIÓN</span><b>Pendiente de integración</b></article></div>
   </section>
  }))}
 </main>
}