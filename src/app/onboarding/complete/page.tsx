import {redirect} from "next/navigation";
export default async function LegacyComplete({searchParams}:{searchParams:Promise<{company?:string}>}){const{company}=await searchParams;redirect(company?`/onboarding/solution-setup?company=${company}`:"/app/dashboard")}
