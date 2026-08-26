"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function markRead(f: FormData) {
  const id = z.string().uuid().parse(f.get("id"));
  const s = await createClient();
  const {
    data: { user },
  } = await s.auth.getUser();
  if (!user) throw new Error("UNAUTHENTICATED");

  const { error } = await s
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .or(`user_id.eq.${user.id},user_id.is.null`);

  if (error) throw error;
  revalidatePath("/app/notifications");
}

export async function markAllRead(f: FormData) {
  const companyId = z.string().uuid().parse(f.get("companyId"));
  const s = await createClient();
  const {
    data: { user },
  } = await s.auth.getUser();
  if (!user) throw new Error("UNAUTHENTICATED");

  // Use mark_all_notifications_read RPC if available, or direct query
  const { error } = await s.rpc("mark_all_notifications_read", { p_company_id: companyId });

  if (error) {
    // Fallback via direct update respecting RLS
    await s
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("company_id", companyId)
      .is("read_at", null);
  }

  revalidatePath("/app/notifications");
}
