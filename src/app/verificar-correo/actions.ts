"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { emailSchema } from "@/lib/forms/schemas";
import { localRateLimit } from "@/lib/security/rate-limit";
import { requestFingerprint } from "@/lib/security/request";

export async function resendVerification(formData: FormData) {
  const parsed = emailSchema.safeParse(formData.get("email"));
  const fingerprint = await requestFingerprint("email-verification");
  if (!localRateLimit(fingerprint, 3, 15 * 60_000).ok) redirect("/verificar-correo?state=rate");
  if (parsed.success) {
    const s = await createClient();
    const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";
    await s.auth.resend({ type: "signup", email: parsed.data, options: { emailRedirectTo: `${base}/auth/callback?next=${encodeURIComponent("/onboarding")}` } });
  }
  redirect("/verificar-correo?state=sent");
}
