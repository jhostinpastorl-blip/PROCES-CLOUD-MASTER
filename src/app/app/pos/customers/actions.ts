"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/permissions";
import { requireModule } from "@/lib/modules/entitlements";
import { audit } from "@/lib/audit/log";

const customerSchema = z.object({
  companyId: z.string().uuid(),
  docType: z.enum(["DNI", "RUC", "CE", "PASSPORT", "OTHER"]).default("DNI"),
  docNumber: z.string().min(3).max(20),
  name: z.string().min(2).max(200),
  tradeName: z.string().max(200).optional().default(""),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(30).optional().default(""),
  address: z.string().max(300).optional().default(""),
});

export async function createCustomer(f: FormData) {
  const p = customerSchema.parse({
    companyId: f.get("companyId"),
    docType: f.get("docType") || "DNI",
    docNumber: f.get("docNumber"),
    name: f.get("name"),
    tradeName: f.get("tradeName") || "",
    email: f.get("email") || "",
    phone: f.get("phone") || "",
    address: f.get("address") || "",
  });

  await requireModule(p.companyId, "pos");
  await requirePermission(p.companyId, "pos.customers.manage");

  const s = await createClient();
  const { data, error } = await s
    .from("customers")
    .insert({
      company_id: p.companyId,
      doc_type: p.docType,
      doc_number: p.docNumber,
      name: p.name,
      trade_name: p.tradeName || null,
      email: p.email || null,
      phone: p.phone || null,
      address: p.address || null,
      is_active: true,
    })
    .select("id")
    .single();

  if (error) {
    if (error.message.includes("customers_company_id_doc_type_doc_number_key")) {
      throw new Error("Ya existe un cliente con este tipo y número de documento en la empresa.");
    }
    throw error;
  }

  await audit(p.companyId, "customer.created", "customer", data.id, {
    docType: p.docType,
    docNumber: p.docNumber,
    name: p.name,
  });

  revalidatePath("/app/pos/customers");
  revalidatePath("/app/pos");
}

export async function updateCustomer(f: FormData) {
  const customerId = z.string().uuid().parse(f.get("customerId"));
  const companyId = z.string().uuid().parse(f.get("companyId"));

  const p = customerSchema.parse({
    companyId,
    docType: f.get("docType") || "DNI",
    docNumber: f.get("docNumber"),
    name: f.get("name"),
    tradeName: f.get("tradeName") || "",
    email: f.get("email") || "",
    phone: f.get("phone") || "",
    address: f.get("address") || "",
  });

  await requireModule(companyId, "pos");
  await requirePermission(companyId, "pos.customers.manage");

  const s = await createClient();
  const { error } = await s
    .from("customers")
    .update({
      doc_type: p.docType,
      doc_number: p.docNumber,
      name: p.name,
      trade_name: p.tradeName || null,
      email: p.email || null,
      phone: p.phone || null,
      address: p.address || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", customerId)
    .eq("company_id", companyId);

  if (error) throw error;

  await audit(companyId, "customer.updated", "customer", customerId, {
    docNumber: p.docNumber,
    name: p.name,
  });

  revalidatePath("/app/pos/customers");
  revalidatePath("/app/pos");
}

export async function toggleCustomerStatus(f: FormData) {
  const customerId = z.string().uuid().parse(f.get("customerId"));
  const companyId = z.string().uuid().parse(f.get("companyId"));
  const isActive = String(f.get("isActive")) === "true";

  await requireModule(companyId, "pos");
  await requirePermission(companyId, "pos.customers.manage");

  const s = await createClient();
  const { error } = await s
    .from("customers")
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", customerId)
    .eq("company_id", companyId);

  if (error) throw error;

  await audit(companyId, isActive ? "customer.activated" : "customer.deactivated", "customer", customerId);
  revalidatePath("/app/pos/customers");
  revalidatePath("/app/pos");
}
