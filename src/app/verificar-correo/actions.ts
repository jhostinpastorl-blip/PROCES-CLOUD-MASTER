"use server";
import { createClient } from "@/lib/supabase/server";
import { emailSchema } from "@/lib/forms/schemas";
import { classifyResendFailure } from "@/lib/auth/email-confirmation";

export type ResendVerificationState = {
  status: "idle" | "sent" | "invalid" | "rate" | "confirmed-login" | "provider";
  message: string;
  cooldownSeconds: number;
};

export const initialResendState: ResendVerificationState = {
  status: "idle",
  message: "",
  cooldownSeconds: 0,
};

export async function resendVerification(
  _previousState: ResendVerificationState,
  formData: FormData,
): Promise<ResendVerificationState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { status: "invalid", message: "Ingresa un correo válido.", cooldownSeconds: 0 };
  }

  const s = await createClient();
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";
  const { error } = await s.auth.resend({
    type: "signup",
    email: parsed.data,
    options: { emailRedirectTo: `${base}/auth/callback?next=${encodeURIComponent("/onboarding")}` },
  });

  if (!error) {
    return {
      status: "sent",
      message: "Solicitud aceptada. Revisa tu bandeja de entrada y spam.",
      cooldownSeconds: 60,
    };
  }

  const status = classifyResendFailure(error);
  if (status === "rate") {
    return {
      status,
      message: "Supabase limitó temporalmente los envíos. Espera antes de intentarlo de nuevo.",
      cooldownSeconds: 60,
    };
  }
  if (status === "confirmed-login") {
    return {
      status,
      message: "Este correo ya está confirmado. Inicia sesión para continuar.",
      cooldownSeconds: 0,
    };
  }
  return {
    status,
    message: "El proveedor no pudo enviar el correo. Inténtalo nuevamente en unos minutos.",
    cooldownSeconds: 0,
  };
}
