import { updatePassword } from "./actions";
import { AuthShell } from "@/components/ui/auth-shell";
import { PremiumField } from "@/components/ui/premium-field";

export default function UpdatePassword() {
  return (
    <AuthShell
      kicker="NUEVA CONTRASEÑA"
      title="Protege tu cuenta"
      subtitle="Ingresa tu nueva clave de acceso. Debe tener al menos 10 caracteres para garantizar la seguridad de tu empresa."
    >
      <form action={updatePassword} className="premium-form">
        <PremiumField
          label="Nueva contraseña"
          name="password"
          type="password"
          placeholder="Mínimo 10 caracteres"
          minLength={10}
          autoComplete="new-password"
          required
        />
        <PremiumField
          label="Confirmar nueva contraseña"
          name="confirm"
          type="password"
          placeholder="Repite tu nueva contraseña"
          minLength={10}
          autoComplete="new-password"
          required
        />
        <button className="premium-submit" type="submit">
          Actualizar contraseña <span>→</span>
        </button>
      </form>
    </AuthShell>
  );
}