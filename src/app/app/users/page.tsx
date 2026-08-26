import{getCompanyContexts}from"@/lib/auth/context";
import{createClient}from"@/lib/supabase/server";
import{inviteUser,revokeInvitation}from"./actions";
import{suspendMember,removeMember}from"./member-actions";
import{EmptyState}from"@/components/ui/empty-state";
import{StatusChip}from"@/components/ui/status-chip";
export default async function Users(){
 const companies=await getCompanyContexts();const s=await createClient();
 return <main className="app-content premium-real">
  <div className="premium-page-head real-head"><div><span>EQUIPO</span><h2>Usuarios y acceso</h2><p>Invitaciones, membresías y ciclo de vida de acceso por empresa.</p></div></div>
  {await Promise.all(companies.map(async c=>{
   const[{data:members},{data:roles},{data:invites}]=await Promise.all([
    s.from("company_memberships").select("id,user_id,status").eq("company_id",c.companyId),
    s.from("roles").select("id,name").eq("company_id",c.companyId).order("name"),
    s.from("company_invitations").select("id,email,status,expires_at").eq("company_id",c.companyId).order("created_at",{ascending:false}).limit(20)
   ]);
   const can=c.permissions.includes("users.invite");
   const active=(members??[]).filter(x=>x.status==="active").length;
   return <section className="tenant-section" key={c.companyId}>
    <div className="tenant-section-head"><div><span>EMPRESA</span><h3>{c.companyName}</h3><p>{active} miembros activos</p></div>{can&&<StatusChip tone="info">Gestión habilitada</StatusChip>}</div>
    <div className="mini-kpis"><article><span>Activos</span><b>{active}</b><small>Membresías vigentes</small></article><article><span>Invitaciones</span><b>{(invites??[]).filter(x=>x.status==="pending").length}</b><small>Pendientes</small></article><article><span>Roles</span><b>{roles?.length??0}</b><small>Configurados</small></article></div>
    {can&&<section className="inline-create-card invite-real"><div><span>INVITAR</span><h3>Añadir un usuario</h3><p>La invitación queda ligada a esta empresa y al correo destinatario.</p></div><form action={inviteUser}><input type="hidden" name="companyId" value={c.companyId}/><label><span>Correo</span><input name="email" type="email" placeholder="nombre@empresa.com" required/></label><label><span>Rol inicial</span><select name="roleId"><option value="">Sin rol inicial</option>{roles?.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label><button className="primary-btn">Enviar invitación</button></form></section>}
    <section className="table-card"><div className="table-card-head"><div><h3>Miembros</h3><p>Acceso efectivo a la empresa.</p></div></div>
     {members?.length?<div className="premium-table users-real"><div className="premium-tr head"><span>Usuario</span><span>Estado</span><span>Acciones</span></div>{members.map(m=><div className="premium-tr" key={m.id}><span><span className="user-cell"><i>{m.user_id.slice(0,2).toUpperCase()}</i><span><b>{m.user_id.slice(0,8)}…</b><small>ID de usuario</small></span></span></span><span><StatusChip tone={m.status==="active"?"success":m.status==="suspended"?"warning":"neutral"}>{m.status}</StatusChip></span><span>{can&&m.status==="active"?<div className="real-row-actions"><form action={suspendMember}><input type="hidden" name="companyId" value={c.companyId}/><input type="hidden" name="membershipId" value={m.id}/><button className="secondary-btn compact-btn">Suspender</button></form><form action={removeMember}><input type="hidden" name="companyId" value={c.companyId}/><input type="hidden" name="membershipId" value={m.id}/><button className="danger-btn compact-btn">Retirar</button></form></div>:<span className="muted-action">—</span>}</span></div>)}</div>:<EmptyState title="Aún no hay miembros" text="Invita personas para comenzar a construir el equipo."/>}
    </section>
    <section className="table-card"><div className="table-card-head"><div><h3>Invitaciones</h3><p>Últimas invitaciones enviadas.</p></div></div>
     {invites?.length?<div className="premium-table invite-table"><div className="premium-tr head"><span>Correo</span><span>Vencimiento</span><span>Estado</span><span>Acción</span></div>{invites.map(i=><div className="premium-tr" key={i.id}><span><b>{i.email}</b><small>Acceso pendiente</small></span><span>{new Date(i.expires_at).toLocaleString("es-PE")}</span><span><StatusChip tone={i.status==="pending"?"warning":"success"}>{i.status}</StatusChip></span><span>{can&&i.status==="pending"?<form action={revokeInvitation}><input type="hidden" name="companyId" value={c.companyId}/><input type="hidden" name="invitationId" value={i.id}/><button className="danger-btn compact-btn">Revocar</button></form>:<span className="muted-action">—</span>}</span></div>)}</div>:<EmptyState title="Sin invitaciones" text="Las invitaciones enviadas aparecerán aquí."/>}
    </section>
   </section>
  }))}
 </main>
}