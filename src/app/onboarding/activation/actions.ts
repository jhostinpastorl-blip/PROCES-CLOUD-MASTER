"use server";
import {redirect} from "next/navigation";
import {z} from "zod";
import {requireCompany} from "@/lib/auth/context";
import {saveCanonicalOnboarding} from "@/lib/onboarding/persist";
import {createClient} from "@/lib/supabase/server";
export async function activatePackage(formData:FormData){const companyId=z.string().uuid().parse(formData.get("companyId"));const packageCode=z.literal("pos-starter").parse(formData.get("packageCode"));await requireCompany(companyId);const supabase=await createClient();const{error}=await supabase.rpc("activate_solution_package",{p_company_id:companyId,p_package_code:packageCode});if(error)throw error;await saveCanonicalOnboarding("solution_setup",{lastCompletedStep:"activation",companyId,metadata:{packageCode}});redirect(`/onboarding/solution-setup?company=${companyId}`)}
