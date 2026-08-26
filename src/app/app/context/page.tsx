import Link from"next/link";
import{getCompanyContexts}from"@/lib/auth/context";
import{createClient}from"@/lib/supabase/server";
import{setActiveContext}from"./actions";
import{StatusChip}from"@/components/ui/status-chip";
export default async function ContextPage(){
 const companies=await getCompanyContexts();const s=await createClient();
 return <main className="app-content premium-real">
  <div className="premium-page-head real-head"><div><span>CONTEXTO DE TRABAJO</span><h2>Empresa y sucursal</h2><p>Define el alcance operativo antes de trabajar en PROCESA Cloud.</p></div></div>
  <div className="context-selector-grid">{await Promise.all(companies.map(async c=>{
   const{data:branches}=await s.from("branches").select("id,name,code").eq("company_id",c.companyId).eq("is_active",true).order("name");
   return <article className="context-select-card" key={c.companyId}><div className="context-company-head"><span className="company-avatar large">{c.companyName.slice(0,2).toUpperCase()}</span><div><h3>{c.companyName}</h3><p>{c.roleCodes.join(" · ")||"Sin rol asignado"}</p></div><StatusChip tone="success">Activa</StatusChip></div><div className="context-permissions"><span>{c.permissions.length} permisos efectivos</span></div><form action={setActiveContext}><input type="hidden" name="companyId" value={c.companyId}/><label><span>Sucursal</span><select name="branchId"><option value="">Todas las sucursales</option>{branches?.map(b=><option key={b.id} value={b.id}>{b.name} · {b.code}</option>)}</select></label><button className="primary-btn">Usar este contexto →</button></form></article>
  }))}</div><div className="context-help"><div>▣</div><div><h3>Tu contexto protege los datos</h3><p>Las acciones posteriores se validan nuevamente en backend y RLS. Cambiar contexto no concede permisos adicionales.</p></div><Link href="/app/security">Ver seguridad →</Link></div>
 </main>
}