import Link from "next/link";
import { AuthShell } from "@/components/ui/auth-shell";
import { ResendVerificationForm } from "./ResendVerificationForm";

const copy: Record<string, { title: string; text: string; tone: string }> = {
  sent: { title: "Revisa tu correo", text: "Si la dirección puede recibir confirmaciones, enviaremos un enlace para continuar.", tone: "success" },
  confirmed: { title: "Correo confirmado", text: "Tu identidad está lista. Ya puedes continuar con PROCESA Cloud.", tone: "success" },
  "confirmed-login": { title: "Correo confirmado", text: "El correo quedó confirmado, pero este navegador no puede recuperar la sesión original. Inicia sesión para continuar de forma segura.", tone: "success" },
  expired: { title: "El enlace venció o ya fue usado", text: "Puedes iniciar sesión si ya confirmaste; de lo contrario, solicita un nuevo correo.", tone: "warning" },
  invalid: { title: "Enlace no válido", text: "El enlace pudo usarse antes o no corresponde a una confirmación vigente.", tone: "error" },
  rate: { title: "Espera unos minutos", text: "Limitamos los reenvíos para proteger tu cuenta y evitar spam.", tone: "warning" },
  provider: { title: "No pudimos enviar el correo", text: "El proveedor de correo no respondió correctamente. Inténtalo nuevamente en unos minutos.", tone: "error" },
};

export default async function VerifyEmail({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const q = await searchParams;
  const state = copy[q.state ?? "sent"] ?? copy.sent;
  return <AuthShell kicker="IDENTIDAD" title={state.title} subtitle={state.text}>
    <div className={`auth-message ${state.tone}`} role="status">Nunca te pediremos tu contraseña desde un correo.</div>
    {q.state === "confirmed" ? (
      <Link className="auth-create confirmation-primary" href="/onboarding">Continuar con la configuración</Link>
    ) : q.state === "confirmed-login" ? (
      <Link className="auth-create confirmation-primary" href="/login?next=%2Fonboarding">Iniciar sesión y continuar</Link>
    ) : (
      <ResendVerificationForm />
    )}
    <p className="auth-switch">¿Ya confirmaste? <Link href="/login">Inicia sesión</Link></p>
  </AuthShell>;
}
