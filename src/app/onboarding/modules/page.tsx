import {redirect} from "next/navigation";
export default async function LegacyModulesStep({searchParams}:{searchParams:Promise<{company?:string}>}){const{company}=await searchParams;redirect(company?`/onboarding/branch?company=${company}`:"/onboarding")}
