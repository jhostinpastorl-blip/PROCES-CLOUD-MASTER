"use server";
import{z}from"zod";import{createClient}from"@/lib/supabase/server";import{redirect}from"next/navigation";
import{localRateLimit}from"@/lib/security/rate-limit";import{requestFingerprint}from"@/lib/security/request";
const schema=z.object({name:z.string().min(2).max(120),company:z.string().min(2).max(160),email:z.string().email(),modules:z.string().max(500),message:z.string().max(2000).optional(),website:z.string().max(0).optional()});
export async function requestDemo(f:FormData){
 const key=await requestFingerprint("demo");if(!localRateLimit(key,5,15*60_000).ok)redirect("/demo?error=rate");
 const p=schema.safeParse(Object.fromEntries(f));if(!p.success)redirect("/demo?error=validation");
 const s=await createClient();const{error}=await s.from("demo_requests").insert({full_name:p.data.name,company_name:p.data.company,email:p.data.email.toLowerCase(),modules_interest:p.data.modules,message:p.data.message||null,status:"new"});
 if(error)redirect("/demo?error=save");redirect("/demo?sent=1");
}
