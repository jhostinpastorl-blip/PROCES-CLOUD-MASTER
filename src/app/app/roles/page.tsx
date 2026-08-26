import{getCompanyContexts}from"@/lib/auth/context";
import{createClient}from"@/lib/supabase/server";
import{createRole,assignPermission}from"./actions";
import{EmptyState}from"@/components/ui/empty-state";
import{StatusChip}from"@/components/ui/status-chip";
export default async function Roles(){
 const companies=await getCompanyContexts();const s=await createClient();
 const{data:perms}=await s.from("permissions").select("id,code,description").order("code");
 return <main className="app-content premium-real">
  <div className="premium-page-head real-head"><div><span>AUTORIZACIÓN</span><h2>Roles y permisos</h2><p>Los roles agrupan capacidades; el backend valida cada acción.</p></div></div>
  {await Promise.all(companies.map(async c=>{
   const{data:roles}=await s.from("roles").select("id,name,is_system").eq("company_id",c.companyId).order("name");
   const can=c.permissions.includes("roles.manage");
   return <section className="tenant-section" key={c.companyId}>
    <div className="tenant-section-head"><div><span>EMPRESA</span><h3>{c.companyName}</h3><p>{roles?.length??0} roles configurados</p></div>{can?<StatusChip tone="info">Puedes administrar</StatusChip>:<StatusChip tone="neutral">Solo lectura</StatusChip>}</div>
    {roles?.length?<div className="role-grid real-role-grid">{roles.map(r=><article key={r.id}><div><span className="role-icon">◆</span><StatusChip tone={r.is_system?"info":"neutral"}>{r.is_system?"Sistema":"Personalizado"}</StatusChip></div><h3>{r.name}</h3><p>{r.is_system?"Rol base administrado por PROCESA Cloud.":"Rol personalizado de esta empresa."}</p>{can&&<form action={assignPermission} className="permission-assign"><input type="hidden" name="companyId" value={c.companyId}/><input type="hidden" name="roleId" value={r.id}/><label><span>Añadir permiso</span><select name="permissionId">{perms?.map(p=><option value={p.id} key={p.id}>{p.description?`${p.description} (${p.code})`:p.code}</option>)}</select></label><button className="secondary-btn">Asignar</button></form>}</article>)}</div>:<section className="table-card"><EmptyState title="No hay roles" text="Crea un rol para comenzar a asignar capacidades."/></section>}
    {can&&<section className="inline-create-card role-create"><div><span>NUEVO ROL</span><h3>Crear rol personalizado</h3><p>Después podrás agregar permisos específicos.</p></div><form action={createRole}><input type="hidden" name="companyId" value={c.companyId}/><label><span>Nombre del rol</span><input name="name" placeholder="Ej. Gerente de operaciones" required/></label><button className="primary-btn">Crear rol</button></form></section>}
   </section>
  }))}
 </main>
}