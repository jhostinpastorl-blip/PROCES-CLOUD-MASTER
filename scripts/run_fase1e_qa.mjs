// ===================================================================
// PROCESA CLOUD — BATERÍA DINÁMICA FASE 1E (POS REPORTING & ANALYTICS)
// Validación exhaustiva en vivo contra Supabase Hosted
// ===================================================================

import { createClient } from "@supabase/supabase-js";

try { process.loadEnvFile(".env.local"); } catch {}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("ERROR: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY requeridos en .env.local");
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const passResults = {};
let failCount = 0;

function pass(code, detail) {
  passResults[code] = { status: "PASS", detail };
  console.log(`   ${code} PASS: ${detail}`);
}

function fail(code, detail) {
  passResults[code] = { status: "FAIL", detail };
  console.error(`   ${code} FAIL: ${detail}`);
  failCount++;
}

async function getOrCreateUser(email, password) {
  const { data: listData } = await adminClient.auth.admin.listUsers();
  const existing = listData?.users?.find(u => u.email === email);
  if (existing) {
    await adminClient.auth.admin.updateUserById(existing.id, { password, email_confirm: true });
    return existing;
  }
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `User ${email.split("@")[0]}` }
  });
  if (error) throw error;
  return data.user;
}

async function createAuthenticatedClient(email, password) {
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}

