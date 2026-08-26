"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/permissions";
import { audit } from "@/lib/audit/log";

const updateCompanySchema = z.object({
  companyId: z.string().uuid(),
  name: z.string().min(2).max(120),
  legalName: z.string().min(2).max(180),
  tradeName: z.string().max(120).optional().nullable(),
  taxId: z.string().max(30).optional().nullable(),
  timezone: z.string().min(2).max(50).default("America/Lima"),
  currency: z.string().length(3).default("PEN"),
});

export async function updateCompany(f: FormData) {
  const p = updateCompanySchema.parse({
    companyId: f.get("companyId"),
    name: f.get("name"),
    legalName: f.get("legalName"),
    tradeName: f.get("tradeName") || null,
    taxId: f.get("taxId") || null,
    timezone: f.get("timezone") || "America/Lima",
    currency: f.get("currency") || "PEN",
  });

  await requirePermission(p.companyId, "company.update");
  const s = await createClient();

  const { error } = await s
    .from("companies")
    .update({
      name: p.name,
      legal_name: p.legalName,
      trade_name: p.tradeName,
      tax_id: p.taxId,
      timezone: p.timezone,
      currency: p.currency,
      updated_at: new Date().toISOString(),
    })
    .eq("id", p.companyId);

  if (error) throw error;

  await audit(p.companyId, "company.updated", "company", p.companyId, {
    name: p.name,
    legalName: p.legalName,
    taxId: p.taxId,
  });

  revalidatePath("/app/company");
  revalidatePath("/app/settings");
}
