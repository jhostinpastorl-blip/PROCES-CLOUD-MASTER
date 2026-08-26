import{redirect}from"next/navigation";import{getOnboardingStatus}from"./status";
export async function redirectToOnboardingStep(){
 const s=await getOnboardingStatus();
 if(s.step==="plan")redirect("/onboarding/plan");
 if(s.step==="company")redirect("/onboarding/company");
 if(s.step==="modules")redirect(`/onboarding/modules?company=${s.state?.company_id??""}`);
 if(s.step==="branch")redirect(`/onboarding/branch?company=${s.state?.company_id??""}`);
 if(s.step==="complete")redirect("/app/context");
}
