import {redirect} from "next/navigation";
import {Icon} from "@/components/ui/icon";
import {OnboardingShell} from "@/components/ui/onboarding-shell";
import {requireCompany} from "@/lib/auth/context";
import {SOLUTIONS} from "@/lib/activation/catalog";
import {ACTIVATION_STEPS} from "@/lib/onboarding/workflow";
import {activatePackage} from "./actions";
export default async function ActivationStep({searchParams}:{searchParams:Promise<{company?:string}>}){const{company=""}=await searchParams;if(!company)redirect("/onboarding/company");const context=await requireCompany(company);const solution=SOLUTIONS.pos;return <OnboardingShell step={7} steps={ACTIVATION_STEPS} backHref={`/onboarding/branch?company=${company}`} context={context.companyName} title="Activa PROCESA POS" subtitle="Esta acción registra la solución comercial y habilita sus módulos técnicos en una sola transacción."><div className="activation-summary"><div className="solution-mark"><Icon name="store" size={28}/></div><div><span>PILOTO ACTIVABLE</span><h3>{solution.name} · {solution.packageName}</h3><p>{solution.summary}</p></div></div><ul className="activation-checklist"><li><Icon name="check"/> Empresa y sucursal creadas</li><li><Icon name="check"/> Prueba PRO por 14 días</li><li><Icon name="check"/> Aislamiento por empresa y contexto</li></ul><form action={activatePackage}><input type="hidden" name="companyId" value={company}/><input type="hidden" name="packageCode" value="pos-starter"/><button className="premium-submit">Confirmar activación <span>→</span></button></form></OnboardingShell>}
