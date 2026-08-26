import {createClient} from "@/lib/supabase/server";
export async function audit(companyId:string,action:string,entityType?:string,entityId?:string,metadata:Record<string,unknown>={}){
 const s=await createClient();const{data:{user}}=await s.auth.getUser();
 if(!user) throw new Error("UNAUTHENTICATED");
 const{error}=await s.from("audit_logs").insert({company_id:companyId,actor_user_id:user.id,action,entity_type:entityType??null,entity_id:entityId??null,metadata});
 if(error) throw error;
}
