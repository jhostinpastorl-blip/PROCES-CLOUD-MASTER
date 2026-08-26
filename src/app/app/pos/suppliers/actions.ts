"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/permissions";
import { requireModule } from "@/lib/modules/entitlements";
import { audit } from "@/lib/audit/log";

const supplierSchema = z.object({
  companyId: z.string().uuid(),
  docType: z.enum(["RUC", "DNI", "OTHER"]).default("RUC"),
  docNumber: z.string().min(3).max(20),
  name: z.string().min(2).max(200),
  tradeName: z.string().max(200).optional().default(""),
  contactName: z.string().max(100).optional().default(""),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(30).optional().default(""),
  address: z.string().max(300).optional().default(""),
});

export async function createSupplier(f: FormData) {
  const p = supplierSchema.parse({
    companyId: f.get("companyId"),
    docType: f.get("docType") || "RUC",
    docNumber: f.get("docNumber"),
    name: f.get("name"),
    tradeName: f.get("tradeName") || "",
    contactName: f.get("contactName") || "",
    email: f.get("email") || "",
    phone: f.get("phone") || "",
    address: f.get("address") || "",
  });

  await requireModule(p.companyId, "pos");
  await requirePermission(p.companyId, "pos.suppliers.manage");

  const s = await createClient();
  const { data, error } = await s
    .from("suppliers")
    .insert({
      company_id: p.companyId,
      doc_type: p.docType,
      doc_number: p.docNumber,
      name: p.name,
      trade_name: p.tradeName || null,
      contact_name: p.contactName || null,
      email: p.email || null,
      phone: p.phone || null,
      address: p.address || null,
      is_active: true,
    })
    .select("id")
    .single();

  if (error) {
    if (error.message.includes("suppliers_company_id_doc_type_doc_number_key")) {
      throw new Error("Ya existe un proveedor con este tipo y número de documento en la empresa.");
    }
    throw error;
  }

  await audit(p.companyId, "supplier.created", "supplier", data.id, {
    docType: p.docType,
    docNumber: p.docNumber,
    name: p.name,
  });

  revalidatePath("/app/pos/suppliers");
  revalidatePath("/app/pos");
}

export async function updateSupplier(f: FormData) {
  const supplierId = z.string().uuid().parse(f.get("supplierId"));
  const companyId = z.string().uuid().parse(f.get("companyId"));

  const p = supplierSchema.parse({
    companyId,
    docType: f.get("docType") || "RUC",
    docNumber: f.get("docNumber"),
    name: f.get("name"),
    tradeName: f.get("tradeName") || "",
    contactName: f.get("contactName") || "",
    email: f.get("email") || "",
    phone: f.get("phone") || "",
    address: f.get("address") || "",
  });

  await requireModule(companyId, "pos");
  await requirePermission(companyId, "pos.suppliers.manage");

  const s = await createClient();
  const { error } = await s
    .from("suppliers")
    .update({
      doc_type: p.docType,
      doc_number: p.docNumber,
      name: p.name,
      trade_name: p.tradeName || null,
      contact_name: p.contactName || null,
      email: p.email || null,
      phone: p.phone || null,
      address: p.address || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", supplierId)
    .eq("company_id", companyId);

  if (error) throw error;

  await audit(companyId, "supplier.updated", "supplier", supplierId, {
    docNumber: p.docNumber,
    name: p.name,
  });

  revalidatePath("/app/pos/suppliers");
  revalidatePath("/app/pos");
}

export async function toggleSupplierStatus(f: FormData) {
  const supplierId = z.string().uuid().parse(f.get("supplierId"));
  const companyId = z.string().uuid().parse(f.get("companyId"));
  const isActive = String(f.get("isActive")) === "true";

  await requireModule(companyId, "pos");
  await requirePermission(companyId, "pos.suppliers.manage");

  const s = await createClient();
  const { error } = await s
    .from("suppliers")
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", supplierId)
    .eq("company_id", companyId);

  if (error) throw error;

  await audit(companyId, isActive ? "supplier.activated" : "supplier.deactivated", "supplier", supplierId);
  revalidatePath("/app/pos/suppliers");
  revalidatePath("/app/pos");
}
