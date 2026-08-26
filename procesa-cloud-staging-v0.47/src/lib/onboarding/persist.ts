import{createClient}from"@/lib/supabase/server";
export async function saveOnboardingState(step:"plan"|"company"|"modules"|"branch"|"complete",data:{plan?:string;companyId?:string;modules?:string[];complete?:boolean}={}){
 const s=await createClient();const{data:{user}}=await s.auth.getUser();if(!user)throw new Error("UNAUTHENTICATED");
 const payload={user_id:user.id,current_step:step,selected_plan_code:data.plan??null,company_id:data.companyId??null,selected_module_codes:data.modules??[],completed_at:data.complete?new Date().toISOString():null,updated_at:new Date().toISOString()};
 const{error}=await s.from("onboarding_states").upsert(payload,{onConflict:"user_id"});if(error)throw error;
}
