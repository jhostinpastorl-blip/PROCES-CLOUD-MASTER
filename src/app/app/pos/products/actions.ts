"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/permissions";
import { requireModule } from "@/lib/modules/entitlements";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit/log";

const productSchema = z.object({
  companyId: z.string().uuid(),
  categoryId: z.string().uuid().optional().nullable(),
  code: z.string().min(1).max(50),
  sku: z.string().max(50).optional().nullable(),
  barcode: z.string().max(50).optional().nullable(),
  name: z.string().min(2).max(200),
  description: z.string().max(500).optional().default(""),
  type: z.enum(["product", "service"]).default("product"),
  unit: z.string().min(1).max(10).default("NIU"),
  price: z.coerce.number().min(0),
  cost: z.coerce.number().min(0).default(0),
  taxType: z.enum(["igv_18", "exempt", "inaffected"]).default("igv_18"),
  allowsInventory: z.boolean().default(true),
});

export async function createProduct(f: FormData) {
  const rawCategoryId = f.get("categoryId");
  const rawSku = f.get("sku");
  const rawBarcode = f.get("barcode");
  const type = (f.get("type") as "product" | "service") || "product";

  const p = productSchema.parse({
    companyId: f.get("companyId"),
    categoryId: rawCategoryId && rawCategoryId !== "" ? rawCategoryId : null,
    code: f.get("code"),
    sku: rawSku && rawSku !== "" ? rawSku : null,
    barcode: rawBarcode && rawBarcode !== "" ? rawBarcode : null,
    name: f.get("name"),
    description: f.get("description") || "",
    type,
    unit: f.get("unit") || "NIU",
    price: f.get("price"),
    cost: f.get("cost") || 0,
    taxType: f.get("taxType") || "igv_18",
    allowsInventory: type === "service" ? false : f.get("allowsInventory") === "true",
  });

  await requireModule(p.companyId, "pos");
  await requirePermission(p.companyId, "pos.products.manage");

  const s = await createClient();
  const { data, error } = await s.rpc("create_pos_product", {
    p_company_id: p.companyId,
    p_category_id: p.categoryId,
    p_code: p.code,
    p_sku: p.sku,
    p_barcode: p.barcode,
    p_name: p.name,
    p_description: p.description,
    p_type: p.type,
    p_unit: p.unit,
    p_price: p.price,
    p_cost: p.cost,
    p_tax_type: p.taxType,
    p_allows_inventory: p.allowsInventory,
  });

  if (error) {
    if (error.message.includes("products_company_id_code_key")) {
      throw new Error("El código de producto ya está en uso en esta empresa.");
    }
    if (error.message.includes("idx_products_company_sku")) {
      throw new Error("El SKU ya está asignado a otro producto en esta empresa.");
    }
    if (error.message.includes("idx_products_company_barcode")) {
      throw new Error("El código de barras ya está asignado a otro producto en esta empresa.");
    }
    throw error;
  }

  revalidatePath("/app/pos/products");
  revalidatePath("/app/pos");
  redirect(`/app/pos/products?created=${data}`);
}

export async function updateProduct(f: FormData) {
  const productId = z.string().uuid().parse(f.get("productId"));
  const companyId = z.string().uuid().parse(f.get("companyId"));
  const rawCategoryId = f.get("categoryId");
  const rawSku = f.get("sku");
  const rawBarcode = f.get("barcode");
  const type = (f.get("type") as "product" | "service") || "product";

  const p = productSchema.parse({
    companyId,
    categoryId: rawCategoryId && rawCategoryId !== "" ? rawCategoryId : null,
    code: f.get("code"),
    sku: rawSku && rawSku !== "" ? rawSku : null,
    barcode: rawBarcode && rawBarcode !== "" ? rawBarcode : null,
    name: f.get("name"),
    description: f.get("description") || "",
    type,
    unit: f.get("unit") || "NIU",
    price: f.get("price"),
    cost: f.get("cost") || 0,
    taxType: f.get("taxType") || "igv_18",
    allowsInventory: type === "service" ? false : f.get("allowsInventory") === "true",
  });

  await requireModule(companyId, "pos");
  await requirePermission(companyId, "pos.products.manage");

  const s = await createClient();
  const { error } = await s
    .from("products")
    .update({
      category_id: p.categoryId,
      code: p.code,
      sku: p.sku,
      barcode: p.barcode,
      name: p.name,
      description: p.description || null,
      type: p.type,
      unit: p.unit,
      price: p.price,
      cost: p.cost,
      tax_type: p.taxType,
      allows_inventory: p.allowsInventory,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId)
    .eq("company_id", companyId);

  if (error) throw error;

  await audit(companyId, "product.updated", "product", productId, {
    code: p.code,
    name: p.name,
  });

  revalidatePath("/app/pos/products");
  revalidatePath("/app/pos");
}

export async function toggleProductStatus(f: FormData) {
  const productId = z.string().uuid().parse(f.get("productId"));
  const companyId = z.string().uuid().parse(f.get("companyId"));
  const isActive = String(f.get("isActive")) === "true";

  await requireModule(companyId, "pos");
  await requirePermission(companyId, "pos.products.manage");

  const s = await createClient();
  const { error } = await s
    .from("products")
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId)
    .eq("company_id", companyId);

  if (error) throw error;

  await audit(companyId, isActive ? "product.activated" : "product.deactivated", "product", productId);
  revalidatePath("/app/pos/products");
  revalidatePath("/app/pos");
}
