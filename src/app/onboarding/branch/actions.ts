"use server";
import {redirect} from "next/navigation";
import {requireCompany} from "@/lib/auth/context";
import {setActiveContext} from "@/lib/context/active";
import {firstBranchSchema} from "@/lib/forms/schemas";
import {formDataObject} from "@/lib/forms/from-data";
import {saveCanonicalOnboarding} from "@/lib/onboarding/persist";
import {createClient} from "@/lib/supabase/server";
export async function createFirstBranch(formData:FormData){const input=firstBranchSchema.parse(formDataObject(formData));await requireCompany(input.companyId);const supabase=await createClient();const{data:branchId,error}=await supabase.rpc("create_first_branch",{p_company_id:input.companyId,p_name:input.name,p_code:input.code});if(error)throw error;await setActiveContext(input.companyId,branchId);await saveCanonicalOnboarding("activation",{lastCompletedStep:"branch",companyId:input.companyId});redirect(`/onboarding/activation?company=${input.companyId}`)}
