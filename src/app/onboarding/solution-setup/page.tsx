import {redirect} from "next/navigation";
import {Icon} from "@/components/ui/icon";
import {OnboardingShell} from "@/components/ui/onboarding-shell";
import {requireCompany} from "@/lib/auth/context";
import {ACTIVATION_STEPS} from "@/lib/onboarding/workflow";
import {finishActivation} from "./actions";
export default async function SolutionSetupStep({searchParams}:{searchParams:Promise<{company?:string}>}){const{company=""}=await searchParams;if(!company)redirect("/onboarding/company");const context=await requireCompany(company);return <OnboardingShell step={8} steps={ACTIVATION_STEPS} context={context.companyName} title="Tu siguiente acción está clara" subtitle="La solución ya está activada, pero aún necesita configuración operativa antes de vender."><div className="next-action-card"><div className="solution-mark"><Icon name="settings" size={28}/></div><div><span>SIGUIENTE ACCIÓN RECOMENDADA</span><h3>Configura tu catálogo y tu caja</h3><p>Al entrar al dashboard podrás registrar productos, almacenes, cajas y usuarios. El estado seguirá como “configurando” hasta completar lo necesario.</p></div></div><form action={finishActivation}><input type="hidden" name="companyId" value={company}/><button className="premium-submit">Ir al dashboard <span>→</span></button></form></OnboardingShell>}
