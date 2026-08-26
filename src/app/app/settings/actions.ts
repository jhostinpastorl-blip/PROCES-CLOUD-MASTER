"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const profileSchema = z.object({
  fullName: z.string().min(2).max(120),
});

export async function updateUserProfile(f: FormData) {
  const p = profileSchema.parse({
    fullName: f.get("fullName"),
  });

  const s = await createClient();
  const {
    data: { user },
  } = await s.auth.getUser();
  if (!user) throw new Error("UNAUTHORIZED");

  const { error } = await s
    .from("profiles")
    .upsert({
      id: user.id,
      full_name: p.fullName,
      updated_at: new Date().toISOString(),
    });

  if (error) throw error;
  revalidatePath("/app/settings");
}
