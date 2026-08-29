import { type EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getFirstEntryDestination } from "@/lib/activation/entry";
import { sanitizeNextPath } from "@/lib/activation/first-entry-policy";
import { classifyConfirmationFailure, resolveConfirmationInput } from "@/lib/auth/email-confirmation";
import { createClient } from "@/lib/supabase/server";

function redirectWithoutCache(path: string, request: NextRequest) {
  const response = NextResponse.redirect(new URL(path, request.url));
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const input = resolveConfirmationInput(url.searchParams);
  const next = sanitizeNextPath(url.searchParams.get("next"));

  if (input.method === "provider_error") {
    const state = classifyConfirmationFailure(input.error);
    return redirectWithoutCache(`/verificar-correo?state=${state}`, request);
  }

  const s = await createClient();
  let error: { code?: string; message: string; name?: string; status?: number } | null = null;
  if (input.method === "code") {
    const result = await s.auth.exchangeCodeForSession(input.code);
    error = result.error;
  } else if (input.method === "token_hash") {
    const result = await s.auth.verifyOtp({ token_hash: input.tokenHash, type: input.type as EmailOtpType });
    error = result.error;
  } else {
    return redirectWithoutCache("/verificar-correo?state=invalid", request);
  }
  if (error) {
    const state = classifyConfirmationFailure(error);
    return redirectWithoutCache(`/verificar-correo?state=${state}`, request);
  }
  const destination = await getFirstEntryDestination(next ?? "/onboarding");
  return redirectWithoutCache(destination, request);
}
