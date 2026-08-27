import Link from "next/link";
import { requestReset } from "./actions";
import { AuthShell } from "@/components/ui/auth-shell";
import { PremiumField } from "@/components/ui/premium-field";

export default function Recover() {
  return (
    <AuthShell
      kicker="RECUPERAR ACCESO"
      title="Restablece tu contraseña"
      subtitle="Ingresa tu correo empresarial. Si existe una cuenta activa, te enviaremos un enlace de recuperación seguro."
    >
      <form action={requestReset} className="premium-form">
        <PremiumField
          label="Correo empresarial"
          name="email"
          type="email"
          placeholder="nombre@empresa.com"
          autoComplete="email"
          required
        />
        <button className="premium-submit" type="submit">
          Enviar enlace de recuperación <span>→</span>
        </button>
      </form>
      <p className="auth-switch">
        ¿Recordaste tu contraseña? <Link href="/login">Volver a iniciar sesión</Link>
      </p>
    </AuthShell>
  );
}