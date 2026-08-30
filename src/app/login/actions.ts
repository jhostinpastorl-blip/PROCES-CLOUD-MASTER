"use server";
import{redirect}from"next/navigation";import{createClient}from"@/lib/supabase/server";import{localRateLimit}from"@/lib/security/rate-limit";import{requestFingerprint}from"@/lib/security/request";import{getFirstEntryDestination}from"@/lib/activation/entry";import{sanitizeNextPath}from"@/lib/activation/first-entry-policy";
export async function login(f:FormData){
 const formRoute=String(f.get("formRoute"))==="/iniciar-sesion"?"/iniciar-sesion":"/login";
 const key=await requestFingerprint("login");if(!localRateLimit(key,10,15*60_000).ok)redirect(`${formRoute}?error=rate`);
 const email=String(f.get("email")||"").trim().toLowerCase(),password=String(f.get("password")||"");
 const next=sanitizeNextPath(String(f.get("next")||""));
 const s=await createClient();const{error}=await s.auth.signInWithPassword({email,password});
 if(error)redirect(`${formRoute}?error=credentials${next?`&next=${encodeURIComponent(next)}`:""}`);
 redirect(await getFirstEntryDestination(next));
}
