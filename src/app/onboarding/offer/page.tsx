import { redirect } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { OnboardingShell } from "@/components/ui/onboarding-shell";
import { SOLUTIONS, type SolutionCode } from "@/lib/activation/catalog";
import { ACTIVATION_STEPS } from "@/lib/onboarding/workflow";
import { createClient } from "@/lib/supabase/server";
import { chooseSolution } from "./actions";

export default async function OfferStep({searchParams}:{searchParams:Promise<{roadmap?:string}>}) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await supabase.from("business_profiles").select("selected_solution_code,recommended_solution_code").eq("user_id", user.id).maybeSingle();
  const selectedCode = (data?.selected_solution_code ?? data?.recommended_solution_code) as SolutionCode | undefined;
  if (!selectedCode) redirect("/onboarding/business");
  const selected = SOLUTIONS[selectedCode];
  return <OnboardingShell step={4} steps={ACTIVATION_STEPS} backHref="/onboarding/recommendation" title="Confirma tu punto de partida" subtitle="Solución, paquete y plan son conceptos distintos. Aquí verás exactamente qué se activará.">
    {(query.roadmap||!selected.activatable)&&<div className="onboarding-warning"><b>{selected.name} está en roadmap</b><span>No aceptaremos una activación que todavía no podemos cumplir. Puedes continuar con PROCESA POS o volver a ajustar tu negocio.</span></div>}
    <div className="offer-stack">
      <article><span>SOLUCIÓN</span><div><Icon name="store"/><b>PROCESA POS</b></div><p>La experiencia comercial que usarás.</p></article>
      <article><span>PAQUETE</span><div><Icon name="modules"/><b>POS Starter</b></div><p>Capacidades iniciales: ventas, caja, productos, inventario, compras, proveedores y reportes.</p></article>
      <article><span>PLAN TÉCNICO</span><div><Icon name="shield"/><b>PRO · prueba de 14 días</b></div><p>Define límites y módulos autorizados. No se muestra un precio todavía porque no existe una tarifa comercial aprobada.</p></article>
    </div>
    <form action={chooseSolution}><input type="hidden" name="solutionCode" value="pos"/><button className="premium-submit">Activar esta oferta <span>→</span></button></form>
    <a className="onboarding-text-link" href="/onboarding/business">Cambiar mis respuestas</a>
  </OnboardingShell>;
}
