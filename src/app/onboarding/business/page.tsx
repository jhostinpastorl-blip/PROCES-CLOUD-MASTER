import { OnboardingShell } from "@/components/ui/onboarding-shell";
import { BUSINESS_NEEDS, BUSINESS_TYPES } from "@/lib/activation/catalog";
import { ACTIVATION_STEPS } from "@/lib/onboarding/workflow";
import { saveBusinessDiscovery } from "./actions";

export default function BusinessStep() {
  return <OnboardingShell step={2} steps={ACTIVATION_STEPS} backHref="/onboarding/profile" title="¿Cómo funciona tu negocio?" subtitle="Usaremos estas señales para recomendarte una solución; podrás cambiarla antes de activar.">
    <form action={saveBusinessDiscovery} className="premium-form onboarding-form">
      <label className="premium-field"><span>Tipo de negocio</span><select className="premium-select" name="industry" defaultValue="minimarket">{BUSINESS_TYPES.map(x=><option value={x.code} key={x.code}>{x.label}</option>)}</select></label>
      <label className="premium-field"><span>Tu prioridad principal</span><select className="premium-select" name="primaryNeed" defaultValue="sales">{BUSINESS_NEEDS.map(x=><option value={x.code} key={x.code}>{x.label}</option>)}</select></label>
      <fieldset className="choice-fieldset"><legend>¿Qué necesitas resolver?</legend><div className="need-choice-grid">{BUSINESS_NEEDS.map((x,i)=><label key={x.code}><input type="checkbox" name="selectedNeeds" value={x.code} defaultChecked={i<3}/><span>{x.label}</span></label>)}</div></fieldset>
      <div className="form-grid">
        <label className="premium-field"><span>Personas en el equipo</span><select name="employeeRange" defaultValue="2-5"><option>1</option><option>2-5</option><option>6-20</option><option>21-50</option><option>51+</option></select></label>
        <label className="premium-field"><span>Número de sedes</span><select name="branchRange" defaultValue="1"><option>1</option><option>2-3</option><option>4-10</option><option>11+</option></select></label>
      </div>
      <button className="premium-submit">Ver recomendación <span>→</span></button>
    </form>
  </OnboardingShell>;
}
