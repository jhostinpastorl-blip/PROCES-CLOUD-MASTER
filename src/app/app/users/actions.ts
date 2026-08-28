"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { audit } from "@/lib/audit/log";
import { invitationToken } from "@/lib/security/token";
import { assertCompanyOperable, assertUserLimit } from "@/lib/plans/limits";

const schema = z.object({
  companyId: z.string().uuid(),
  email: z.string().email(),
  roleId: z.string().uuid().optional().or(z.literal("")),
});

export async function inviteUser(f: FormData) {
  const p = schema.parse(Object.fromEntries(f));
  await requirePermission(p.companyId, "users.invite");
  await assertCompanyOperable(p.companyId);
  await assertUserLimit(p.companyId);

  const s = await createClient();
  const t = invitationToken();
  const expires = new Date(Date.now() + 72 * 3600_000).toISOString();

  const { data, error } = await s.rpc("create_company_invitation", {
    p_company_id: p.companyId,
    p_email: p.email,
    p_role_id: p.roleId || null,
    p_token_hash: t.hash,
    p_expires_at: expires,
  });
  if (error) {
    if (error.message?.includes("PLAN_USER_LIMIT")) {
      throw new Error("Has alcanzado el límite de usuarios de tu plan.");
    }
    if (error.message?.includes("SUBSCRIPTION_RESTRICTED")) {
      throw new Error("Tu suscripción no está activa. Contacta a PROCESA.");
    }
    throw error;
  }

  let deliveryStatus: "SENT" | "FAILED" = "SENT";
  let deliveryErrorCode: string | null = null;
  try {
    const admin = createAdminClient();
    const url = `${process.env.NEXT_PUBLIC_APP_URL}/aceptar-invitacion?token=${encodeURIComponent(t.raw)}`;
    const { error: deliveryError } = await admin.auth.admin.inviteUserByEmail(p.email, { redirectTo: url });
    if (deliveryError) throw deliveryError;
  } catch (mailErr) {
    deliveryStatus = "FAILED";
    deliveryErrorCode = mailErr instanceof Error ? mailErr.name : "EMAIL_PROVIDER_ERROR";
  }

  await s.from("company_invitations").update({
    delivery_status: deliveryStatus,
    delivery_error_code: deliveryErrorCode,
    last_sent_at: deliveryStatus === "SENT" ? new Date().toISOString() : null,
  }).eq("id", data).eq("company_id", p.companyId);

  await audit(p.companyId, "user.invited", "company_invitation", data, {
    email: p.email,
    roleId: p.roleId || null, deliveryStatus,
  });

  revalidatePath("/app/users");
}

export async function revokeInvitation(f: FormData) {
  const companyId = z.string().uuid().parse(f.get("companyId"));
  const invitationId = z.string().uuid().parse(f.get("invitationId"));
  await requirePermission(companyId, "users.invite");
  const s = await createClient();

  const { error } = await s.rpc("revoke_company_invitation", {
    p_company_id: companyId,
    p_invitation_id: invitationId,
  });
  if (error) throw error;

  await audit(companyId, "user.invitation_revoked", "company_invitation", invitationId);
  revalidatePath("/app/users");
}
