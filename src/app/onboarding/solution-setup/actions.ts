"use server";
import {redirect} from "next/navigation";
import {z} from "zod";
import {requireCompany} from "@/lib/auth/context";
import {createClient} from "@/lib/supabase/server";
export async function finishActivation(formData:FormData){const companyId=z.string().uuid().parse(formData.get("companyId"));await requireCompany(companyId);const supabase=await createClient();const{error}=await supabase.rpc("complete_activation_foundation",{p_company_id:companyId});if(error)throw error;redirect("/app/dashboard")}
