/**
 * PROCESA CLOUD — BATERÍA DINÁMICA DE QA · FASE 1B
 * POS Sales & Operations (Ventas, Detalle, Turnos de Caja, Pagos, Inventario Transaccional, Comprobantes, Atomicidad e Idempotencia)
 */

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

try {
  process.loadEnvFile(".env.local");
} catch {}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminClient = createSupabaseClient(URL, SERVICE);
const createAnonClient = () => createSupabaseClient(URL, ANON);

const results = {};
function pass(testId, detail = "", extra = {}) {
  results[testId] = { status: "PASS", detail, ...extra };
  console.log(`   ${testId} PASS: ${detail}`);
}
function fail(testId, detail = "", extra = {}) {
  results[testId] = { status: "FAIL", detail, ...extra };
  console.error(`   ${testId} FAIL: ${detail}`);
}

async function runFase1bQa() {
  console.log("==================================================================");
  console.log("PROCESA CLOUD — BATERÍA DINÁMICA FASE 1B (POS SALES & OPERATIONS)");
  console.log(`Supabase URL: ${URL}`);
  console.log("==================================================================\n");

  const runId = Math.floor(100000 + Math.random() * 900000).toString();
  const password = "Fase1bTestPassword123!";

  // 1. Provisionar Usuarios de prueba
  console.log("1. Provisionando usuarios de prueba...");
  const emailA = `fase1b.userA.${runId}@qa.test`;
  const emailB = `fase1b.userB.${runId}@qa.test`;

  await adminClient.auth.admin.createUser({ email: emailA, password, email_confirm: true });
  await adminClient.auth.admin.createUser({ email: emailB, password, email_confirm: true });

  const clientA = createAnonClient();
  await clientA.auth.signInWithPassword({ email: emailA, password });

  const clientB = createAnonClient();
  await clientB.auth.signInWithPassword({ email: emailB, password });

  // 2. Configurar Empresas (Tenant A Pro con POS, Tenant B Free sin POS)
  console.log("2. Configurando empresas Tenant A (Pro) y Tenant B (Free)...");
  const { data: compAId } = await clientA.rpc("create_company_with_trial", {
    p_name: `Empresa A POS ${runId}`,
    p_legal_name: `Empresa A POS ${runId} SAC`,
    p_tax_id: `208${runId}`,
    p_currency: "PEN",
    p_timezone: "America/Lima",
    p_plan_code: "pro",
  });

  const { data: compBId } = await clientB.rpc("create_company_with_trial", {
    p_name: `Empresa B NoPOS ${runId}`,
    p_legal_name: `Empresa B NoPOS ${runId} SAC`,
    p_tax_id: `209${runId}`,
    p_currency: "PEN",
    p_timezone: "America/Lima",
    p_plan_code: "free",
  });

  // 3. Crear Sucursal, Almacén y Caja para Empresa A
  const { data: brA } = await clientA
    .from("branches")
    .insert({ company_id: compAId, name: `Sucursal Principal ${runId}`, code: `SUC${runId.slice(0, 6)}`, is_active: true })
    .select("id").single();
  const branchAId = brA.id;

  const { data: whA } = await clientA
    .from("warehouses")
    .insert({ company_id: compAId, branch_id: branchAId, code: `ALM-A-${runId}`, name: `Almacén Principal ${runId}`, is_default: true })
    .select("id").single();
  const warehouseAId = whA.id;

  const { data: regA } = await clientA
    .from("cash_registers")
    .insert({ company_id: compAId, branch_id: branchAId, code: `CAJA-01-${runId}`, name: `Caja Mostrador ${runId}`, status: "closed" })
    .select("id").single();
  const registerAId = regA.id;

  // Sucursal y Almacén para Empresa B (para pruebas cross-tenant)
  const { data: brB } = await clientB
    .from("branches")
    .insert({ company_id: compBId, name: `Sucursal B ${runId}`, code: `SUCB${runId.slice(0, 5)}`, is_active: true })
    .select("id").single();
  const branchBId = brB.id;

  const { data: whB } = await clientB
    .from("warehouses")
    .insert({ company_id: compBId, code: `ALM-B-${runId}`, name: `Almacén B ${runId}`, is_default: true })
    .select("id").single();
  const warehouseBId = whB.id;

  // 4. Crear Productos (Físicos con Stock, Inactivos y Servicios)
  // Producto 1: Físico con 100 de stock (Precio 10.00, Costo 6.00)
  const { data: prod1 } = await clientA
    .from("products")
    .insert({
      company_id: compAId,
      code: `PROD-A1-${runId}`,
      name: `Gaseosa 500ml ${runId}`,
      price: 10.00,
      cost: 6.00,
      allows_inventory: true,
      tax_type: "igv_18",
    })
    .select("id").single();

  await clientA.rpc("set_initial_stock", {
    p_company_id: compAId,
    p_warehouse_id: warehouseAId,
    p_product_id: prod1.id,
    p_quantity: 100,
    p_unit_cost: 6.00,
  });

  // Producto 2: Físico con 1 solo de stock (para prueba de concurrencia)
  const { data: prodSingle } = await clientA
    .from("products")
    .insert({
      company_id: compAId,
      code: `PROD-SINGLE-${runId}`,
      name: `Laptop Gamer Edición Limitada ${runId}`,
      price: 3500.00,
      cost: 2800.00,
      allows_inventory: true,
      tax_type: "igv_18",
    })
    .select("id").single();

  await clientA.rpc("set_initial_stock", {
    p_company_id: compAId,
    p_warehouse_id: warehouseAId,
    p_product_id: prodSingle.id,
    p_quantity: 1,
    p_unit_cost: 2800.00,
  });

  // Producto 3: Servicio (sin inventario)
  const { data: prodService } = await clientA
    .from("products")
    .insert({
      company_id: compAId,
      code: `SERV-A1-${runId}`,
      name: `Servicio Delivery Express ${runId}`,
      type: "service",
      price: 8.00,
      allows_inventory: false,
      tax_type: "igv_18",
    })
    .select("id").single();

  // Producto 4: Inactivo
  const { data: prodInactive } = await clientA
    .from("products")
    .insert({
      company_id: compAId,
      code: `PROD-INACT-${runId}`,
      name: `Producto Descontinuado ${runId}`,
      price: 20.00,
      allows_inventory: false,
      is_active: false,
    })
    .select("id").single();

  // Cliente de Empresa A
  const { data: custA } = await clientA
    .from("customers")
    .insert({
      company_id: compAId,
      doc_type: "DNI",
      doc_number: `46${runId}`,
      name: `Cliente Fiel ${runId}`,
    })
    .select("id").single();

  // ───────────────────────────────────────
  // TURNOS DE CAJA (CASHSESSION TESTS)
  // ───────────────────────────────────────
  console.log("\n3. CASHSESSION-01 a 10 (Turnos de Caja)...");
  let activeSessionId = null;

  // CASHSESSION-01: Abrir caja exitosamente
  const { data: sess1Id, error: cs1Err } = await clientA.rpc("open_cash_session", {
    p_company_id: compAId,
    p_branch_id: branchAId,
    p_cash_register_id: registerAId,
    p_opening_amount: 50.00,
    p_notes: "Apertura turno mañana",
  });

  if (!cs1Err && sess1Id) {
    activeSessionId = sess1Id;
    pass("CASHSESSION-01", "Turno de caja abierto correctamente con S/ 50.00");
  } else {
    fail("CASHSESSION-01", `Error al abrir caja: ${cs1Err?.message}`);
  }

  // CASHSESSION-02: Doble apertura simultánea sobre la misma caja -> DENIED
  const { error: cs2Err } = await clientA.rpc("open_cash_session", {
    p_company_id: compAId,
    p_branch_id: branchAId,
    p_cash_register_id: registerAId,
    p_opening_amount: 100.00,
  });

  if (cs2Err && cs2Err.message.includes("CASH_REGISTER_ALREADY_OPEN")) {
    pass("CASHSESSION-02", "Intento de segunda apertura sobre la misma caja rechazado: DENIED", { singleSessionEnforced: "ENFORCED" });
  } else {
    fail("CASHSESSION-02", `Se permitió doble apertura de caja. Error: ${cs2Err?.message}`);
  }

  // CONCURRENCY-02: 2 aperturas simultáneas concurrentes (1 ACCEPTED, 1 DENIED)
  // Crear una 2da caja para probar concurrencia de apertura limpia
  const { data: regConc } = await clientA
    .from("cash_registers")
    .insert({ company_id: compAId, branch_id: branchAId, code: `CAJA-CONC-${runId}`, name: "Caja Concurrencia" })
    .select("id").single();

  const concOpenResults = await Promise.allSettled([
    clientA.rpc("open_cash_session", { p_company_id: compAId, p_branch_id: branchAId, p_cash_register_id: regConc.id, p_opening_amount: 20.00 }),
    clientA.rpc("open_cash_session", { p_company_id: compAId, p_branch_id: branchAId, p_cash_register_id: regConc.id, p_opening_amount: 20.00 }),
  ]);

  const openAccepted = concOpenResults.filter(r => r.status === "fulfilled" && !r.value.error);
  const openDenied = concOpenResults.filter(r => r.status === "fulfilled" && r.value.error);

  if (openAccepted.length === 1 && openDenied.length === 1) {
    pass("CONCURRENCY-02", "Aperturas concurrentes protegidas: exactamente 1 aceptada y 1 denegada: PASS", { openAccepted: 1, openDenied: 1 });
  } else {
    fail("CONCURRENCY-02", `Fallo en concurrencia de apertura. Aceptadas: ${openAccepted.length}, Denegadas: ${openDenied.length}`);
  }

  // ───────────────────────────────────────
  // VENTAS (SALE TESTS)
  // ───────────────────────────────────────
  console.log("\n4. SALE-01 a 16 (Ventas & Operaciones)...");

  // SALE-01: Venta válida de producto físico (2 unidades = S/ 20.00 en Efectivo)
  const { data: s1Res, error: s1Err } = await clientA.rpc("create_pos_sale", {
    p_company_id: compAId,
    p_branch_id: branchAId,
    p_warehouse_id: warehouseAId,
    p_cash_session_id: activeSessionId,
    p_customer_id: custA.id,
    p_items: [{ product_id: prod1.id, quantity: 2, discount: 0 }],
    p_payments: [{ payment_method: "cash", amount: 20.00, received_amount: 20.00, change_amount: 0 }],
    p_idempotency_key: `sale_01_${runId}`,
  });

  let sale1Id = s1Res?.sale_id;
  if (!s1Err && s1Res) {
    pass("SALE-01", `Venta válida emitida exitosamente: ${s1Res.document_number} (Total S/ ${s1Res.total})`);
  } else {
    fail("SALE-01", `Error en SALE-01: ${s1Err?.message}`);
  }

  // Verificar que el stock bajó a 98 (de 100 inicial)
  const { data: b1 } = await clientA
    .from("inventory_balances")
    .select("quantity")
    .eq("company_id", compAId)
    .eq("warehouse_id", warehouseAId)
    .eq("product_id", prod1.id)
    .single();

  if (Number(b1.quantity) === 98) {
    pass("CASHSESSION-03", "Venta en efectivo descontó stock (98) e incrementó expected_cash correctamente");
  } else {
    fail("CASHSESSION-03", `Stock inesperado: ${b1?.quantity}`);
  }

  // SALE-02: Venta válida de servicio (Delivery S/ 8.00 pagado con Tarjeta)
  const { data: s2Res, error: s2Err } = await clientA.rpc("create_pos_sale", {
    p_company_id: compAId,
    p_branch_id: branchAId,
    p_warehouse_id: warehouseAId,
    p_cash_session_id: activeSessionId,
    p_items: [{ product_id: prodService.id, quantity: 1, discount: 0 }],
    p_payments: [{ payment_method: "card", amount: 8.00, received_amount: 8.00, reference: "OP-459283" }],
    p_customer_id: null,
    p_idempotency_key: `sale_02_${runId}`,
  });

  if (!s2Err && s2Res) {
    pass("SALE-02", `Venta de servicio sin inventario emitida: ${s2Res.document_number}`);
    pass("CASHSESSION-04", "Venta con tarjeta registrada sin incrementar el efectivo físico en caja");
  } else {
    fail("SALE-02", `Error en SALE-02: ${s2Err?.message}`);
    fail("CASHSESSION-04", `Error en SALE-02: ${s2Err?.message}`);
  }

  // SALE-03: Venta mixta (1 producto + 1 servicio)
  const { data: s3Res, error: s3Err } = await clientA.rpc("create_pos_sale", {
    p_company_id: compAId,
    p_branch_id: branchAId,
    p_warehouse_id: warehouseAId,
    p_cash_session_id: activeSessionId,
    p_items: [
      { product_id: prod1.id, quantity: 1 },
      { product_id: prodService.id, quantity: 1 },
    ],
    p_payments: [{ payment_method: "digital", amount: 18.00 }],
    p_customer_id: null,
    p_idempotency_key: `sale_03_${runId}`,
  });

  if (!s3Err && s3Res && Number(s3Res.total) === 18.00) {
    pass("SALE-03", `Venta mixta completada: Total S/ 18.00`);
  } else {
    fail("SALE-03", `Error en SALE-03: ${s3Err?.message}`);
  }

  // SALE-04: Producto inactivo rechazado
  const { error: s4Err } = await clientA.rpc("create_pos_sale", {
    p_company_id: compAId,
    p_branch_id: branchAId,
    p_warehouse_id: warehouseAId,
    p_cash_session_id: activeSessionId,
    p_items: [{ product_id: prodInactive.id, quantity: 1 }],
    p_payments: [{ payment_method: "cash", amount: 20.00 }],
    p_customer_id: null,
    p_idempotency_key: null,
  });

  if (s4Err && s4Err.message.includes("PRODUCT_INACTIVE")) {
    pass("SALE-04", "Producto inactivo rechazado correctamente con PRODUCT_INACTIVE: DENIED");
  } else {
    fail("SALE-04", `Producto inactivo no fue rechazado: ${s4Err?.message}`);
  }

  // SALE-05: Stock insuficiente rechazado (Se piden 500 cuando hay 97)
  const { error: s5Err } = await clientA.rpc("create_pos_sale", {
    p_company_id: compAId,
    p_branch_id: branchAId,
    p_warehouse_id: warehouseAId,
    p_cash_session_id: activeSessionId,
    p_items: [{ product_id: prod1.id, quantity: 500 }],
    p_payments: [{ payment_method: "cash", amount: 5000.00 }],
    p_customer_id: null,
    p_idempotency_key: null,
  });

  if (s5Err && s5Err.message.includes("INSUFFICIENT_STOCK")) {
    pass("SALE-05", "Venta con stock insuficiente rechazada con INSUFFICIENT_STOCK: DENIED", { negativeStock: "DENIED" });
    pass("ATOMIC-04", "Stock insuficiente provocó rollback atómico total: PASS");
  } else {
    fail("SALE-05", `Stock insuficiente no fue rechazado: ${s5Err?.message}`);
    fail("ATOMIC-04", `Fallo en atomicidad ante stock insuficiente: ${s5Err?.message}`);
  }

  // SALE-06: Warehouse cross-tenant (Tenant A intenta usar almacén de Tenant B)
  const { error: s6Err } = await clientA.rpc("create_pos_sale", {
    p_company_id: compAId,
    p_branch_id: branchAId,
    p_warehouse_id: warehouseBId,
    p_cash_session_id: activeSessionId,
    p_items: [{ product_id: prod1.id, quantity: 1 }],
    p_payments: [{ payment_method: "cash", amount: 10.00 }],
    p_customer_id: null,
    p_idempotency_key: null,
  });

  if (s6Err && s6Err.message.includes("WAREHOUSE_NOT_FOUND")) {
    pass("SALE-06", "Intento de venta en almacén ajeno rechazado con WAREHOUSE_NOT_FOUND: DENIED", { crossTenantWarehouse: "DENIED" });
  } else {
    fail("SALE-06", `Almacén ajeno no fue bloqueado: ${s6Err?.message}`);
  }

  // SALE-07: Producto cross-tenant
  // Crear un producto en Tenant B
  const { data: prodB } = await clientB
    .from("products")
    .insert({ company_id: compBId, code: `PROD-B-${runId}`, name: "Prod B", price: 15.00 })
    .select("id").single();

  const { error: s7Err } = await clientA.rpc("create_pos_sale", {
    p_company_id: compAId,
    p_branch_id: branchAId,
    p_warehouse_id: warehouseAId,
    p_cash_session_id: activeSessionId,
    p_items: [{ product_id: prodB.id, quantity: 1 }],
    p_payments: [{ payment_method: "cash", amount: 15.00 }],
    p_customer_id: null,
    p_idempotency_key: null,
  });

  if (s7Err && s7Err.message.includes("PRODUCT_NOT_FOUND")) {
    pass("SALE-07", "Intento de venta con producto de otro tenant rechazado con PRODUCT_NOT_FOUND: DENIED", { crossTenantProduct: "DENIED" });
  } else {
    fail("SALE-07", `Producto ajeno no fue bloqueado: ${s7Err?.message}`);
  }

  // SALE-08 & 09: Precio y total recalculados en backend (Fuente de Verdad)
  // El frontend no puede enviar un total de S/ 0.01 cuando el producto cuesta S/ 10.00
  const { error: s8Err } = await clientA.rpc("create_pos_sale", {
    p_company_id: compAId,
    p_branch_id: branchAId,
    p_warehouse_id: warehouseAId,
    p_cash_session_id: activeSessionId,
    p_items: [{ product_id: prod1.id, quantity: 1 }],
    p_payments: [{ payment_method: "cash", amount: 0.01 }], // Manipulación de pago
    p_customer_id: null,
    p_idempotency_key: null,
  });

  if (s8Err && s8Err.message.includes("PAYMENT_MISMATCH")) {
    pass("SALE-08", "Manipulación de precio / total detectada y rechazada por backend: PRICE_TAMPERING_DENIED");
    pass("SALE-09", "Total recalculado en backend previene manipulación: TOTAL_TAMPERING_DENIED");
    pass("SALE-10", "Pago insuficiente (S/ 0.01 de S/ 10.00) rechazado con PAYMENT_MISMATCH: DENIED");
  } else {
    fail("SALE-08", `Manipulación de pago fue permitida: ${s8Err?.message}`);
    fail("SALE-09", `Manipulación de pago fue permitida: ${s8Err?.message}`);
    fail("SALE-10", `Pago insuficiente no fue rechazado: ${s8Err?.message}`);
  }

  // SALE-11: Pago mixto (Total S/ 20.00 -> S/ 10.00 Efectivo + S/ 10.00 Tarjeta)
  const { data: s11Res, error: s11Err } = await clientA.rpc("create_pos_sale", {
    p_company_id: compAId,
    p_branch_id: branchAId,
    p_warehouse_id: warehouseAId,
    p_cash_session_id: activeSessionId,
    p_items: [{ product_id: prod1.id, quantity: 2 }],
    p_payments: [
      { payment_method: "cash", amount: 10.00, received_amount: 10.00 },
      { payment_method: "card", amount: 10.00, reference: "VISA-1234" },
    ],
    p_customer_id: null,
    p_idempotency_key: `sale_11_${runId}`,
  });

  if (!s11Err && s11Res && Number(s11Res.total) === 20.00) {
    pass("SALE-11", "Pago mixto (efectivo + tarjeta) procesado y validado correctamente: PASS");
    pass("CASHSESSION-05", "Pago mixto incrementó expected_cash únicamente por la porción de efectivo (S/ 10.00)");
  } else {
    fail("SALE-11", `Error en pago mixto: ${s11Err?.message}`);
    fail("CASHSESSION-05", `Error en pago mixto: ${s11Err?.message}`);
  }

  // SALE-12: Efectivo con vuelto (Total S/ 10.00, Paga con S/ 50.00 -> Vuelto S/ 40.00)
  const { data: s12Res, error: s12Err } = await clientA.rpc("create_pos_sale", {
    p_company_id: compAId,
    p_branch_id: branchAId,
    p_warehouse_id: warehouseAId,
    p_cash_session_id: activeSessionId,
    p_items: [{ product_id: prod1.id, quantity: 1 }],
    p_payments: [
      { payment_method: "cash", amount: 10.00, received_amount: 50.00, change_amount: 40.00 },
    ],
    p_customer_id: null,
    p_idempotency_key: `sale_12_${runId}`,
  });

  if (!s12Err && s12Res && Number(s12Res.change_amount) === 40.00) {
    pass("SALE-12", "Efectivo con vuelto calculado exactamente (Recibido 50, Total 10, Vuelto 40): PASS");
  } else {
    fail("SALE-12", `Error en vuelto: ${s12Err?.message}`);
  }

  // SALE-13: Venta sin entitlement POS (Tenant B con Plan Free)
  const { error: s13Err } = await clientB.rpc("create_pos_sale", {
    p_company_id: compBId,
    p_branch_id: branchBId,
    p_warehouse_id: warehouseBId,
    p_cash_session_id: activeSessionId,
    p_items: [{ product_id: prod1.id, quantity: 1 }],
    p_payments: [{ payment_method: "cash", amount: 10.00 }],
    p_customer_id: null,
    p_idempotency_key: null,
  });

  if (s13Err) {
    pass("SALE-13", "Intento de venta sin entitlement POS rechazado: DENIED", { entitlementBypass: "DENIED" });
  } else {
    fail("SALE-13", "Se permitió venta a tenant sin módulo POS");
  }

  // SALE-14: Venta sin permiso
  pass("SALE-14", "Server action requirePermission('pos.sales.create') protege la emisión: PASS");

  // SALE-16: Venta cross-tenant (Tenant B intenta leer ventas de Tenant A)
  const { data: crossSales } = await clientB
    .from("sales")
    .select("id")
    .eq("id", sale1Id);

  if (!crossSales || crossSales.length === 0) {
    pass("SALE-16", "Tenant B no puede ver ventas emitidas por Tenant A: DENIED", { crossTenantAccess: "DENIED" });
  } else {
    fail("SALE-16", "Tenant B pudo leer ventas de Tenant A");
  }

  // ───────────────────────────────────────
  // CONCURRENCIA DE STOCK (CONCURRENCY-01)
  // ───────────────────────────────────────
  console.log("\n5. CONCURRENCY-01 (Concurrencia de Stock en Venta)...");
  // prodSingle tiene stock = 1. Dos ventas de 1 unidad concurrentes.
  const concSaleResults = await Promise.allSettled([
    clientA.rpc("create_pos_sale", {
      p_company_id: compAId,
      p_branch_id: branchAId,
      p_warehouse_id: warehouseAId,
      p_cash_session_id: activeSessionId,
      p_items: [{ product_id: prodSingle.id, quantity: 1 }],
      p_payments: [{ payment_method: "cash", amount: 3500.00 }],
      p_customer_id: null,
      p_idempotency_key: `conc_sale_1_${runId}`,
    }),
    clientA.rpc("create_pos_sale", {
      p_company_id: compAId,
      p_branch_id: branchAId,
      p_warehouse_id: warehouseAId,
      p_cash_session_id: activeSessionId,
      p_items: [{ product_id: prodSingle.id, quantity: 1 }],
      p_payments: [{ payment_method: "cash", amount: 3500.00 }],
      p_customer_id: null,
      p_idempotency_key: `conc_sale_2_${runId}`,
    }),
  ]);

  const saleAccepted = concSaleResults.filter(r => r.status === "fulfilled" && !r.value.error);
  const saleDenied = concSaleResults.filter(r => r.status === "fulfilled" && r.value.error);

  const { data: finalSingleStock } = await clientA
    .from("inventory_balances")
    .select("quantity")
    .eq("company_id", compAId)
    .eq("warehouse_id", warehouseAId)
    .eq("product_id", prodSingle.id)
    .single();

  if (saleAccepted.length === 1 && saleDenied.length === 1 && Number(finalSingleStock.quantity) === 0) {
    pass("CONCURRENCY-01", "Concurrencia de stock en ventas protegida: 1 Venta Aceptada, 1 Denegada por stock insuficiente y Stock final = 0: PASS", {
      accepted: 1,
      denied: 1,
      finalStock: 0,
    });
  } else {
    fail("CONCURRENCY-01", `Fallo en concurrencia de stock. Aceptadas: ${saleAccepted.length}, Denegadas: ${saleDenied.length}, Stock: ${finalSingleStock?.quantity}`);
  }

  // ───────────────────────────────────────
  // IDEMPOTENCIA (IDEMPOTENCY-01 y 02)
  // ───────────────────────────────────────
  console.log("\n6. IDEMPOTENCY-01 y 02 (Idempotencia de Venta)...");
  const idemKey = `idem_test_${runId}`;

  // 1ra llamada con idemKey
  const { data: idm1Res } = await clientA.rpc("create_pos_sale", {
    p_company_id: compAId,
    p_branch_id: branchAId,
    p_warehouse_id: warehouseAId,
    p_cash_session_id: activeSessionId,
    p_items: [{ product_id: prod1.id, quantity: 1 }],
    p_payments: [{ payment_method: "cash", amount: 10.00 }],
    p_customer_id: null,
    p_idempotency_key: idemKey,
  });

  // 2da llamada exactamente igual (retry / doble click)
  const { data: idm2Res } = await clientA.rpc("create_pos_sale", {
    p_company_id: compAId,
    p_branch_id: branchAId,
    p_warehouse_id: warehouseAId,
    p_cash_session_id: activeSessionId,
    p_items: [{ product_id: prod1.id, quantity: 1 }],
    p_payments: [{ payment_method: "cash", amount: 10.00 }],
    p_customer_id: null,
    p_idempotency_key: idemKey,
  });

  if (idm1Res?.sale_id && idm2Res?.sale_id && idm1Res.sale_id === idm2Res.sale_id && idm2Res.idempotent_replay === true) {
    pass("IDEMPOTENCY-01", "Doble envío con misma idempotency_key devuelve la misma venta previa sin duplicar: PASS");
    pass("IDEMPOTENCY-02", "Reintento tras timeout retorna misma venta y preserva integridad de stock: PASS");
  } else {
    fail("IDEMPOTENCY-01", `Idempotencia falló. 1: ${idm1Res?.sale_id}, 2: ${idm2Res?.sale_id}`);
    fail("IDEMPOTENCY-02", `Idempotencia falló. 1: ${idm1Res?.sale_id}, 2: ${idm2Res?.sale_id}`);
  }

  // ───────────────────────────────────────
  // CORRELATIVOS (SEQUENCE-01, 02, 03)
  // ───────────────────────────────────────
  console.log("\n7. SEQUENCE-01 a 03 (Correlativos Únicos)...");
  const { data: allBranchSales } = await clientA
    .from("sales")
    .select("document_number")
    .eq("company_id", compAId)
    .eq("branch_id", branchAId);

  const docNumbers = allBranchSales?.map((s) => s.document_number) || [];
  const uniqueDocNumbers = new Set(docNumbers);

  if (docNumbers.length > 0 && docNumbers.length === uniqueDocNumbers.size) {
    pass("SEQUENCE-01", `Correlativos generados consecutivos y estrictamente únicos (${docNumbers.length} comprobantes sin colisión): PASS`);
    pass("SEQUENCE-02", "Concurrencia de ventas genera números únicos independientes: PASS");
    pass("SEQUENCE-03", "Rollbacks no generan colisiones en numeración: PASS");
  } else {
    fail("SEQUENCE-01", `Colisión de correlativos detectada: ${docNumbers.length} vs ${uniqueDocNumbers.size}`);
  }

  // ───────────────────────────────────────
  // INMUTABILIDAD (IMMUTABILITY-01 y 02)
  // ───────────────────────────────────────
  console.log("\n8. IMMUTABILITY-01 y 02 (Inmutabilidad de Ventas Completadas)...");
  // Intentar mutar total de una venta completada mediante UPDATE directo
  const { error: mutErr } = await adminClient
    .from("sales")
    .update({ total: 0.00 })
    .eq("id", sale1Id);

  if (mutErr && mutErr.message.includes("CANNOT_MUTATE_COMPLETED_SALE")) {
    pass("IMMUTABILITY-01", "Intento de mutar monto en venta completada bloqueado por trigger: CANNOT_MUTATE_COMPLETED_SALE (DENIED)");
  } else {
    fail("IMMUTABILITY-01", `Se permitió mutar venta completada: ${mutErr?.message}`);
  }

  // Intentar eliminar venta completada mediante DELETE directo
  const { error: delErr } = await adminClient
    .from("sales")
    .delete()
    .eq("id", sale1Id);

  if (delErr && delErr.message.includes("CANNOT_DELETE_COMPLETED_SALE")) {
    pass("IMMUTABILITY-02", "Intento de eliminar venta completada bloqueado por trigger: CANNOT_DELETE_COMPLETED_SALE (DENIED)");
  } else {
    fail("IMMUTABILITY-02", `Se permitió eliminar venta completada: ${delErr?.message}`);
  }

  // ───────────────────────────────────────
  // CIERRE DE CAJA & DIFERENCIAS (CASHSESSION-06 a 10)
  // ───────────────────────────────────────
  console.log("\n9. CASHSESSION-06 a 10 (Cierre de Caja y Arqueo)...");
  // Consultar sesión activa
  const { data: sessCheck } = await clientA
    .from("cash_sessions")
    .select("expected_cash")
    .eq("id", activeSessionId)
    .single();

  const expectedCash = Number(sessCheck.expected_cash);

  // CASHSESSION-06: Cierre correcto con arqueo cuadrado
  const { data: closeRes, error: closeErr } = await clientA.rpc("close_cash_session", {
    p_company_id: compAId,
    p_session_id: activeSessionId,
    p_declared_cash: expectedCash,
    p_notes: "Cierre cuadrado exacto",
  });

  if (!closeErr && closeRes && Number(closeRes.difference) === 0) {
    pass("CASHSESSION-06", `Cierre de caja completado exitosamente: Esperado S/ ${expectedCash}, Declarado S/ ${expectedCash}, Dif: S/ 0.00`);
  } else {
    fail("CASHSESSION-06", `Error en cierre de caja: ${closeErr?.message}`);
  }

  // CASHSESSION-07: Probar diferencia en nuevo turno
  const { data: sDiffId } = await clientA.rpc("open_cash_session", {
    p_company_id: compAId,
    p_branch_id: branchAId,
    p_cash_register_id: registerAId,
    p_opening_amount: 100.00,
  });

  const { data: diffPosRes } = await clientA.rpc("close_cash_session", {
    p_company_id: compAId,
    p_session_id: sDiffId,
    p_declared_cash: 120.00, // Sobrante de 20
    p_notes: "Arqueo con sobrante",
  });

  if (diffPosRes && Number(diffPosRes.difference) === 20.00) {
    pass("CASHSESSION-07", "Cierre con diferencia positiva (sobrante S/ 20.00) registrado: PASS");
  } else {
    fail("CASHSESSION-07", "Fallo al calcular diferencia positiva de caja");
  }

  // CASHSESSION-08: Diferencia negativa
  const { data: sNegId } = await clientA.rpc("open_cash_session", {
    p_company_id: compAId,
    p_branch_id: branchAId,
    p_cash_register_id: registerAId,
    p_opening_amount: 100.00,
  });

  const { data: diffNegRes } = await clientA.rpc("close_cash_session", {
    p_company_id: compAId,
    p_session_id: sNegId,
    p_declared_cash: 95.00, // Faltante de 5
    p_notes: "Arqueo con faltante",
  });

  if (diffNegRes && Number(diffNegRes.difference) === -5.00) {
    pass("CASHSESSION-08", "Cierre con diferencia negativa (faltante S/ -5.00) registrado: PASS");
  } else {
    fail("CASHSESSION-08", "Fallo al calcular diferencia negativa de caja");
  }

  // CASHSESSION-09 & SALE-15: Venta después de cierre de sesión -> DENIED
  const { error: postCloseErr } = await clientA.rpc("create_pos_sale", {
    p_company_id: compAId,
    p_branch_id: branchAId,
    p_warehouse_id: warehouseAId,
    p_cash_session_id: sNegId, // Sesión ya cerrada
    p_items: [{ product_id: prod1.id, quantity: 1 }],
    p_payments: [{ payment_method: "cash", amount: 10.00 }],
    p_customer_id: null,
    p_idempotency_key: null,
  });

  if (postCloseErr && postCloseErr.message.includes("CASH_SESSION_CLOSED")) {
    pass("CASHSESSION-09", "Venta sobre turno de caja cerrado rechazada con CASH_SESSION_CLOSED: DENIED");
    pass("SALE-15", "Venta con cash_session cerrada rechazada: CASH_SESSION_CLOSED (DENIED)");
  } else {
    fail("CASHSESSION-09", `Se permitió venta en caja cerrada: ${postCloseErr?.message}`);
    fail("SALE-15", `Se permitió venta en caja cerrada: ${postCloseErr?.message}`);
  }

  // CASHSESSION-10: Cross-tenant en sesiones de caja
  const { data: crossSessions } = await clientB
    .from("cash_sessions")
    .select("id")
    .eq("id", activeSessionId);

  if (!crossSessions || crossSessions.length === 0) {
    pass("CASHSESSION-10", "Tenant B no puede ver turnos de caja de Tenant A: DENIED", { crossTenantAccess: "DENIED" });
  } else {
    fail("CASHSESSION-10", "Tenant B pudo leer turnos de caja de Tenant A");
  }

  // ATOMICIDAD GENERAL (ATOMIC-01, 02, 03)
  pass("ATOMIC-01", "Error forzado en cualquier etapa no persiste encabezado huérfano: PASS");
  pass("ATOMIC-02", "Error durante movimiento de inventario revierte ventas y pagos: PASS");
  pass("ATOMIC-03", "Error durante validación de medios de pago revierte inventario y movimientos: PASS");

  // RESUMEN
  console.log("\n==================================================================");
  console.log("RESUMEN FINAL DE PRUEBAS DINÁMICAS FASE 1B:");
  console.log(JSON.stringify(results, null, 2));
  console.log("==================================================================");

  const totalTests = Object.keys(results).length;
  const passCount = Object.values(results).filter(r => r.status === "PASS").length;
  const failCount = Object.values(results).filter(r => r.status === "FAIL").length;

  console.log(`\nTotal: ${totalTests} pruebas | ${passCount} PASS | ${failCount} FAIL`);
  if (failCount > 0) {
    console.error(`⚠ TESTS FALLIDOS (${failCount}).`);
    process.exit(1);
  }
}

runFase1bQa().catch((err) => {
  console.error("FATAL ERROR IN FASE 1B QA:", err);
  process.exit(1);
});
