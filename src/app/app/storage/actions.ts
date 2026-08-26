"use server";
import{z}from"zod";import{revalidatePath}from"next/cache";import{createClient}from"@/lib/supabase/server";
import{requirePermission}from"@/lib/auth/permissions";import{audit}from"@/lib/audit/log";
export async function softDeleteStorageObject(f:FormData){
 const companyId=z.string().uuid().parse(f.get("companyId"));const id=z.string().uuid().parse(f.get("id"));
 await requirePermission(companyId,"storage.manage");const s=await createClient();
 const{data,error}=await s.from("storage_objects").update({deleted_at:new Date().toISOString()}).eq("id",id).eq("company_id",companyId).is("deleted_at",null).select("id").maybeSingle();
 if(error)throw error;if(!data)throw new Error("STORAGE_OBJECT_NOT_FOUND");
 await audit(companyId,"storage.deleted","storage_object",id);revalidatePath("/app/storage");
}
