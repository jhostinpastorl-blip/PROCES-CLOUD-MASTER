"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { PremiumField } from "@/components/ui/premium-field";
import { initialResendState, resendVerification } from "./actions";

export function ResendVerificationForm() {
  const [state, formAction, pending] = useActionState(resendVerification, initialResendState);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    setRemaining(state.cooldownSeconds);
  }, [state.cooldownSeconds, state.status]);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = window.setTimeout(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [remaining]);

  const disabled = pending || remaining > 0;

  return (
    <>
      <form action={formAction} className="premium-form">
        <PremiumField
          label="Correo de tu cuenta"
          name="email"
          type="email"
          placeholder="nombre@empresa.com"
          autoComplete="email"
          required
        />
        <button className="premium-submit" disabled={disabled} aria-disabled={disabled}>
          {pending
            ? "Solicitando…"
            : remaining > 0
              ? `Reintentar en ${remaining} s`
              : "Reenviar correo"}
          {!pending && remaining === 0 && <span aria-hidden="true">→</span>}
        </button>
      </form>
      {state.message && (
        <div className={`auth-message ${state.status === "sent" ? "success" : state.status === "rate" ? "warning" : "error"}`} role="status" aria-live="polite">
          {state.message}
          {state.status === "confirmed-login" && <> <Link href="/login">Iniciar sesión</Link></>}
        </div>
      )}
    </>
  );
}
