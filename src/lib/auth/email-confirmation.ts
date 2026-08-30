export type AuthErrorLike = {
  code?: string;
  message?: string;
  name?: string;
  status?: number;
};

export type ConfirmationFailureState = "confirmed-login" | "expired" | "invalid";
export type ResendFailureState = "rate" | "confirmed-login" | "provider";
export type ConfirmationInput =
  | { method: "code"; code: string }
  | { method: "token_hash"; tokenHash: string; type: string }
  | { method: "provider_error"; error: AuthErrorLike }
  | { method: "invalid" };

const EMAIL_OTP_TYPES = new Set([
  "email",
  "email_change",
  "invite",
  "magiclink",
  "recovery",
  "signup",
]);

export function isEmailOtpType(value: string | null): boolean {
  return Boolean(value && EMAIL_OTP_TYPES.has(value));
}

export function resolveConfirmationInput(params: URLSearchParams): ConfirmationInput {
  const providerCode = params.get("error_code");
  const providerMessage = params.get("error_description");
  if (providerCode || providerMessage) {
    return {
      method: "provider_error",
      error: { code: providerCode ?? undefined, message: providerMessage ?? undefined },
    };
  }

  const code = params.get("code");
  if (code) return { method: "code", code };

  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  if (tokenHash && isEmailOtpType(type)) return { method: "token_hash", tokenHash, type: type! };

  return { method: "invalid" };
}

export function classifyConfirmationFailure(error: AuthErrorLike): ConfirmationFailureState {
  const code = error.code?.toLowerCase() ?? "";
  const name = error.name?.toLowerCase() ?? "";
  const message = error.message?.toLowerCase() ?? "";

  // Supabase has already consumed and confirmed the email token before the app
  // receives the PKCE code. A missing verifier means the identity is confirmed,
  // but this browser cannot safely create the session.
  if (
    code === "pkce_code_verifier_not_found" ||
    name === "authpkcecodeverifiermissingerror" ||
    message.includes("pkce code verifier not found")
  ) {
    return "confirmed-login";
  }

  if (
    code === "otp_expired" ||
    code === "flow_state_expired" ||
    message.includes("expired") ||
    message.includes("vencido")
  ) {
    return "expired";
  }

  return "invalid";
}

export function classifyResendFailure(error: AuthErrorLike): ResendFailureState {
  const code = error.code?.toLowerCase() ?? "";
  const message = error.message?.toLowerCase() ?? "";

  if (
    error.status === 429 ||
    code === "over_email_send_rate_limit" ||
    code === "over_request_rate_limit" ||
    message.includes("rate limit") ||
    message.includes("too many requests")
  ) {
    return "rate";
  }

  if (
    code === "email_already_confirmed" ||
    message.includes("already confirmed") ||
    message.includes("already been confirmed")
  ) {
    return "confirmed-login";
  }

  return "provider";
}
