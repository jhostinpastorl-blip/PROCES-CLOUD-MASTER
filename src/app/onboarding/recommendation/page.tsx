import { redirect } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { OnboardingShell } from "@/components/ui/onboarding-shell";
import { SOLUTIONS, type SolutionCode } from "@/lib/activation/catalog";
import { ACTIVATION_STEPS } from "@/lib/onboarding/workflow";
import { createClient } from "@/lib/supabase/server";
import { acceptRecommendation } from "./actions";

export default async function RecommendationStep() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await supabase.from("business_profiles").select("recommended_solution_code,recommendation_reason").eq("user_id", user.id).maybeSingle();
  if (!data?.recommended_solution_code) redirect("/onboarding/business");
  const solution = SOLUTIONS[data.recommended_solution_code as SolutionCode];
  return <OnboardingShell step={3} steps={ACTIVATION_STEPS} backHref="/onboarding/business" title="Esta es nuestra recomendación" subtitle="La sugerencia es determinista y se basa únicamente en las respuestas que acabas de dar.">
    <article className="recommendation-hero">
      <div className="solution-mark"><Icon name="store" size={28}/></div><div><span>{solution.lifecycle}</span><h3>{solution.name}</h3><p>{solution.summary}</p></div>
    </article>
    <div className="recommendation-reason"><Icon name="check" size={18}/><div><b>Por qué encaja contigo</b><p>{data.recommendation_reason}</p></div></div>
    {solution.capabilities.length>0&&<div className="capability-list">{solution.capabilities.map(x=><span key={x}>{x}</span>)}</div>}
    {!solution.activatable&&<div className="onboarding-warning"><b>Aún no se puede activar</b><span>Esta solución está en roadmap. En la oferta podrás explorar la alternativa disponible sin falsas promesas.</span></div>}
    <form action={acceptRecommendation}><button className="premium-submit">Continuar con {solution.name} <span>→</span></button></form>
  </OnboardingShell>;
}
