import { type EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getFirstEntryDestination } from "@/lib/activation/entry";
import { sanitizeNextPath } from "@/lib/activation/first-entry-policy";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = sanitizeNextPath(url.searchParams.get("next"));
  const s = await createClient();
  let error: Error | null = null;
  if (code) {
    const result = await s.auth.exchangeCodeForSession(code);
    error = result.error;
  } else if (tokenHash && type) {
    const result = await s.auth.verifyOtp({ token_hash: tokenHash, type });
    error = result.error;
  } else {
    return NextResponse.redirect(new URL("/verificar-correo?state=invalid", request.url));
  }
  if (error) {
    const state = /expired/i.test(error.message) ? "expired" : "invalid";
    return NextResponse.redirect(new URL(`/verificar-correo?state=${state}`, request.url));
  }
  const destination = await getFirstEntryDestination(next ?? "/onboarding");
  const response = NextResponse.redirect(new URL(destination, request.url));
  response.headers.set("Cache-Control", "no-store");
  return response;
}
