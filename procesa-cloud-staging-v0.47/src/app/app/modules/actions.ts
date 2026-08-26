"use server";
import{z}from"zod";import{revalidatePath}from"next/cache";import{createClient}from"@/lib/supabase/server";
import{requirePermission}from"@/lib/auth/permissions";import{audit}from"@/lib/audit/log";
export async function setCompanyModule(f:FormData){
 const companyId=z.string().uuid().parse(f.get("companyId"));
 const moduleId=z.string().uuid().parse(f.get("moduleId"));
 const enabled=String(f.get("enabled"))==="true";
 await requirePermission(companyId,"modules.manage");
 const s=await createClient();
 const{data:m}=await s.from("modules").select("id,code").eq("id",moduleId).single();
 if(!m)throw new Error("MODULE_NOT_FOUND");
 const{error}=await s.from("company_modules").upsert({company_id:companyId,module_id:moduleId,enabled},{onConflict:"company_id,module_id"});
 if(error)throw error;
 await audit(companyId,enabled?"module.enabled":"module.disabled","module",moduleId,{code:m.code});
 revalidatePath("/app/modules");
}
