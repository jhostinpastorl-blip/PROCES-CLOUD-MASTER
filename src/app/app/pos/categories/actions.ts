"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/permissions";
import { requireModule } from "@/lib/modules/entitlements";
import { audit } from "@/lib/audit/log";

const categorySchema = z.object({
  companyId: z.string().uuid(),
  name: z.string().min(2).max(100),
  description: z.string().max(300).optional().default(""),
});

export async function createCategory(f: FormData) {
  const p = categorySchema.parse({
    companyId: f.get("companyId"),
    name: f.get("name"),
    description: f.get("description") || "",
  });

  await requireModule(p.companyId, "pos");
  await requirePermission(p.companyId, "pos.categories.manage");

  const s = await createClient();
  const { data, error } = await s
    .from("categories")
    .insert({
      company_id: p.companyId,
      name: p.name,
      description: p.description || null,
      is_active: true,
    })
    .select("id")
    .single();

  if (error) throw error;

  await audit(p.companyId, "category.created", "category", data.id, { name: p.name });
  revalidatePath("/app/pos/categories");
}

export async function updateCategory(f: FormData) {
  const categoryId = z.string().uuid().parse(f.get("categoryId"));
  const companyId = z.string().uuid().parse(f.get("companyId"));
  const name = z.string().min(2).max(100).parse(f.get("name"));
  const description = z.string().max(300).optional().parse(f.get("description") || "");

  await requireModule(companyId, "pos");
  await requirePermission(companyId, "pos.categories.manage");

  const s = await createClient();
  const { error } = await s
    .from("categories")
    .update({
      name,
      description: description || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", categoryId)
    .eq("company_id", companyId);

  if (error) throw error;

  await audit(companyId, "category.updated", "category", categoryId, { name });
  revalidatePath("/app/pos/categories");
}

export async function toggleCategoryStatus(f: FormData) {
  const categoryId = z.string().uuid().parse(f.get("categoryId"));
  const companyId = z.string().uuid().parse(f.get("companyId"));
  const isActive = String(f.get("isActive")) === "true";

  await requireModule(companyId, "pos");
  await requirePermission(companyId, "pos.categories.manage");

  const s = await createClient();
  const { error } = await s
    .from("categories")
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", categoryId)
    .eq("company_id", companyId);

  if (error) throw error;

  await audit(companyId, isActive ? "category.activated" : "category.deactivated", "category", categoryId);
  revalidatePath("/app/pos/categories");
}
