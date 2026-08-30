"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const profileSchema = z.object({
  fullName: z.string().min(2).max(120),
  phone: z.string().max(30).optional(),
  jobTitle: z.string().max(100).optional(),
});

export async function updateUserProfile(f: FormData) {
  const p = profileSchema.parse({
    fullName: f.get("fullName"),
    phone: f.get("phone") || "",
    jobTitle: f.get("jobTitle") || "",
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
      phone: p.phone || null,
      job_title: p.jobTitle || null,
      updated_at: new Date().toISOString(),
    });

  if (error) throw error;
  revalidatePath("/app/settings");
}
