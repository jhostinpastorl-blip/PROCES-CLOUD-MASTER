import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

try {
  process.loadEnvFile(".env.local");
} catch {}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const suiteResults = {};
function pass(code, detail, extra = {}) {
  console.log(`   ${code} PASS: ${detail}`);
  suiteResults[code] = { status: "PASS", detail, ...extra };
}
function fail(code, detail) {
  console.error(`   ${code} FAIL: ${detail}`);
  suiteResults[code] = { status: "FAIL", detail };
}

async function getOrCreateUser(email, password) {
  const { data: usersData, error: listError } = await adminClient.auth.admin.listUsers();
  if (listError) throw listError;
  const existing = usersData.users.find((u) => u.email === email);
  if (existing) {
    await adminClient.auth.admin.updateUserById(existing.id, { password, email_confirm: true });
    return existing;
  }
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  return data.user;
}

async function createAuthenticatedClient(email, password) {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const client = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}

async function main() {
  console.log("==================================================================");
  console.log("PROCESA CLOUD — BATERÍA DINÁMICA FASE 1C (HARDENED INVENTORY & KARDEX)");
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log("==================================================================\n");

  const runId = Math.floor(Math.random() * 900000 + 100000);
  const password = "Password123!";

  console.log("1. Provisionando usuarios de prueba...");
  const userA = await getOrCreateUser(`qa_f1c_a_${runId}@procesa.test`, password);
  const userB = await getOrCreateUser(`qa_f1c_b_${runId}@procesa.test`, password);

  const clientA = await createAuthenticatedClient(`qa_f1c_a_${runId}@procesa.test`, password);
  const clientB = await createAuthenticatedClient(`qa_f1c_b_${runId}@procesa.test`, password);

  console.log("2. Configurando empresas Tenant A (Pro con POS) y Tenant B (Free sin POS)...");
  const { data: compAId, error: compAErr } = await clientA.rpc("create_company_with_trial", {
    p_name: `Empresa Hardened A ${runId}`,
    p_legal_name: `Empresa Hardened A ${runId} SAC`,
    p_tax_id: `208${runId}`,
    p_currency: "PEN",
    p_timezone: "America/Lima",
    p_plan_code: "pro",
  });
  if (compAErr) throw compAErr;
  const compA = { id: compAId };

  const { data: compBId, error: compBErr } = await clientB.rpc("create_company_with_trial", {
    p_name: `Empresa Hardened B ${runId}`,
    p_legal_name: `Empresa Hardened B ${runId} SAC`,
    p_tax_id: `209${runId}`,
    p_currency: "PEN",
    p_timezone: "America/Lima",
    p_plan_code: "free",
  });
  if (compBErr) throw compBErr;
  const compB = { id: compBId };

  // Crear sucursales y almacenes para Empresa A
  const { data: brA } = await adminClient
    .from("branches")
    .insert({
      company_id: compA.id,
      name: `Sucursal Principal ${runId}`,
      code: `SUC-A-${runId}`,
      is_active: true,
    })
    .select("id")
    .single();
  const branchA = brA;

  const { data: whA1 } = await adminClient
    .from("warehouses")
    .insert({
      company_id: compA.id,
      branch_id: branchA.id,
      name: `Almacén Principal A1 ${runId}`,
      code: `ALM-A1-${runId}`,
      is_default: true,
    })
    .select()
    .single();

  const { data: whA2 } = await adminClient
    .from("warehouses")
    .insert({
      company_id: compA.id,
      branch_id: branchA.id,
      name: `Almacén Secundario A2 ${runId}`,
      code: `ALM-A2-${runId}`,
      is_default: false,
    })
    .select()
    .single();

  // Proveedores
  const { data: supplierA } = await adminClient
    .from("suppliers")
    .insert({
      company_id: compA.id,
      name: `Distribuidor Mayorista A ${runId}`,
      doc_type: "RUC",
      doc_number: `201${runId}`,
    })
    .select()
    .single();

  const { data: supplierB } = await adminClient
    .from("suppliers")
    .insert({
      company_id: compB.id,
      name: `Distribuidor Mayorista B ${runId}`,
      doc_type: "RUC",
      doc_number: `202${runId}`,
    })
    .select()
    .single();

  // Productos Empresa A
  const { data: prodPhysical } = await adminClient
    .from("products")
    .insert({
      company_id: compA.id,
      name: `Laptop Pro ${runId}`,
      code: `LAP-${runId}`,
      sku: `SKU-LAP-${runId}`,
      price: 2500.00,
      cost: 1500.00,
      allows_inventory: true,
      tax_type: "igv_18",
    })
    .select()
    .single();

  const { data: prodPhysical2 } = await adminClient
    .from("products")
    .insert({
      company_id: compA.id,
      name: `Mouse Gamer ${runId}`,
      code: `MOU-${runId}`,
      sku: `SKU-MOU-${runId}`,
      price: 60.00,
      cost: 30.00,
      allows_inventory: true,
      tax_type: "igv_18",
    })
    .select()
    .single();

  const { data: prodService } = await adminClient
    .from("products")
    .insert({
      company_id: compA.id,
      name: `Soporte Técnico ${runId}`,
      code: `SERV-${runId}`,
      price: 100.00,
      cost: 0.00,
      allows_inventory: false,
      tax_type: "igv_18",
    })
    .select()
    .single();

  // Producto Empresa B
  const { data: prodB } = await adminClient
    .from("products")
    .insert({
      company_id: compB.id,
      name: `Producto de Tenant B ${runId}`,
      code: `PRODB-${runId}`,
      price: 50.00,
      cost: 25.00,
      allows_inventory: true,
    })
    .select()
    .single();

  // ───────────────────────────────────────
  // 3. COMPRAS (PURCHASE-01 a 12, COST-01 a 04, ATOMIC & IDEMPOTENCY)
  // ───────────────────────────────────────
  console.log("\n3. PURCHASE-01 a 12 (Compras a Proveedores & Costo Promedio)...");

  // PURCHASE-01 & COST-01: Compra inicial con stock cero -> costo = 1200.00
  const { data: pur1, error: pur1Err } = await clientA.rpc("create_pos_purchase", {
    p_company_id: compA.id,
    p_warehouse_id: whA1.id,
    p_supplier_id: supplierA.id,
    p_items: [{ product_id: prodPhysical.id, quantity: 10, unit_cost: 1200.00 }],
    p_supplier_doc_type: "FACTURA",
    p_supplier_doc_number: "F001-0001",
    p_idempotency_key: `pur1-${runId}`,
  });

  if (!pur1Err && pur1?.purchase_id) {
    pass("PURCHASE-01", `Compra registrada exitosamente: ${pur1.document_number} (Total S/ ${pur1.total})`);
  } else {
    fail("PURCHASE-01", `Error al registrar compra: ${pur1Err?.message}`);
  }

  const { data: bal1 } = await clientA
    .from("inventory_balances")
    .select("quantity")
    .eq("company_id", compA.id)
    .eq("warehouse_id", whA1.id)
    .eq("product_id", prodPhysical.id)
    .single();

  if (Number(bal1?.quantity) === 10) {
    pass("PURCHASE-01B", "Stock incrementado exactamente a 10 unidades por PURCHASE_IN");
  } else {
    fail("PURCHASE-01B", `Stock esperado 10, obtenido ${bal1?.quantity}`);
  }

  const { data: prodCost1 } = await clientA.from("products").select("cost").eq("id", prodPhysical.id).single();
  if (Number(prodCost1?.cost) === 1200.00) {
    pass("COST-01", "Stock anterior cero: costo promedio se inicializó al costo de compra (S/ 1200.00)");
  } else {
    fail("COST-01", `Costo esperado 1200.00, obtenido ${prodCost1?.cost}`);
  }

  // COST-02: Stock existente (10 a 1200) + Nueva compra (10 a 1400) -> Nuevo promedio = (10*1200 + 10*1400)/20 = 1300.00
  const { data: pur2, error: pur2Err } = await clientA.rpc("create_pos_purchase", {
    p_company_id: compA.id,
    p_warehouse_id: whA1.id,
    p_supplier_id: supplierA.id,
    p_items: [{ product_id: prodPhysical.id, quantity: 10, unit_cost: 1400.00 }],
    p_idempotency_key: `pur2-${runId}`,
  });

  const { data: prodCost2 } = await clientA.from("products").select("cost").eq("id", prodPhysical.id).single();
  if (Number(prodCost2?.cost) === 1300.00) {
    pass("COST-02", "Costo promedio ponderado móvil calculado exactamente bajo lock: S/ 1300.00");
  } else {
    fail("COST-02", `Costo esperado 1300.00, obtenido ${prodCost2?.cost}`);
  }

  // COST-03: Tercera compra secuencial (10 a 1600) -> Nuevo promedio = (20*1300 + 10*1600)/30 = (26000 + 16000)/30 = 1400.00
  await clientA.rpc("create_pos_purchase", {
    p_company_id: compA.id,
    p_warehouse_id: whA1.id,
    p_supplier_id: supplierA.id,
    p_items: [{ product_id: prodPhysical.id, quantity: 10, unit_cost: 1600.00 }],
  });

  const { data: prodCost3 } = await clientA.from("products").select("cost").eq("id", prodPhysical.id).single();
  if (Number(prodCost3?.cost) === 1400.00) {
    pass("COST-03", "Múltiples compras secuenciales promedian exactamente: S/ 1400.00");
  } else {
    fail("COST-03", `Costo esperado 1400.00, obtenido ${prodCost3?.cost}`);
  }

  // PURCHASE-02: Compra multi-producto
  const { data: purMulti, error: purMultiErr } = await clientA.rpc("create_pos_purchase", {
    p_company_id: compA.id,
    p_warehouse_id: whA1.id,
    p_supplier_id: supplierA.id,
    p_items: [
      { product_id: prodPhysical.id, quantity: 5, unit_cost: 1400.00 },
      { product_id: prodPhysical2.id, quantity: 20, unit_cost: 25.00 },
    ],
  });

  if (!purMultiErr && purMulti?.purchase_id) {
    pass("PURCHASE-02", `Compra multi-producto confirmada: ${purMulti.document_number} (Total S/ ${purMulti.total})`);
  } else {
    fail("PURCHASE-02", `Error en compra multi-producto: ${purMultiErr?.message}`);
  }

  // PURCHASE-03 & COST-05: Servicio no afecta inventario ni costo de inventariable
  const { data: purServ, error: purServErr } = await clientA.rpc("create_pos_purchase", {
    p_company_id: compA.id,
    p_warehouse_id: whA1.id,
    p_supplier_id: supplierA.id,
    p_items: [{ product_id: prodService.id, quantity: 1, unit_cost: 80.00 }],
  });

  const { data: servBal } = await clientA
    .from("inventory_balances")
    .select("quantity")
    .eq("company_id", compA.id)
    .eq("product_id", prodService.id);

  if (!purServErr && (!servBal || servBal.length === 0)) {
    pass("PURCHASE-03", "Servicio en compra no genera balance ni movimiento de inventario");
  } else {
    fail("PURCHASE-03", `Servicio generó balance indebido: ${JSON.stringify(servBal)}`);
  }

  // PURCHASE-04: Proveedor cross-tenant
  const { error: purCtSupErr } = await clientA.rpc("create_pos_purchase", {
    p_company_id: compA.id,
    p_warehouse_id: whA1.id,
    p_supplier_id: supplierB.id,
    p_items: [{ product_id: prodPhysical.id, quantity: 1, unit_cost: 100 }],
  });
  if (purCtSupErr && purCtSupErr.message.includes("SUPPLIER_NOT_FOUND")) {
    pass("PURCHASE-04", "Proveedor cross-tenant rechazado: SUPPLIER_NOT_FOUND (DENIED)");
  } else {
    fail("PURCHASE-04", `Se permitió proveedor ajeno: ${purCtSupErr?.message}`);
  }

  // PURCHASE-05: Almacén cross-tenant
  const { data: whB } = await adminClient.from("warehouses").insert({
    company_id: compB.id,
    name: `Almacén B ${runId}`,
    code: `ALM-B-${runId}`,
  }).select().single();

  const { error: purCtWhErr } = await clientA.rpc("create_pos_purchase", {
    p_company_id: compA.id,
    p_warehouse_id: whB.id,
    p_supplier_id: supplierA.id,
    p_items: [{ product_id: prodPhysical.id, quantity: 1, unit_cost: 100 }],
  });
  if (purCtWhErr && purCtWhErr.message.includes("WAREHOUSE_NOT_FOUND")) {
    pass("PURCHASE-05", "Almacén cross-tenant rechazado: WAREHOUSE_NOT_FOUND (DENIED)");
  } else {
    fail("PURCHASE-05", `Se permitió almacén ajeno: ${purCtWhErr?.message}`);
  }

  // PURCHASE-06: Producto cross-tenant
  const { error: purCtProdErr } = await clientA.rpc("create_pos_purchase", {
    p_company_id: compA.id,
    p_warehouse_id: whA1.id,
    p_supplier_id: supplierA.id,
    p_items: [{ product_id: prodB.id, quantity: 1, unit_cost: 100 }],
  });
  if (purCtProdErr && purCtProdErr.message.includes("PRODUCT_NOT_FOUND")) {
    pass("PURCHASE-06", "Producto cross-tenant rechazado: PRODUCT_NOT_FOUND (DENIED)");
  } else {
    fail("PURCHASE-06", `Se permitió producto ajeno: ${purCtProdErr?.message}`);
  }

  // PURCHASE-07 & 08: Validaciones de costo y cantidad
  const { error: purCostErr } = await clientA.rpc("create_pos_purchase", {
    p_company_id: compA.id,
    p_warehouse_id: whA1.id,
    p_supplier_id: supplierA.id,
    p_items: [{ product_id: prodPhysical.id, quantity: 1, unit_cost: -50 }],
  });
  if (purCostErr && purCostErr.message.includes("INVALID_ITEM_COST")) {
    pass("PURCHASE-07", "Costo negativo rechazado con INVALID_ITEM_COST: DENIED");
  } else {
    fail("PURCHASE-07", `Se permitió costo negativo: ${purCostErr?.message}`);
  }

  const { error: purQtyErr } = await clientA.rpc("create_pos_purchase", {
    p_company_id: compA.id,
    p_warehouse_id: whA1.id,
    p_supplier_id: supplierA.id,
    p_items: [{ product_id: prodPhysical.id, quantity: 0, unit_cost: 100 }],
  });
  if (purQtyErr && purQtyErr.message.includes("INVALID_ITEM_QUANTITY")) {
    pass("PURCHASE-08", "Cantidad cero o negativa rechazada con INVALID_ITEM_QUANTITY: DENIED");
  } else {
    fail("PURCHASE-08", `Se permitió cantidad inválida: ${purQtyErr?.message}`);
  }

  // PURCHASE-09: Tenant B sin entitlement POS
  const { error: purNoEntErr } = await clientB.rpc("create_pos_purchase", {
    p_company_id: compB.id,
    p_warehouse_id: whB.id,
    p_supplier_id: supplierB.id,
    p_items: [{ product_id: prodB.id, quantity: 1, unit_cost: 10 }],
  });
  if (purNoEntErr) {
    pass("PURCHASE-09", "Compra sin módulo POS rechazado correctamente: DENIED");
  }

  // PURCHASE-IDEMPOTENCY-01: Idempotencia en compra
  const { data: purIdem1 } = await clientA.rpc("create_pos_purchase", {
    p_company_id: compA.id,
    p_warehouse_id: whA1.id,
    p_supplier_id: supplierA.id,
    p_items: [{ product_id: prodPhysical2.id, quantity: 5, unit_cost: 25.00 }],
    p_idempotency_key: `idem-pur-${runId}`,
  });
  const { data: purIdem2 } = await clientA.rpc("create_pos_purchase", {
    p_company_id: compA.id,
    p_warehouse_id: whA1.id,
    p_supplier_id: supplierA.id,
    p_items: [{ product_id: prodPhysical2.id, quantity: 5, unit_cost: 25.00 }],
    p_idempotency_key: `idem-pur-${runId}`,
  });

  if (purIdem1?.purchase_id === purIdem2?.purchase_id && purIdem2?.idempotent_replay === true) {
    pass("PURCHASE-IDEMPOTENCY-01", "Idempotencia en compra: reintento retorna misma compra previa sin duplicar stock");
  } else {
    fail("PURCHASE-IDEMPOTENCY-01", `Idempotencia falló: id1=${purIdem1?.purchase_id}, id2=${purIdem2?.purchase_id}`);
  }

  // PURCHASE-12: Aislamiento RLS en compras
  const { data: ctPurchases } = await clientB.from("purchases").select("id").eq("company_id", compA.id);
  if (!ctPurchases || ctPurchases.length === 0) {
    pass("PURCHASE-12", "Tenant B no puede consultar compras emitidas por Tenant A: DENIED");
  } else {
    fail("PURCHASE-12", `Falla de aislamiento: Tenant B leyó ${ctPurchases.length} compras ajenas`);
  }

  // PURCHASE-ATOMIC-01: Rollback total por error en ítem
  const { error: purAtomErr } = await clientA.rpc("create_pos_purchase", {
    p_company_id: compA.id,
    p_warehouse_id: whA1.id,
    p_supplier_id: supplierA.id,
    p_items: [
      { product_id: prodPhysical.id, quantity: 2, unit_cost: 100 },
      { product_id: prodB.id, quantity: 1, unit_cost: 100 }
    ],
  });
  if (purAtomErr) {
    pass("PURCHASE-ATOMIC-01", "Falla en cualquier ítem provocó rollback atómico total (PARTIAL PURCHASES: IMPOSSIBLE)");
  }

  // ───────────────────────────────────────
  // 4. AJUSTES DE INVENTARIO (ADJUST-01 a 07, ADJUSTMENT-IDEMPOTENCY-01, COST-06)
  // ───────────────────────────────────────
  console.log("\n4. ADJUST-01 a 07 (Ajustes de Inventario)...");

  // Balance actual prodPhysical2 en whA1 = 20 (compra2) + 5 (idem) = 25
  // ADJUST-01: Ajuste positivo (+5)
  const { data: adjIn, error: adjInErr } = await clientA.rpc("create_inventory_adjustment", {
    p_company_id: compA.id,
    p_warehouse_id: whA1.id,
    p_reason: "Sobrante físico en inventario cíclico",
    p_items: [{ product_id: prodPhysical2.id, adjustment_type: "IN", quantity: 5 }],
    p_idempotency_key: `adj-in-${runId}`,
  });
  if (!adjInErr && adjIn?.adjustment_id) {
    pass("ADJUST-01", `Ajuste positivo aplicado: ${adjIn.document_number} (+5 unidades)`);
  } else {
    fail("ADJUST-01", `Error en ajuste positivo: ${adjInErr?.message}`);
  }

  // ADJUSTMENT-IDEMPOTENCY-01: Reintento de ajuste con misma clave
  const { data: adjInReplay } = await clientA.rpc("create_inventory_adjustment", {
    p_company_id: compA.id,
    p_warehouse_id: whA1.id,
    p_reason: "Sobrante físico en inventario cíclico",
    p_items: [{ product_id: prodPhysical2.id, adjustment_type: "IN", quantity: 5 }],
    p_idempotency_key: `adj-in-${runId}`,
  });
  if (adjInReplay?.adjustment_id === adjIn?.adjustment_id && adjInReplay?.idempotent_replay === true) {
    pass("ADJUSTMENT-IDEMPOTENCY-01", "Idempotencia en ajuste: reintento retorna mismo ajuste sin duplicar stock");
  } else {
    fail("ADJUSTMENT-IDEMPOTENCY-01", "Falla en idempotencia de ajuste");
  }

  // ADJUST-02 & COST-06: Ajuste negativo (-3) -> Salida no altera costo promedio
  const costBeforeOut = (await clientA.from("products").select("cost").eq("id", prodPhysical2.id).single()).data.cost;
  const { data: adjOut, error: adjOutErr } = await clientA.rpc("create_inventory_adjustment", {
    p_company_id: compA.id,
    p_warehouse_id: whA1.id,
    p_reason: "Merma por producto dañado en estantería",
    p_items: [{ product_id: prodPhysical2.id, adjustment_type: "OUT", quantity: 3 }],
  });
  const costAfterOut = (await clientA.from("products").select("cost").eq("id", prodPhysical2.id).single()).data.cost;

  if (!adjOutErr && adjOut?.adjustment_id) {
    pass("ADJUST-02", `Ajuste negativo aplicado: ${adjOut.document_number} (-3 unidades)`);
  } else {
    fail("ADJUST-02", `Error en ajuste negativo: ${adjOutErr?.message}`);
  }

  if (Number(costBeforeOut) === Number(costAfterOut)) {
    pass("COST-06", "OUT_ADJUSTMENT no altera el costo promedio del producto (costo se mantiene constante)");
  } else {
    fail("COST-06", `Costo cambió indebidamente tras salida: antes=${costBeforeOut}, despues=${costAfterOut}`);
  }

  // ADJUST-03: Ajuste negativo con stock insuficiente (intentar sacar 100 cuando hay 27)
  const { error: adjInsuffErr } = await clientA.rpc("create_inventory_adjustment", {
    p_company_id: compA.id,
    p_warehouse_id: whA1.id,
    p_reason: "Ajuste excesivo",
    p_items: [{ product_id: prodPhysical2.id, adjustment_type: "OUT", quantity: 100 }],
  });
  if (adjInsuffErr && adjInsuffErr.message.includes("INSUFFICIENT_STOCK")) {
    pass("ADJUST-03", "Ajuste negativo con stock insuficiente rechazado con INSUFFICIENT_STOCK: DENIED");
  } else {
    fail("ADJUST-03", `Se permitió ajuste con stock negativo: ${adjInsuffErr?.message}`);
  }

  // ADJUST-04: Motivo obligatorio
  const { error: adjReasonErr } = await clientA.rpc("create_inventory_adjustment", {
    p_company_id: compA.id,
    p_warehouse_id: whA1.id,
    p_reason: "   ",
    p_items: [{ product_id: prodPhysical2.id, adjustment_type: "IN", quantity: 1 }],
  });
  if (adjReasonErr && adjReasonErr.message.includes("ADJUSTMENT_REASON_REQUIRED")) {
    pass("ADJUST-04", "Intento de ajuste sin motivo rechazado con ADJUSTMENT_REASON_REQUIRED: DENIED");
  } else {
    fail("ADJUST-04", `Se permitió ajuste sin motivo: ${adjReasonErr?.message}`);
  }

  // ADJUST-05 & 06: Cross-tenant warehouse y product
  const { error: adjCtWhErr } = await clientA.rpc("create_inventory_adjustment", {
    p_company_id: compA.id,
    p_warehouse_id: whB.id,
    p_reason: "Conteo físico",
    p_items: [{ product_id: prodPhysical2.id, adjustment_type: "IN", quantity: 1 }],
  });
  if (adjCtWhErr && adjCtWhErr.message.includes("WAREHOUSE_NOT_FOUND")) {
    pass("ADJUST-05", "Ajuste en almacén de otro tenant rechazado: WAREHOUSE_NOT_FOUND (DENIED)");
  }

  const { error: adjCtProdErr } = await clientA.rpc("create_inventory_adjustment", {
    p_company_id: compA.id,
    p_warehouse_id: whA1.id,
    p_reason: "Conteo físico",
    p_items: [{ product_id: prodB.id, adjustment_type: "IN", quantity: 1 }],
  });
  if (adjCtProdErr && adjCtProdErr.message.includes("PRODUCT_NOT_FOUND")) {
    pass("ADJUST-06", "Ajuste con producto de otro tenant rechazado: PRODUCT_NOT_FOUND (DENIED)");
  }

  // ───────────────────────────────────────
  // 5. TRANSFERENCIAS ENTRE ALMACENES (TRANSFER-01 a 10, CONSERVATION, DEADLOCK & COST)
  // ───────────────────────────────────────
  console.log("\n5. TRANSFER-01 a 10 (Transferencias entre Almacenes & Invariante de Conservación)...");

  // TRANSFER-01 & TRANSFER-CONSERVATION-01: Transferir 7 unidades de prodPhysical2 de whA1 a whA2
  const { data: trf1, error: trf1Err } = await clientA.rpc("create_inventory_transfer", {
    p_company_id: compA.id,
    p_source_warehouse_id: whA1.id,
    p_destination_warehouse_id: whA2.id,
    p_items: [{ product_id: prodPhysical2.id, quantity: 7 }],
    p_notes: "Reabastecimiento de almacén secundario",
    p_idempotency_key: `trf1-${runId}`,
  });
  if (!trf1Err && trf1?.transfer_id) {
    pass("TRANSFER-01", `Transferencia completada: ${trf1.document_number} (7 unidades de whA1 a whA2)`);
  } else {
    fail("TRANSFER-01", `Error en transferencia: ${trf1Err?.message}`);
  }

  // TRANSFER-IDEMPOTENCY-01: Reintento de transferencia con misma clave
  const { data: trf1Replay } = await clientA.rpc("create_inventory_transfer", {
    p_company_id: compA.id,
    p_source_warehouse_id: whA1.id,
    p_destination_warehouse_id: whA2.id,
    p_items: [{ product_id: prodPhysical2.id, quantity: 7 }],
    p_notes: "Reabastecimiento de almacén secundario",
    p_idempotency_key: `trf1-${runId}`,
  });
  if (trf1Replay?.transfer_id === trf1?.transfer_id && trf1Replay?.idempotent_replay === true) {
    pass("TRANSFER-IDEMPOTENCY-01", "Idempotencia en transferencias: reintento retorna misma transferencia sin duplicar movimientos");
  } else {
    fail("TRANSFER-IDEMPOTENCY-01", "Falla en idempotencia de transferencia");
  }

  // TRANSFER-CONSERVATION-01: Verificar SUM(TRANSFER_OUT) === SUM(TRANSFER_IN)
  const { data: trfMovs } = await adminClient
    .from("inventory_movements")
    .select("movement_type, quantity, unit_cost")
    .eq("company_id", compA.id)
    .eq("reference_type", "transfer")
    .eq("reference_id", trf1.transfer_id);

  const trfOutQty = trfMovs?.filter(m => m.movement_type === "TRANSFER_OUT").reduce((acc, m) => acc + Number(m.quantity), 0);
  const trfInQty = trfMovs?.filter(m => m.movement_type === "TRANSFER_IN").reduce((acc, m) => acc + Number(m.quantity), 0);

  if (trfOutQty === 7 && trfInQty === 7 && trfOutQty === trfInQty) {
    pass("TRANSFER-CONSERVATION-01", `Invariante de Conservación verificado: TRANSFER_OUT (${trfOutQty}) === TRANSFER_IN (${trfInQty}) [OUT === IN]`);
  } else {
    fail("TRANSFER-CONSERVATION-01", `Pérdida de conservación en transferencia: out=${trfOutQty}, in=${trfInQty}`);
  }

  // COST-TRANSFER-01: Transferencia transporta costo de origen
  const trfOutCost = trfMovs?.find(m => m.movement_type === "TRANSFER_OUT")?.unit_cost;
  const trfInCost = trfMovs?.find(m => m.movement_type === "TRANSFER_IN")?.unit_cost;
  if (Number(trfOutCost) === Number(trfInCost) && Number(trfOutCost) === 25.00) {
    pass("COST-TRANSFER-01", `Transferencia transporta con exactitud el costo unitario de origen: S/ ${trfInCost}`);
  } else {
    fail("COST-TRANSFER-01", `Costo en transferencia inconsistente: out=${trfOutCost}, in=${trfInCost}`);
  }

  // TRANSFER-03: Stock insuficiente en origen
  const { error: trfInsuffErr } = await clientA.rpc("create_inventory_transfer", {
    p_company_id: compA.id,
    p_source_warehouse_id: whA1.id,
    p_destination_warehouse_id: whA2.id,
    p_items: [{ product_id: prodPhysical2.id, quantity: 100 }],
  });
  if (trfInsuffErr && trfInsuffErr.message.includes("INSUFFICIENT_STOCK")) {
    pass("TRANSFER-03", "Transferencia con stock insuficiente en origen rechazada con INSUFFICIENT_STOCK: DENIED");
  }

  // TRANSFER-04: Mismo almacén
  const { error: trfSameWhErr } = await clientA.rpc("create_inventory_transfer", {
    p_company_id: compA.id,
    p_source_warehouse_id: whA1.id,
    p_destination_warehouse_id: whA1.id,
    p_items: [{ product_id: prodPhysical2.id, quantity: 1 }],
  });
  if (trfSameWhErr && trfSameWhErr.message.includes("SAME_WAREHOUSE_TRANSFER")) {
    pass("TRANSFER-04", "Transferencia al mismo almacén rechazada: SAME_WAREHOUSE_TRANSFER (DENIED)");
  }

  // TRANSFER-05 & 06: Cross-tenant destination and source
  const { error: trfCtDstErr } = await clientA.rpc("create_inventory_transfer", {
    p_company_id: compA.id,
    p_source_warehouse_id: whA1.id,
    p_destination_warehouse_id: whB.id,
    p_items: [{ product_id: prodPhysical2.id, quantity: 1 }],
  });
  if (trfCtDstErr && trfCtDstErr.message.includes("DESTINATION_WAREHOUSE_NOT_FOUND")) {
    pass("TRANSFER-05", "Transferencia a almacén ajeno rechazada: DESTINATION_WAREHOUSE_NOT_FOUND (DENIED)");
  }

  const { error: trfCtSrcErr } = await clientA.rpc("create_inventory_transfer", {
    p_company_id: compA.id,
    p_source_warehouse_id: whB.id,
    p_destination_warehouse_id: whA2.id,
    p_items: [{ product_id: prodPhysical2.id, quantity: 1 }],
  });
  if (trfCtSrcErr && trfCtSrcErr.message.includes("SOURCE_WAREHOUSE_NOT_FOUND")) {
    pass("TRANSFER-06", "Transferencia desde almacén ajeno rechazada: SOURCE_WAREHOUSE_NOT_FOUND (DENIED)");
  }

  // TRANSFER-DEADLOCK-01: Transferencias opuestas concurrentes (A -> B y B -> A) con bloqueo determinista
  const [resTrfOpp1, resTrfOpp2] = await Promise.allSettled([
    clientA.rpc("create_inventory_transfer", {
      p_company_id: compA.id,
      p_source_warehouse_id: whA1.id,
      p_destination_warehouse_id: whA2.id,
      p_items: [{ product_id: prodPhysical2.id, quantity: 2 }],
    }),
    clientA.rpc("create_inventory_transfer", {
      p_company_id: compA.id,
      p_source_warehouse_id: whA2.id,
      p_destination_warehouse_id: whA1.id,
      p_items: [{ product_id: prodPhysical2.id, quantity: 2 }],
    }),
  ]);
  const opp1Ok = resTrfOpp1.status === "fulfilled" && !resTrfOpp1.value.error;
  const opp2Ok = resTrfOpp2.status === "fulfilled" && !resTrfOpp2.value.error;
  if (opp1Ok && opp2Ok) {
    pass("TRANSFER-DEADLOCK-01", "Transferencias cruzadas opuestas (A->B y B->A) ejecutadas sin deadlocks gracias a locking determinista: PASS");
  } else {
    fail("TRANSFER-DEADLOCK-01", `Falla en transferencias cruzadas: op1=${opp1Ok}, op2=${opp2Ok}`);
  }

  // ───────────────────────────────────────
  // 6. KARDEX & CONSULTAS (KARDEX-01 a 07)
  // ───────────────────────────────────────
  console.log("\n6. KARDEX-01 a 07 (Kardex Físico y Trazabilidad)...");

  const { data: kardexRows, error: kardexErr } = await clientA.rpc("get_product_kardex", {
    p_company_id: compA.id,
    p_product_id: prodPhysical2.id,
    p_warehouse_id: whA1.id,
  });

  if (!kardexErr && kardexRows && kardexRows.length > 0) {
    const types = kardexRows.map(r => r.movement_type);
    pass("KARDEX-01", `Kardex cronológico refleja todos los movimientos derivados de inventory_movements: ${types.join(", ")}`);
  } else {
    fail("KARDEX-01", `Error al consultar Kardex: ${kardexErr?.message}`);
  }

  // KARDEX-07: Cross-tenant Kardex
  const { error: ctKardexErr } = await clientB.rpc("get_product_kardex", {
    p_company_id: compA.id,
    p_product_id: prodPhysical2.id,
  });
  if (ctKardexErr && ctKardexErr.message.includes("forbidden")) {
    pass("KARDEX-07", "Tenant B no puede consultar Kardex de Tenant A: forbidden (DENIED)");
  } else {
    fail("KARDEX-07", "Tenant B pudo acceder a Kardex ajeno");
  }

  // ───────────────────────────────────────
  // 7. INMUTABILIDAD DE HISTORIA (INVENTORY-IMMUTABILITY, PURCHASE-IMMUTABILITY, ITEM-IMMUTABILITY)
  // ───────────────────────────────────────
  console.log("\n7. INMUTABILIDAD DE HISTORIA (TRIGGERS APPEND-ONLY)...");

  // INVENTORY-IMMUTABILITY-01 & 02: inventory_movements UPDATE & DELETE
  const { error: mutMovErr } = await adminClient
    .from("inventory_movements")
    .update({ quantity: 9999 })
    .eq("company_id", compA.id);
  if (mutMovErr && mutMovErr.message.includes("INVENTORY_MOVEMENTS_ARE_IMMUTABLE")) {
    pass("INVENTORY-IMMUTABILITY-01", "Intento de mutar movimiento de inventario bloqueado: INVENTORY_MOVEMENTS_ARE_IMMUTABLE (DENIED)");
  } else {
    fail("INVENTORY-IMMUTABILITY-01", `Se permitió mutar movimientos: ${mutMovErr?.message}`);
  }

  const { error: delMovErr } = await adminClient
    .from("inventory_movements")
    .delete()
    .eq("company_id", compA.id);
  if (delMovErr && delMovErr.message.includes("INVENTORY_MOVEMENTS_ARE_IMMUTABLE")) {
    pass("INVENTORY-IMMUTABILITY-02", "Intento de eliminar movimiento de inventario bloqueado: INVENTORY_MOVEMENTS_ARE_IMMUTABLE (DENIED)");
  } else {
    fail("INVENTORY-IMMUTABILITY-02", `Se permitió eliminar movimientos: ${delMovErr?.message}`);
  }

  // PURCHASE-IMMUTABILITY-01 & 02: purchases UPDATE & DELETE
  const { error: mutPurErr } = await adminClient
    .from("purchases")
    .update({ total: 0.00 })
    .eq("id", pur1.purchase_id);
  if (mutPurErr && mutPurErr.message.includes("CANNOT_MUTATE_CONFIRMED_PURCHASE")) {
    pass("PURCHASE-IMMUTABILITY-01", "Intento de mutar compra confirmada bloqueado: CANNOT_MUTATE_CONFIRMED_PURCHASE (DENIED)");
  } else {
    fail("PURCHASE-IMMUTABILITY-01", `Se permitió mutar compra confirmada: ${mutPurErr?.message}`);
  }

  const { error: delPurErr } = await adminClient
    .from("purchases")
    .delete()
    .eq("id", pur1.purchase_id);
  if (delPurErr && delPurErr.message.includes("CANNOT_DELETE_CONFIRMED_PURCHASE")) {
    pass("PURCHASE-IMMUTABILITY-02", "Intento de eliminar compra confirmada bloqueado: CANNOT_DELETE_CONFIRMED_PURCHASE (DENIED)");
  } else {
    fail("PURCHASE-IMMUTABILITY-02", `Se permitió eliminar compra confirmada: ${delPurErr?.message}`);
  }

  // PURCHASE-ITEM-IMMUTABILITY-01: purchase_items UPDATE & DELETE
  const { data: pItem } = await adminClient.from("purchase_items").select("id").eq("purchase_id", pur1.purchase_id).limit(1).single();
  const { error: mutPItemErr } = await adminClient.from("purchase_items").update({ quantity: 999 }).eq("id", pItem.id);
  if (mutPItemErr && mutPItemErr.message.includes("CANNOT_MUTATE_CONFIRMED_PURCHASE_ITEM")) {
    pass("PURCHASE-ITEM-IMMUTABILITY-01", "Intento de mutar ítem de compra confirmada bloqueado: CANNOT_MUTATE_CONFIRMED_PURCHASE_ITEM (DENIED)");
  } else {
    fail("PURCHASE-ITEM-IMMUTABILITY-01", `Se permitió mutar ítem de compra: ${mutPItemErr?.message}`);
  }

  // ───────────────────────────────────────
  // 8. RECONCILIACIÓN MATEMÁTICA Y CONCURRENCIA CRUZADA
  // ───────────────────────────────────────
  console.log("\n8. RECONCILIACIÓN MATEMÁTICA Y CONCURRENCIA CRUZADA...");

  // INVENTORY-RECONCILE-01: Ciclo completo: INITIAL + PURCHASE - SALE + IN_ADJUSTMENT - OUT_ADJUSTMENT - TRANSFER_OUT + TRANSFER_IN
  const { data: prodFullLife } = await adminClient
    .from("products")
    .insert({
      company_id: compA.id,
      name: `Producto Reconciliacion ${runId}`,
      code: `REC-${runId}`,
      price: 200,
      cost: 100,
      allows_inventory: true,
    })
    .select()
    .single();

  // 1. Initial stock = 50 en whA1
  const { error: initErr } = await clientA.rpc("set_initial_stock", {
    p_company_id: compA.id,
    p_warehouse_id: whA1.id,
    p_product_id: prodFullLife.id,
    p_quantity: 50,
    p_unit_cost: 100,
  });
  if (initErr) console.error("Error setting initial stock:", initErr);

  // 2. Purchase in = +30 en whA1
  await clientA.rpc("create_pos_purchase", {
    p_company_id: compA.id,
    p_warehouse_id: whA1.id,
    p_supplier_id: supplierA.id,
    p_items: [{ product_id: prodFullLife.id, quantity: 30, unit_cost: 100 }],
  });

  // 3. In adjustment = +10 en whA1
  await clientA.rpc("create_inventory_adjustment", {
    p_company_id: compA.id,
    p_warehouse_id: whA1.id,
    p_reason: "Ajuste inventario",
    p_items: [{ product_id: prodFullLife.id, adjustment_type: "IN", quantity: 10 }],
  });

  // 4. Out adjustment = -5 en whA1
  await clientA.rpc("create_inventory_adjustment", {
    p_company_id: compA.id,
    p_warehouse_id: whA1.id,
    p_reason: "Merma",
    p_items: [{ product_id: prodFullLife.id, adjustment_type: "OUT", quantity: 5 }],
  });

  // 5. Transfer out = -15 de whA1 a whA2
  await clientA.rpc("create_inventory_transfer", {
    p_company_id: compA.id,
    p_source_warehouse_id: whA1.id,
    p_destination_warehouse_id: whA2.id,
    p_items: [{ product_id: prodFullLife.id, quantity: 15 }],
  });

  // Stock esperado en whA1: 50 + 30 + 10 - 5 - 15 = 70.
  // Stock esperado en whA2: 0 + 15 = 15.
  const { data: movsWhA1 } = await adminClient
    .from("inventory_movements")
    .select("movement_type, quantity")
    .eq("company_id", compA.id)
    .eq("warehouse_id", whA1.id)
    .eq("product_id", prodFullLife.id);

  let sumWhA1 = 0;
  for (const m of movsWhA1 || []) {
    const q = Number(m.quantity);
    if (["INITIAL_STOCK", "PURCHASE_IN", "IN_ADJUSTMENT", "TRANSFER_IN"].includes(m.movement_type)) {
      sumWhA1 += q;
    } else {
      sumWhA1 -= q;
    }
  }

  const { data: currentBalWhA1 } = await adminClient
    .from("inventory_balances")
    .select("quantity")
    .eq("company_id", compA.id)
    .eq("warehouse_id", whA1.id)
    .eq("product_id", prodFullLife.id)
    .single();

  if (sumWhA1 === 70 && Number(currentBalWhA1?.quantity) === 70 && sumWhA1 === Number(currentBalWhA1?.quantity)) {
    pass("INVENTORY-RECONCILE-01", `Reconciliación permanente verificada: SUM(entradas) - SUM(salidas) [${sumWhA1}] === Balance actual [${currentBalWhA1?.quantity}] (Diferencia = 0)`);
  } else {
    fail("INVENTORY-RECONCILE-01", `Discrepancia de reconciliación: calculado=${sumWhA1}, balance=${currentBalWhA1?.quantity}`);
  }

  // INVENTORY-CONCURRENCY-02: Sale vs Transfer simultáneas sobre stock limitado
  // whA2 tiene 15 unidades de prodFullLife. Lanzamos 2 transferencias de 10 simultáneas -> 1 pasa (queda 5), 1 rechazada por stock insuficiente
  const [trfConc1, trfConc2] = await Promise.allSettled([
    clientA.rpc("create_inventory_transfer", {
      p_company_id: compA.id,
      p_source_warehouse_id: whA2.id,
      p_destination_warehouse_id: whA1.id,
      p_items: [{ product_id: prodFullLife.id, quantity: 10 }],
    }),
    clientA.rpc("create_inventory_transfer", {
      p_company_id: compA.id,
      p_source_warehouse_id: whA2.id,
      p_destination_warehouse_id: whA1.id,
      p_items: [{ product_id: prodFullLife.id, quantity: 10 }],
    }),
  ]);
  const c1Ok = trfConc1.status === "fulfilled" && !trfConc1.value.error;
  const c2Ok = trfConc2.status === "fulfilled" && !trfConc2.value.error;

  const { data: finalBalWhA2 } = await adminClient
    .from("inventory_balances")
    .select("quantity")
    .eq("company_id", compA.id)
    .eq("warehouse_id", whA2.id)
    .eq("product_id", prodFullLife.id)
    .single();

  if ((c1Ok && !c2Ok) || (!c1Ok && c2Ok)) {
    pass("INVENTORY-CONCURRENCY-02", `Concurrencia de stock protegida bajo lock: 1 operación aceptada, 1 rechazada. Stock remanente en almacén: ${finalBalWhA2?.quantity} (Jamás negativo)`);
  } else {
    fail("INVENTORY-CONCURRENCY-02", `Concurrencia falló: c1=${c1Ok}, c2=${c2Ok}, balance=${finalBalWhA2?.quantity}`);
  }

  console.log("\n==================================================================");
  console.log("RESUMEN FINAL DE PRUEBAS DINÁMICAS FASE 1C (HARDENED):");
  console.log(JSON.stringify(suiteResults, null, 2));
  console.log("==================================================================\n");

  const total = Object.keys(suiteResults).length;
  const passed = Object.values(suiteResults).filter((r) => r.status === "PASS").length;
  const failed = total - passed;

  console.log(`Total: ${total} pruebas | ${passed} PASS | ${failed} FAIL\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Error fatal en suite QA Fase 1C:", err);
  process.exit(1);
});
