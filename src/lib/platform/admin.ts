import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function requirePlatformAdmin() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await s
    .from("platform_admins")
    .select("user_id,is_active,level")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();
  if (!data) redirect("/app/dashboard");
  return { user, s, adminLevel: data.level as string };
}

export async function logPlatformAction(
  actorId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata: Record<string, unknown> = {}
) {
  const s = await createClient();
  await s.from("platform_audit_logs").insert({
    actor_user_id: actorId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata,
  });
}