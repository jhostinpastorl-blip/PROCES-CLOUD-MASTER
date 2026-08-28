import { OnboardingShell } from "@/components/ui/onboarding-shell";
import { ACTIVATION_STEPS } from "@/lib/onboarding/workflow";
import { createClient } from "@/lib/supabase/server";
import { saveProfile } from "./actions";

export default async function ProfileStep() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user ? await supabase.from("profiles").select("full_name,phone,job_title").eq("id", user.id).maybeSingle() : { data: null };
  return <OnboardingShell step={1} steps={ACTIVATION_STEPS} title="Empecemos por ti" subtitle="Completa tu perfil para personalizar la configuración de tu espacio.">
    <form action={saveProfile} className="premium-form onboarding-form">
      <label className="premium-field"><span>Nombre completo</span><input name="fullName" defaultValue={profile?.full_name ?? user?.user_metadata?.full_name ?? ""} autoComplete="name" required /></label>
      <div className="form-grid">
        <label className="premium-field"><span>Teléfono</span><input name="phone" defaultValue={profile?.phone ?? ""} autoComplete="tel" placeholder="Opcional" /></label>
        <label className="premium-field"><span>Cargo</span><input name="jobTitle" defaultValue={profile?.job_title ?? ""} placeholder="Ej. Administrador" /></label>
      </div>
      <button className="premium-submit">Continuar <span>→</span></button>
    </form>
  </OnboardingShell>;
}
