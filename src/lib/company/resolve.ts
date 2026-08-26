import{getActiveCompany,getActiveBranchId}from"@/lib/context/active";import{createClient}from"@/lib/supabase/server";
export async function getResolvedContext(){
 const company=await getActiveCompany();if(!company)return null;
 const branchId=await getActiveBranchId();if(!branchId)return{company,branch:null};
 const s=await createClient();const{data}=await s.from("branches").select("id,name,code").eq("id",branchId).eq("company_id",company.companyId).eq("is_active",true).maybeSingle();
 return{company,branch:data??null};
}
