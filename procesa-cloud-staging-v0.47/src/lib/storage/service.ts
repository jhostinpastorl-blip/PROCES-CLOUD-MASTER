import{createClient}from"@/lib/supabase/server";import{requirePermission}from"@/lib/auth/permissions";
export type StoredObjectInput={companyId:string;branchId?:string;provider:string;providerObjectId:string;logicalPath:string;originalName:string;mimeType:string;sizeBytes:number;checksum?:string};
export async function registerStoredObject(input:StoredObjectInput){
 await requirePermission(input.companyId,"storage.manage");const s=await createClient();
 const{data:{user}}=await s.auth.getUser();if(!user)throw new Error("UNAUTHENTICATED");
 const{data,error}=await s.from("storage_objects").insert({company_id:input.companyId,branch_id:input.branchId??null,provider:input.provider,provider_object_id:input.providerObjectId,logical_path:input.logicalPath,original_name:input.originalName,mime_type:input.mimeType,size_bytes:input.sizeBytes,checksum:input.checksum??null,created_by:user.id}).select("id").single();
 if(error)throw error;return data.id;
}
