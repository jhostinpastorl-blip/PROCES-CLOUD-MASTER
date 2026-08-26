import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Emite una notificación interna para un usuario en el contexto de una empresa.
 * Usa el helper de BD create_core_notification (SECURITY DEFINER).
 */
export async function notify(
  companyId: string,
  userId: string | null,
  title: string,
  body: string,
  type: "info" | "success" | "warning" | "error" | "action" = "info"
) {
  const s = await createClient();
  await s.rpc("create_core_notification", {
    p_company_id: companyId,
    p_user_id: userId,
    p_title: title,
    p_body: body,
    p_type: type,
  });
}

/** Notificación: Invitación aceptada */
export async function notifyInvitationAccepted(
  companyId: string,
  adminUserId: string,
  email: string
) {
  await notify(
    companyId,
    adminUserId,
    "Invitación aceptada",
    `El usuario ${email} ha aceptado tu invitación y ya forma parte de la empresa.`,
    "success"
  );
}

/** Notificación: Membresía suspendida */
export async function notifyMemberSuspended(
  companyId: string,
  actorUserId: string,
  targetEmail: string
) {
  await notify(
    companyId,
    actorUserId,
    "Membresía suspendida",
    `La membresía de ${targetEmail} ha sido suspendida en esta empresa.`,
    "warning"
  );
}

/** Notificación: Módulo habilitado/deshabilitado */
export async function notifyModuleToggled(
  companyId: string,
  userId: string,
  moduleCode: string,
  enabled: boolean
) {
  await notify(
    companyId,
    userId,
    enabled ? "Módulo activado" : "Módulo desactivado",
    `El módulo «${moduleCode}» ha sido ${enabled ? "habilitado" : "deshabilitado"} en tu empresa.`,
    "info"
  );
}

/** Notificación: Cambio de plan (enviada por plataforma) */
export async function notifyPlanChanged(
  companyId: string,
  newPlanName: string
) {
  await notify(
    companyId,
    null, // empresa entera, no usuario específico
    "Plan actualizado",
    `Tu empresa ha sido migrada al plan ${newPlanName}. Los nuevos límites y módulos ya están activos.`,
    "success"
  );
}

/** Notificación: Trial próximo a vencer (7 días o menos) */
export async function notifyTrialExpiringSoon(
  companyId: string,
  daysRemaining: number
) {
  await notify(
    companyId,
    null,
    "Trial próximo a vencer",
    `Tu período de prueba vence en ${daysRemaining} día${daysRemaining !== 1 ? "s" : ""}. Contacta a PROCESA para continuar con tu plan.`,
    "warning"
  );
}
