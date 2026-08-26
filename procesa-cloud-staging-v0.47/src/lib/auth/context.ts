import {createClient} from "@/lib/supabase/server";
export type CompanyContext={membershipId:string;companyId:string;companyName:string;roleCodes:string[];permissions:string[]};
export async function getUser(){const s=await createClient();const{data}=await s.auth.getUser();return data.user}
export async function getCompanyContexts():Promise<CompanyContext[]>{const s=await createClient();const user=await getUser();if(!user)return[];const{data,error}=await s.rpc("get_my_company_contexts");if(error)throw error;return(data??[]) as CompanyContext[]}
export async function requireCompany(companyId:string){const contexts=await getCompanyContexts();const ctx=contexts.find(x=>x.companyId===companyId);if(!ctx)throw new Error("FORBIDDEN_COMPANY");return ctx}
