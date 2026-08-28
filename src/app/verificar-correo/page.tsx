import Link from "next/link";
import { AuthShell } from "@/components/ui/auth-shell";
import { PremiumField } from "@/components/ui/premium-field";
import { resendVerification } from "./actions";

const copy: Record<string, { title: string; text: string; tone: string }> = {
  sent: { title: "Revisa tu correo", text: "Si la dirección puede recibir confirmaciones, enviaremos un enlace para continuar.", tone: "success" },
  confirmed: { title: "Correo confirmado", text: "Tu identidad está lista. Ya puedes continuar con PROCESA Cloud.", tone: "success" },
  expired: { title: "El enlace venció", text: "Solicita un nuevo correo de confirmación para continuar.", tone: "warning" },
  invalid: { title: "Enlace no válido", text: "El enlace pudo usarse antes o no corresponde a una confirmación vigente.", tone: "error" },
  rate: { title: "Espera unos minutos", text: "Limitamos los reenvíos para proteger tu cuenta y evitar spam.", tone: "warning" },
};

export default async function VerifyEmail({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const q = await searchParams;
  const state = copy[q.state ?? "sent"] ?? copy.sent;
  return <AuthShell kicker="IDENTIDAD" title={state.title} subtitle={state.text}>
    <div className={`auth-message ${state.tone}`} role="status">Nunca te pediremos tu contraseña desde un correo.</div>
    {q.state === "confirmed" ? <Link className="auth-create" href="/onboarding">Continuar con la configuración</Link> : <form action={resendVerification} className="premium-form">
      <PremiumField label="Correo de tu cuenta" name="email" type="email" placeholder="nombre@empresa.com" autoComplete="email" />
      <button className="premium-submit">Reenviar correo <span aria-hidden="true">→</span></button>
    </form>}
    <p className="auth-switch">¿Ya confirmaste? <Link href="/login">Inicia sesión</Link></p>
  </AuthShell>;
}
