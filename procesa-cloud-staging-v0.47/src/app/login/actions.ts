"use server";
import{redirect}from"next/navigation";import{createClient}from"@/lib/supabase/server";import{localRateLimit}from"@/lib/security/rate-limit";import{requestFingerprint}from"@/lib/security/request";
export async function login(f:FormData){
 const key=await requestFingerprint("login");if(!localRateLimit(key,10,15*60_000).ok)redirect("/login?error=rate");
 const email=String(f.get("email")||"").trim().toLowerCase(),password=String(f.get("password")||"");
 const s=await createClient();const{error}=await s.auth.signInWithPassword({email,password});
 if(error)redirect("/login?error=credentials");redirect("/app/dashboard");
}
