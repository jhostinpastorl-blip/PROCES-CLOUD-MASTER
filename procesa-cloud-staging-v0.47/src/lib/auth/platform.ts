import{createClient}from"@/lib/supabase/server";import{redirect}from"next/navigation";
export async function requirePlatformAdmin(){const s=await createClient();const{data:{user}}=await s.auth.getUser();if(!user)redirect("/login");const{data,error}=await s.rpc("is_platform_admin");if(error||!data)redirect("/app/dashboard");return user}
