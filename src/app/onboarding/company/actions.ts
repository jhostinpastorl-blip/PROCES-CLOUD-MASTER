"use server";
import {redirect} from "next/navigation";
import {companySchema} from "@/lib/forms/schemas";
import {formDataObject} from "@/lib/forms/from-data";
import {saveCanonicalOnboarding} from "@/lib/onboarding/persist";
import {createClient} from "@/lib/supabase/server";
export async function createCompany(formData:FormData){const input=companySchema.parse(formDataObject(formData));const supabase=await createClient();const{data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");const{data:state}=await supabase.from("onboarding_states").select("selected_plan_code").eq("user_id",user.id).single();const planCode=state?.selected_plan_code??"pro";const{data:companyId,error}=await supabase.rpc("create_company_with_trial",{p_name:input.name,p_legal_name:input.legalName,p_tax_id:input.taxId||null,p_currency:input.currency,p_timezone:input.timezone,p_plan_code:planCode});if(error)throw error;await saveCanonicalOnboarding("branch",{lastCompletedStep:"company",plan:planCode,companyId});redirect(`/onboarding/branch?company=${companyId}`)}