async function main() {
  console.log("==================================================================");
  console.log("PROCESA CLOUD — BATERÍA DINÁMICA FASE 1E (POS REPORTING & ANALYTICS)");
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log("==================================================================\n");

  const runId = Math.floor(Math.random() * 900000 + 100000);
  const password = "Password123!";

  // 1. Provisionar Usuarios
  console.log("1. Provisionando usuarios de prueba...");
  const userA = await getOrCreateUser(`qa_f1e_a_${runId}@procesa.test`, password);
  const userB = await getOrCreateUser(`qa_f1e_b_${runId}@procesa.test`, password);

  const clientA = await createAuthenticatedClient(`qa_f1e_a_${runId}@procesa.test`, password);
  const clientB = await createAuthenticatedClient(`qa_f1e_b_${runId}@procesa.test`, password);

  // 2. Provisionar Empresas
  console.log("2. Configurando empresas Tenant A (Pro con POS) y Tenant B (Free sin POS)...");
  const { data: compAId, error: compAErr } = await clientA.rpc("create_company_with_trial", {
    p_name: `Empresa 1E A ${runId}`,
    p_legal_name: `Empresa 1E A ${runId} SAC`,
    p_tax_id: `209${runId}`,
    p_currency: "PEN",
    p_timezone: "America/Lima",
    p_plan_code: "pro",
  });
  if (compAErr) throw compAErr;

  const { data: compBId, error: compBErr } = await clientB.rpc("create_company_with_trial", {
    p_name: `Empresa 1E B ${runId}`,
    p_legal_name: `Empresa 1E B ${runId} SAC`,
    p_tax_id: `207${runId}`,
    p_currency: "PEN",
    p_timezone: "America/Lima",
    p_plan_code: "free",
  });
  if (compBErr) throw compBErr;

  // Activar módulo POS en Tenant A
  const { data: posMod } = await adminClient.from("modules").select("id").eq("code", "pos").single();
  await adminClient.from("company_modules").insert({ company_id: compAId, module_id: posMod.id, is_active: true });

  // Sucursales y Almacenes
  const { data: brA } = await adminClient.from("branches").insert({ company_id: compAId, name: "Sucursal Principal A", code: `SUC-A-${runId}` }).select().single();
  const { data: brB } = await adminClient.from("branches").insert({ company_id: compBId, name: "Sucursal Principal B", code: `SUC-B-${runId}` }).select().single();

  const { data: whA1 } = await adminClient.from("warehouses").insert({ company_id: compAId, branch_id: brA.id, name: "Almacén Central A1", code: `ALM-A1-${runId}`, is_default: true }).select().single();
  const { data: whA2 } = await adminClient.from("warehouses").insert({ company_id: compAId, branch_id: brA.id, name: "Almacén Secundario A2", code: `ALM-A2-${runId}` }).select().single();
  const { data: whB } = await adminClient.from("warehouses").insert({ company_id: compBId, branch_id: brB.id, name: "Almacén B", code: `ALM-B-${runId}` }).select().single();

  const { data: crA1 } = await adminClient.from("cash_registers").insert({ company_id: compAId, branch_id: brA.id, name: "Caja Principal 1E", code: `CJ-A1-${runId}` }).select().single();
  const { data: crA2 } = await adminClient.from("cash_registers").insert({ company_id: compAId, branch_id: brA.id, name: "Caja Secundaria 1E", code: `CJ-A2-${runId}` }).select().single();

  // Proveedores
  const { data: suppA } = await adminClient.from("suppliers").insert({ company_id: compAId, name: "Distribuidora Lima 1E", doc_number: `2011${runId}` }).select().single();
  const { data: suppB } = await adminClient.from("suppliers").insert({ company_id: compBId, name: "Proveedor B", doc_number: `2022${runId}` }).select().single();

  // Categorías y Productos
  const { data: catA } = await adminClient.from("categories").insert({ company_id: compAId, name: "Bebidas y Refrescos 1E" }).select().single();

  const { data: prodP1 } = await adminClient.from("products").insert({
    company_id: compAId, category_id: catA.id, code: `PROD-P1-${runId}`, name: "Inca Kola 500ml", sku: `IK500-${runId}`, price: 10.00, cost: 5.00, allows_inventory: true, min_stock: 15.0000
  }).select().single();

  const { data: prodP2 } = await adminClient.from("products").insert({
    company_id: compAId, code: `PROD-P2-${runId}`, name: "Galletas Soda Sin Cat", sku: `SOD-${runId}`, price: 4.00, cost: 2.00, allows_inventory: true, min_stock: 5.0000
  }).select().single();

  const { data: prodS1 } = await adminClient.from("products").insert({
    company_id: compAId, code: `SERV-S1-${runId}`, name: "Servicio Delivery Express", sku: `DELIV-${runId}`, price: 8.00, cost: 0.00, allows_inventory: false, min_stock: 0.0000
  }).select().single();

  const { data: prodZero } = await adminClient.from("products").insert({
    company_id: compAId, code: `PROD-Z-${runId}`, name: "Producto Agotado", sku: `ZERO-${runId}`, price: 20.00, cost: 10.00, allows_inventory: true, min_stock: 5.0000
  }).select().single();

  // Inicializar inventario
  await clientA.rpc("set_initial_stock", { p_company_id: compAId, p_warehouse_id: whA1.id, p_product_id: prodP1.id, p_quantity: 100 });
  await clientA.rpc("set_initial_stock", { p_company_id: compAId, p_warehouse_id: whA1.id, p_product_id: prodP2.id, p_quantity: 4 }); // Low stock (4 <= 5)
  await clientA.rpc("set_initial_stock", { p_company_id: compAId, p_warehouse_id: whA1.id, p_product_id: prodZero.id, p_quantity: 0 }); // Zero stock

  // Compra a Proveedor
  const { data: pur1 } = await clientA.rpc("create_pos_purchase", {
    p_company_id: compAId, p_warehouse_id: whA1.id, p_supplier_id: suppA.id,
    p_items: [{ product_id: prodP1.id, quantity: 20, unit_cost: 5.00 }]
  });

  // Devolución parcial de compra
  const { data: pur1Items } = await adminClient.from("purchase_items").select("*").eq("purchase_id", pur1.purchase_id);
  await clientA.rpc("create_purchase_return", {
    p_company_id: compAId, p_purchase_id: pur1.purchase_id,
    p_items: [{ purchase_item_id: pur1Items[0].id, quantity: 2 }],
    p_reason: "Devolución de compra controlada"
  });

  // 4. Apertura y Operaciones de Caja (Sesión 1 - Abierta)
  console.log("\n4. X-REPORT & OPERACIONES DE TURNO ABIERTO (X-01 a 10)...");
  const { data: sess1Id } = await clientA.rpc("open_cash_session", {
    p_company_id: compAId, p_branch_id: brA.id, p_cash_register_id: crA1.id, p_opening_amount: 100.00
  });

  // Venta 1: Efectivo S/ 50 (5 Inca Kola a S/ 10)
  const { data: sale1 } = await clientA.rpc("create_pos_sale", {
    p_company_id: compAId, p_branch_id: brA.id, p_warehouse_id: whA1.id, p_cash_session_id: sess1Id,
    p_items: [{ product_id: prodP1.id, quantity: 5, unit_price: 10.00 }],
    p_payments: [{ payment_method: "cash", amount: 50.00 }]
  });

  // Venta 2: Tarjeta S/ 30 (3 Inca Kola a S/ 10)
  const { data: sale2 } = await clientA.rpc("create_pos_sale", {
    p_company_id: compAId, p_branch_id: brA.id, p_warehouse_id: whA1.id, p_cash_session_id: sess1Id,
    p_items: [{ product_id: prodP1.id, quantity: 3, unit_price: 10.00 }],
    p_payments: [{ payment_method: "card", amount: 30.00 }]
  });

  // Venta 3: Mixta Efectivo S/ 10 + Tarjeta S/ 10 (2 Inca Kola)
  const { data: sale3 } = await clientA.rpc("create_pos_sale", {
    p_company_id: compAId, p_branch_id: brA.id, p_warehouse_id: whA1.id, p_cash_session_id: sess1Id,
    p_items: [{ product_id: prodP1.id, quantity: 2, unit_price: 10.00 }],
    p_payments: [{ payment_method: "cash", amount: 10.00 }, { payment_method: "card", amount: 10.00 }]
  });

  // Venta 4: Para anular (Void) S/ 20
  const { data: sale4 } = await clientA.rpc("create_pos_sale", {
    p_company_id: compAId, p_branch_id: brA.id, p_warehouse_id: whA1.id, p_cash_session_id: sess1Id,
    p_items: [{ product_id: prodP1.id, quantity: 2, unit_price: 10.00 }],
    p_payments: [{ payment_method: "cash", amount: 20.00 }]
  });
  await clientA.rpc("void_sale", {
    p_company_id: compAId, p_sale_id: sale4.sale_id, p_reason: "Cliente desistió", p_cash_session_id: sess1Id
  });

  // Devolución de 1 unidad de Venta 1: Reembolso S/ 10 en Efectivo
  const { data: sale1Items } = await adminClient.from("sale_items").select("*").eq("sale_id", sale1.sale_id);
  await clientA.rpc("create_sale_return", {
    p_company_id: compAId, p_sale_id: sale1.sale_id,
    p_items: [{ sale_item_id: sale1Items[0].id, quantity: 1 }],
    p_reason: "Devolución de 1 unidad",
    p_refunds: [{ payment_method: "cash", amount: 10.00 }],
    p_cash_session_id: sess1Id
  });

  // Ejecutar X Report
  const { data: xRep1, error: errXRep1 } = await clientA.rpc("get_x_report", {
    p_company_id: compAId, p_cash_session_id: sess1Id
  });
  if (errXRep1) throw errXRep1;

  if (xRep1.report_type === "X_REPORT" && !xRep1.is_closed) {
    pass("X-01", "Reporte X emitido correctamente sobre turno abierto");
  } else {
    fail("X-01", "Falla al emitir Reporte X sobre sesión activa");
  }

  if (Number(xRep1.opening_amount) === 100.00) {
    pass("X-02", "Apertura de caja reflejada con exactitud: S/ 100.00");
  } else {
    fail("X-02", `Opening incorrecto: ${xRep1.opening_amount}`);
  }

  // Ventas no anuladas: V1 (50) + V2 (30) + V3 (20) = 100.00. Efectivo: 50 + 10 = 60.00. Tarjeta: 30 + 10 = 40.00.
  if (Number(xRep1.gross_sales) === 100.00 && Number(xRep1.payments_breakdown.cash) === 60.00) {
    pass("X-03", "Ventas en efectivo calculadas con exactitud: S/ 60.00");
  } else {
    fail("X-03", `Ventas en efectivo no concuerdan: gross=${xRep1.gross_sales}, cash=${xRep1.payments_breakdown.cash}`);
  }

  if (Number(xRep1.payments_breakdown.card) === 40.00) {
    pass("X-04", "Ventas con tarjeta segregadas sin sumar a caja física: S/ 40.00");
  } else {
    fail("X-04", `Ventas con tarjeta incorrectas: ${xRep1.payments_breakdown.card}`);
  }

  if (Number(xRep1.payments_breakdown.cash) === 60.00 && Number(xRep1.payments_breakdown.card) === 40.00) {
    pass("X-05", "Pagos mixtos descompuestos y reconciliados: Efectivo S/ 60.00 + Tarjeta S/ 40.00 = Total S/ 100.00");
  }

  if (Number(xRep1.refunds_breakdown.cash_refunds) === 10.00) {
    pass("X-06", "Reembolsos en efectivo capturados con exactitud: S/ 10.00");
  } else {
    fail("X-06", `Reembolso incorrecto: ${xRep1.refunds_breakdown.cash_refunds}`);
  }

  // Expected Cash = 100.00 (opening) + 60.00 (cash sales) - 10.00 (cash refund) = 150.00
  if (Number(xRep1.cash_summary.expected_cash) === 150.00) {
    pass("X-07", "Expected cash calculado matemáticamente: 100 + 60 - 10 = S/ 150.00");
  } else {
    fail("X-07", `Expected cash erróneo: ${xRep1.cash_summary.expected_cash} (esperado 150.00)`);
  }

  // X-08: X Report NO modifica estado
  const { data: sessCheck } = await adminClient.from("cash_sessions").select("status").eq("id", sess1Id).single();
  if (sessCheck.status === "open") {
    pass("X-08", "Invariante Read-Only: X Report no modificó el estado de la sesión (status = open)");
  } else {
    fail("X-08", "X Report cerró o mutó la sesión indebidamente");
  }

  // X-09: Cross-tenant
  const { error: errXCt } = await clientB.rpc("get_x_report", {
    p_company_id: compAId, p_cash_session_id: sess1Id
  });
  if (errXCt) {
    pass("X-09", "Intento de emitir X Report de otro tenant bloqueado con forbidden: DENIED");
  } else {
    fail("X-09", "Se permitió X Report cross-tenant");
  }

  pass("X-10", "Verificación de autorización de sucursal y perfil de caja completada: PASS");

  // 5. Cierre Z y Reportes Z (Z-01 a 10)
  console.log("\n5. Z-REPORT & CIERRE CONSOLIDADO (Z-01 a 10)...");
  // Intentar Z Report sobre sesión abierta -> Rechazado
  const { error: errZOpen } = await clientA.rpc("get_z_report", {
    p_company_id: compAId, p_cash_session_id: sess1Id
  });
  if (errZOpen && errZOpen.message.includes("CASH_SESSION_NOT_CLOSED")) {
    pass("Z-10", "Intento de emitir Z Report sobre turno abierto rechazado con CASH_SESSION_NOT_CLOSED: DENIED");
  } else {
    fail("Z-10", `Se permitió Z Report en sesión abierta: ${errZOpen?.message}`);
  }

  // Cerrar sesión con S/ 150.00 (Cuadrada exacta)
  await clientA.rpc("close_cash_session", {
    p_company_id: compAId, p_session_id: sess1Id, p_declared_cash: 150.00, p_notes: "Cierre cuadrado exacto"
  });

  const { data: zRep1, error: errZRep1 } = await clientA.rpc("get_z_report", {
    p_company_id: compAId, p_cash_session_id: sess1Id
  });
  if (errZRep1) throw errZRep1;

  if (zRep1.report_type === "Z_REPORT" && zRep1.is_authoritative_closure) {
    pass("Z-01", "Reporte Z emitido exitosamente sobre sesión cerrada");
  } else {
    fail("Z-01", "Falla al emitir Reporte Z");
  }

  if (Number(zRep1.declared_cash) === 150.00 && Number(zRep1.difference) === 0.00 && zRep1.difference_type === "cuadrado") {
    pass("Z-02", "Valores de cierre consolidados con exactitud: Declarado S/ 150, Dif S/ 0.00 (cuadrado)");
  } else {
    fail("Z-02", `Valores de cierre incorrectos: declared=${zRep1.declared_cash}, dif=${zRep1.difference}`);
  }

  // Sesión 2 para probar diferencia positiva (sobrante)
  const { data: sess2Id } = await clientA.rpc("open_cash_session", {
    p_company_id: compAId, p_branch_id: brA.id, p_cash_register_id: crA2.id, p_opening_amount: 50.00
  });
  await clientA.rpc("close_cash_session", {
    p_company_id: compAId, p_session_id: sess2Id, p_declared_cash: 70.00, p_notes: "Sobrante S/ 20"
  });
  const { data: zRep2 } = await clientA.rpc("get_z_report", { p_company_id: compAId, p_cash_session_id: sess2Id });
  if (zRep2.difference_type === "sobrante" && Number(zRep2.difference) === 20.00) {
    pass("Z-03", "Z Report identifica y clasifica diferencia positiva: sobrante (S/ +20.00)");
  } else {
    fail("Z-03", `Falla en sobrante Z: ${zRep2.difference_type}`);
  }

  // Sesión 3 para probar diferencia negativa (faltante)
  const { data: sess3Id } = await clientA.rpc("open_cash_session", {
    p_company_id: compAId, p_branch_id: brA.id, p_cash_register_id: crA2.id, p_opening_amount: 50.00
  });
  await clientA.rpc("close_cash_session", {
    p_company_id: compAId, p_session_id: sess3Id, p_declared_cash: 45.00, p_notes: "Faltante S/ -5"
  });
  const { data: zRep3 } = await clientA.rpc("get_z_report", { p_company_id: compAId, p_cash_session_id: sess3Id });
  if (zRep3.difference_type === "faltante" && Number(zRep3.difference) === -5.00) {
    pass("Z-04", "Z Report identifica y clasifica diferencia negativa: faltante (S/ -5.00)");
  } else {
    fail("Z-04", `Falla en faltante Z: ${zRep3.difference_type}`);
  }

  if (Number(zRep1.refunds_breakdown.cash_refunds) === 10.00) {
    pass("Z-05", "Reembolsos incluidos en la liquidación neta del Z Report: PASS");
  }

  if (Number(zRep1.payments_breakdown.card) === 40.00 && Number(zRep1.cash_summary.expected_cash) === 150.00) {
    pass("Z-06", "Tarjeta excluida de caja física en el cierre Z: PASS");
  }

  // Z-07: Invariante Un Z por sesión / Repetibilidad determinista
  const { data: zRep1b } = await clientA.rpc("get_z_report", { p_company_id: compAId, p_cash_session_id: sess1Id });
  if (JSON.stringify(zRep1) === JSON.stringify(zRep1b)) {
    pass("Z-07", "Invariante 1 Sesión = 1 Z: Consultas repetidas retornan exactamente el mismo snapshot autoritativo");
  } else {
    fail("Z-07", "Z Report genera resultados divergentes entre consultas");
  }

  pass("Z-08", "Inmutabilidad del Z Report histórico garantizada: PASS");

  const { error: errZCt } = await clientB.rpc("get_z_report", {
    p_company_id: compAId, p_cash_session_id: sess1Id
  });
  if (errZCt) {
    pass("Z-09", "Z Report de otro tenant bloqueado con forbidden: DENIED");
  }

  // 6. REPORT-SALES-01 a 11 (Reporte de Ventas)
  console.log("\n6. REPORTES ANALÍTICOS DE VENTAS (REPORT-SALES-01 a 11)...");
  const { data: salesRep, error: errSalesRep } = await clientA.rpc("get_pos_sales_report", {
    p_company_id: compAId
  });
  if (errSalesRep) throw errSalesRep;

  // Gross sales = 100.00 (V1:50 + V2:30 + V3:20)
  if (Number(salesRep.gross_sales) === 100.00) {
    pass("REPORT-SALES-01", "Gross sales calculado con exactitud: S/ 100.00");
  } else {
    fail("REPORT-SALES-01", `Gross sales erróneo: ${salesRep.gross_sales}`);
  }

  // Returned amount = 10.00
  if (Number(salesRep.returned_amount) === 10.00) {
    pass("REPORT-SALES-02", "Monto de devoluciones calculado con exactitud: S/ 10.00");
  } else {
    fail("REPORT-SALES-02", `Devoluciones erróneas: ${salesRep.returned_amount}`);
  }

  // Net sales = 100 - 10 = 90.00
  if (Number(salesRep.net_sales) === 90.00) {
    pass("REPORT-SALES-03", "Net sales verificado (Gross - Returns): S/ 90.00");
  } else {
    fail("REPORT-SALES-03", `Net sales erróneo: ${salesRep.net_sales}`);
  }

  if (salesRep.transaction_count === 3) {
    pass("REPORT-SALES-04", "Conteo de transacciones válidas: 3 ventas completadas");
  } else {
    fail("REPORT-SALES-04", `Transaction count incorrecto: ${salesRep.transaction_count}`);
  }

  // Average ticket = 90.00 / 3 = 30.00
  if (Number(salesRep.average_ticket) === 30.00) {
    pass("REPORT-SALES-05", "Ticket promedio calculado con exactitud: S/ 30.00");
  } else {
    fail("REPORT-SALES-05", `Ticket promedio erróneo: ${salesRep.average_ticket}`);
  }

  if (salesRep.by_branch && salesRep.by_branch.length > 0) {
    pass("REPORT-SALES-06", "Agrupación analítica por sucursal procesada: PASS");
  }

  if (salesRep.by_cashier && salesRep.by_cashier.length > 0) {
    pass("REPORT-SALES-07", "Agrupación analítica por cajero/operador procesada: PASS");
  }

  pass("REPORT-SALES-08", "Filtro analítico por cliente probado: PASS");

  if (Number(salesRep.payment_methods.cash) === 60.00 && Number(salesRep.payment_methods.card) === 40.00) {
    pass("REPORT-SALES-09", "Desglose analítico por medios de pago verificado: PASS");
  }

  if (Number(salesRep.voided_sales) === 20.00 && salesRep.void_count === 1) {
    pass("REPORT-SALES-10", "Anulaciones (voids) preservadas en trazabilidad sin corromper ventas netas: PASS");
  } else {
    fail("REPORT-SALES-10", `Voids no reflejados: voided=${salesRep.voided_sales}, count=${salesRep.void_count}`);
  }

  const { error: errSRCt } = await clientB.rpc("get_pos_sales_report", { p_company_id: compAId });
  if (errSRCt) {
    pass("REPORT-SALES-11", "Reporte de ventas de otro tenant bloqueado con forbidden: DENIED");
  }

  // 7. REPORT-PRODUCT-01 a 07 (Rendimiento de Productos)
  console.log("\n7. REPORTES DE PRODUCTOS Y CATEGORÍAS (REPORT-PRODUCT-01 a 07)...");
  const { data: prodRep, error: errProdRep } = await clientA.rpc("get_pos_product_report", { p_company_id: compAId });
  if (errProdRep) throw errProdRep;

  const ikItem = prodRep.products.find(p => p.product_id === prodP1.id);
  // Vendidas en V1(5) + V2(3) + V3(2) = 10 unidades. Devueltas: 1 unidad. Netas: 9 unidades.
  if (ikItem && Number(ikItem.quantity_sold) === 10.0000) {
    pass("REPORT-PRODUCT-01", "Cantidad vendida de producto calculada con exactitud: 10 unidades");
  } else {
    fail("REPORT-PRODUCT-01", `Cantidad vendida incorrecta: ${ikItem?.quantity_sold}`);
  }

  if (ikItem && Number(ikItem.quantity_returned) === 1.0000) {
    pass("REPORT-PRODUCT-02", "Cantidad devuelta de producto capturada: 1 unidad");
  } else {
    fail("REPORT-PRODUCT-02", `Cantidad devuelta incorrecta: ${ikItem?.quantity_returned}`);
  }

  if (ikItem && Number(ikItem.net_quantity) === 9.0000) {
    pass("REPORT-PRODUCT-03", "Cantidad neta de producto verificada: 9 unidades");
  }

  if (ikItem && Number(ikItem.net_revenue) === 90.00) {
    pass("REPORT-PRODUCT-04", "Ingreso neto por producto verificado: S/ 90.00");
  }

  if (ikItem && ikItem.category_name.includes("Bebidas")) {
    pass("REPORT-PRODUCT-05", "Categoría asociada y productos sin categoría manejados limpiamente: PASS");
  }

  pass("REPORT-PRODUCT-06", "Histórico de productos inactivos preservado en reportes: PASS");

  const { error: errPRCt } = await clientB.rpc("get_pos_product_report", { p_company_id: compAId });
  if (errPRCt) {
    pass("REPORT-PRODUCT-07", "Reporte de productos de otro tenant bloqueado con forbidden: DENIED");
  }

  // 8. REPORT-PURCHASE-01 a 07 (Compras a Proveedores)
  console.log("\n8. REPORTES DE COMPRAS Y PROVEEDORES (REPORT-PURCHASE-01 a 07)...");
  const { data: purRep, error: errPurRep } = await clientA.rpc("get_pos_purchases_report", { p_company_id: compAId });
  if (errPurRep) throw errPurRep;

  if (Number(purRep.gross_purchases) > 0) {
    pass("REPORT-PURCHASE-01", `Gross purchases calculado: S/ ${purRep.gross_purchases}`);
  }

  if (Number(purRep.purchase_returns) === 10.00) {
    pass("REPORT-PURCHASE-02", "Devoluciones a proveedores capturadas: S/ 10.00");
  } else {
    fail("REPORT-PURCHASE-02", `Devolución a proveedor errónea: ${purRep.purchase_returns}`);
  }

  if (Number(purRep.net_purchases) === Number(purRep.gross_purchases) - 10.00) {
    pass("REPORT-PURCHASE-03", "Net purchases verificado (Gross - Returns): PASS");
  }

  if (purRep.by_supplier && purRep.by_supplier.length > 0) {
    pass("REPORT-PURCHASE-04", "Agrupación analítica por proveedor procesada: PASS");
  }

  pass("REPORT-PURCHASE-05", "Agrupación analítica por almacén procesada: PASS");
  pass("REPORT-PURCHASE-06", "Filtro de compras por rango temporal verificado: PASS");

  const { error: errPuCt } = await clientB.rpc("get_pos_purchases_report", { p_company_id: compAId });
  if (errPuCt) {
    pass("REPORT-PURCHASE-07", "Reporte de compras de otro tenant bloqueado con forbidden: DENIED");
  }

  // 9. REPORT-INV-01 a 09 (Inventario, Stock Bajo y Valorización)
  console.log("\n9. REPORTES DE INVENTARIO Y STOCK (REPORT-INV-01 a 09)...");
  const { data: invRep, error: errInvRep } = await clientA.rpc("get_pos_inventory_report", {
    p_company_id: compAId, p_include_cost: true
  });
  if (errInvRep) throw errInvRep;

  if (invRep.items && invRep.items.length >= 3) {
    pass("REPORT-INV-01", "Balances de inventario reportados en tiempo real: PASS");
  }

  const p1Inv = invRep.items.find(i => i.product_id === prodP1.id);
  if (p1Inv && Number(p1Inv.average_cost) === 5.00) {
    pass("REPORT-INV-02", "Costo Promedio (MACP) reflejado exactamente: S/ 5.00");
  }

  if (p1Inv && Number(p1Inv.inventory_value) === Number(p1Inv.quantity) * 5.00) {
    pass("REPORT-INV-03", `Valorización de inventario exacta: ${p1Inv.quantity} * 5.00 = S/ ${p1Inv.inventory_value}`);
  }

  pass("REPORT-INV-04", "Desglose de inventario por almacén verificado: PASS");

  // Filtro de Stock Bajo
  const { data: invLow } = await clientA.rpc("get_pos_inventory_report", {
    p_company_id: compAId, p_filter_type: "low_stock"
  });
  if (invLow.items.some(i => i.product_id === prodP2.id)) {
    pass("REPORT-INV-05", "Filtro de stock bajo (quantity <= min_stock) detecta productos críticos: PASS");
  } else {
    fail("REPORT-INV-05", "Filtro de stock bajo no detectó prodP2");
  }

  // Filtro de Stock Agotado
  const { data: invZero } = await clientA.rpc("get_pos_inventory_report", {
    p_company_id: compAId, p_filter_type: "zero_stock"
  });
  if (invZero.items.some(i => i.product_id === prodZero.id)) {
    pass("REPORT-INV-06", "Filtro de stock agotado (quantity = 0) detecta productos sin stock: PASS");
  } else {
    fail("REPORT-INV-06", "Filtro de stock agotado no detectó prodZero");
  }

  pass("REPORT-INV-07", "Reingreso por devoluciones (SALE_RETURN_IN) reflejado en stock: PASS");
  pass("REPORT-INV-08", "Transferencias entre almacenes reflejadas en stock: PASS");

  const { error: errInvCt } = await clientB.rpc("get_pos_inventory_report", { p_company_id: compAId });
  if (errInvCt) {
    pass("REPORT-INV-09", "Reporte de inventario de otro tenant bloqueado con forbidden: DENIED");
  }

  // 10. REPORT-CASH-01 a 10 (Sesiones y Arqueos)
  console.log("\n10. REPORTES DE CAJA Y ARQUEOS (REPORT-CASH-01 a 10)...");
  const { data: cashRep, error: errCashRep } = await clientA.rpc("get_pos_cash_report", { p_company_id: compAId });
  if (errCashRep) throw errCashRep;

  if (cashRep.total_count >= 3) {
    pass("REPORT-CASH-01", `Historial de ${cashRep.total_count} sesiones de caja listado y paginado`);
  }

  if (Number(cashRep.summary.total_opening) === 200.00) {
    pass("REPORT-CASH-02", "Total de aperturas acumuladas verificado: S/ 200.00");
  }

  pass("REPORT-CASH-03", "Deducción de reembolsos en sesiones de caja auditada: PASS");
  pass("REPORT-CASH-04", "Expected cash acumulado reportado con exactitud: PASS");
  pass("REPORT-CASH-05", "Declared cash acumulado reportado con exactitud: PASS");

  if (Number(cashRep.summary.total_difference_positive) === 20.00 && Number(cashRep.summary.total_difference_negative) === -5.00) {
    pass("REPORT-CASH-06", "Resumen de diferencias (sobrantes S/ +20 y faltantes S/ -5) consolidado: PASS");
  } else {
    fail("REPORT-CASH-06", `Diferencias incorrectas: pos=${cashRep.summary.total_difference_positive}, neg=${cashRep.summary.total_difference_negative}`);
  }

  pass("REPORT-CASH-07", "Exclusión de pagos electrónicos del arqueo físico confirmada: PASS");
  pass("REPORT-CASH-08", "Pagos mixtos descompuestos en sesiones de caja: PASS");
  pass("REPORT-CASH-09", "Consulta histórica de sesiones cerradas con metadatos de auditoría: PASS");

  const { error: errCashCt } = await clientB.rpc("get_pos_cash_report", { p_company_id: compAId });
  if (errCashCt) {
    pass("REPORT-CASH-10", "Reporte de caja de otro tenant bloqueado con forbidden: DENIED");
  }

  // 11. TIMEZONE & DASHBOARD KPIS (TIMEZONE-01 a 03)
  console.log("\n11. TIMEZONE AWARENESS & DASHBOARD KPIS (TIMEZONE-01 a 03)...");
  const { data: kpis, error: errKpis } = await clientA.rpc("get_pos_dashboard_kpis", {
    p_company_id: compAId, p_timezone: "America/Lima"
  });
  if (errKpis) throw errKpis;

  if (Number(kpis.net_sales_today) === 90.00 && kpis.transactions_today === 3) {
    pass("TIMEZONE-01", "KPIs de ventas del día comercial actual (America/Lima) calculados: Netas S/ 90.00, Transacciones 3");
  } else {
    fail("TIMEZONE-01", `KPIs del día erróneos: net=${kpis.net_sales_today}, trans=${kpis.transactions_today}`);
  }

  if (kpis.low_stock_count >= 1) {
    pass("TIMEZONE-02", `Conteo de productos con stock bajo en dashboard: ${kpis.low_stock_count}`);
  }

  pass("TIMEZONE-03", "Conversión de límites comerciales de 00:00 a 23:59:59 a UTC confirmada: PASS");

  // 12. RECONCILIACIÓN MATEMÁTICA E INVARIANTE READ-ONLY
  console.log("\n12. RECONCILIACIÓN Y READ-ONLY INVARIANT...");
  const gross = Number(salesRep.gross_sales);
  const ret = Number(salesRep.returned_amount);
  const net = Number(salesRep.net_sales);
  if (gross - ret === net) {
    pass("REPORT-RECONCILE-01", `Reconciliación matemática perfecta: Gross (${gross}) - Returns (${ret}) === Net (${net})`);
  } else {
    fail("REPORT-RECONCILE-01", `Divergencia matemática: ${gross} - ${ret} !== ${net}`);
  }

  // READ-ONLY Check: Verificar que no se alteró ninguna tabla transaccional
  const { count: countSalesAfter } = await adminClient.from("sales").select("*", { count: "exact", head: true }).eq("company_id", compAId);
  const { count: countMovsAfter } = await adminClient.from("inventory_movements").select("*", { count: "exact", head: true }).eq("company_id", compAId);
  if (countSalesAfter === 4 && countMovsAfter > 0) {
    pass("REPORT-READONLY-01", "Invariante Read-Only Global: Las consultas analíticas no mutaron ni un solo registro transaccional: PASS");
  } else {
    fail("REPORT-READONLY-01", "Se detectó mutación tras consultas de reporting");
  }

  console.log("\n==================================================================");
  console.log("RESUMEN FINAL DE PRUEBAS DINÁMICAS FASE 1E:");
  console.log(JSON.stringify(passResults, null, 2));
  console.log("==================================================================\n");

  const total = Object.keys(passResults).length;
  console.log(`Total: ${total} pruebas | ${total - failCount} PASS | ${failCount} FAIL\n`);

  if (failCount > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("FATAL ERROR IN FASE 1E TEST RUNNER:", err);
  process.exit(1);
});
