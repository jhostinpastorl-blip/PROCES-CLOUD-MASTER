import Link from "next/link";
import {logout} from "@/app/logout/actions";
import {getResolvedContext} from "@/lib/company/resolve";
import {createClient} from "@/lib/supabase/server";
import {ThemeToggle} from "@/components/ui/theme-toggle";
import {Icon} from "@/components/ui/icon";

export async function AppTopbar(){
  const [context,supabase]=await Promise.all([getResolvedContext(),createClient()]);
  const{data:{user}}=await supabase.auth.getUser();
  const{data:profile}=user?await supabase.from("profiles").select("full_name").eq("id",user.id).maybeSingle():{data:null};
  const label=profile?.full_name||user?.email||"Perfil";
  const initials=label.split(/\s|@/).filter(Boolean).slice(0,2).map((part:string)=>part[0]).join("").toUpperCase();
  return <header className="app-topbar"><div className="topbar-context"><span className="topbar-context-label">{context?"CONTEXTO ACTIVO":"SIN CONTEXTO"}</span><b>{context?.company.companyName??"Selecciona una empresa"}</b><small>{context?context.branch?` · ${context.branch.name}`:" · Todas las sucursales":" · para comenzar"}</small></div><div className="topbar-actions"><Link className="app-command-search" href="/app/modules"><Icon name="modules" size={16}/> Explorar módulos</Link><ThemeToggle showLabel={false}/><Link className="topbar-icon" href="/app/notifications" title="Notificaciones" aria-label="Notificaciones"><Icon name="bell" size={17}/></Link><Link className="topbar-avatar" href="/app/settings" title={label} aria-label={`Perfil: ${label}`}>{initials||"PC"}</Link><form action={logout}><button className="pc-btn pc-btn-secondary pc-btn-sm">Salir</button></form></div></header>;
}
