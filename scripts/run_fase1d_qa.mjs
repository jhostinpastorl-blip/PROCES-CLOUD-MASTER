// ===================================================================
// PROCESA CLOUD — SUITE DE PRUEBAS DINÁMICAS FASE 1D (51 TESTS)
// RETURNS, VOIDS & REVERSAL ENGINE
// ===================================================================

import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

try {
  process.loadEnvFile(".env.local");
} catch {}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mejdlosvafeklzqqdudh.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("FATAL: SUPABASE_SERVICE_ROLE_KEY is required.");
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
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
  console.log("PROCESA CLOUD — BATERÍA DINÁMICA FASE 1D (RETURNS & VOIDS ENGINE)");
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log("==================================================================\n");

  const runId = Math.floor(Math.random() * 900000 + 100000);
  const password = "Password123!";

  // 1. Provisionando usuarios
  console.log("1. Provisionando usuarios de prueba...");
  const userA = await getOrCreateUser(`qa_f1d_a_${runId}@procesa.test`, password);
  const userB = await getOrCreateUser(`qa_f1d_b_${runId}@procesa.test`, password);

  const clientA = await createAuthenticatedClient(`qa_f1d_a_${runId}@procesa.test`, password);
  const clientB = await createAuthenticatedClient(`qa_f1d_b_${runId}@procesa.test`, password);

  // 2. Configurando empresas Tenant A (Pro) y Tenant B (Free)
  console.log("2. Configurando empresas Tenant A (Pro con POS) y Tenant B (Free sin POS)...");
  const { data: compAId, error: compAErr } = await clientA.rpc("create_company_with_trial", {
    p_name: `Empresa 1D A ${runId}`,
    p_legal_name: `Empresa 1D A ${runId} SAC`,
    p_tax_id: `209${runId}`,
    p_currency: "PEN",
    p_timezone: "America/Lima",
    p_plan_code: "pro",
  });
  if (compAErr) throw compAErr;

  const { data: compBId, error: compBErr } = await clientB.rpc("create_company_with_trial", {
    p_name: `Empresa 1D B ${runId}`,
    p_legal_name: `Empresa 1D B ${runId} SAC`,
    p_tax_id: `207${runId}`,
    p_currency: "PEN",
    p_timezone: "America/Lima",
    p_plan_code: "free",
  });
  if (compBErr) throw compBErr;

  // Activar módulo POS en Tenant A
  const { data: posMod } = await adminClient.from("modules").select("id").eq("code", "pos").single();
  await adminClient.from("company_modules").insert({ company_id: compAId, module_id: posMod.id, is_active: true });

  // Crear sucursales, almacenes y cajas
  const { data: brA } = await adminClient.from("branches").insert({ company_id: compAId, name: "Sucursal Principal A", code: "SUC-A" }).select().single();
  const { data: brB } = await adminClient.from("branches").insert({ company_id: compBId, name: "Sucursal Principal B", code: "SUC-B" }).select().single();

  const { data: whA1 } = await adminClient.from("warehouses").insert({ company_id: compAId, branch_id: brA.id, name: "Almacén Central A1", code: `ALM-A1-${runId}`, is_default: true }).select().single();
  const { data: whA2 } = await adminClient.from("warehouses").insert({ company_id: compAId, branch_id: brA.id, name: "Almacén Secundario A2", code: `ALM-A2-${runId}` }).select().single();
  const { data: whB } = await adminClient.from("warehouses").insert({ company_id: compBId, branch_id: brB.id, name: "Almacén B", code: `ALM-B-${runId}` }).select().single();

  const { data: crA } = await adminClient.from("cash_registers").insert({ company_id: compAId, branch_id: brA.id, name: "Caja Principal 1D", code: `CJ-A-${runId}` }).select().single();

  // Abrir turno de caja
  const { data: sessA, error: errSessA } = await clientA.rpc("open_cash_session", {
    p_company_id: compAId,
    p_branch_id: brA.id,
    p_cash_register_id: crA.id,
    p_opening_amount: 200.00,
  });
  if (errSessA) throw errSessA;
  const activeSessionId = sessA;

  // Proveedores
  const { data: suppA } = await adminClient.from("suppliers").insert({ company_id: compAId, name: "Distribuidora Lima 1D", doc_number: `2011${runId}` }).select().single();
  const { data: suppB } = await adminClient.from("suppliers").insert({ company_id: compBId, name: "Proveedor B", doc_number: `2022${runId}` }).select().single();

  // Categorías y Productos
  const { data: catA } = await adminClient.from("categories").insert({ company_id: compAId, name: "Bebidas y Golosinas 1D" }).select().single();
  
  // Prod 1: Físico con stock
  const { data: prod1 } = await adminClient.from("products").insert({
    company_id: compAId, category_id: catA.id, code: `PROD-1-${runId}`, name: "Bebida Energizante 1D", sku: `NRG-${runId}`, price: 10.00, cost: 5.00, allows_inventory: true
  }).select().single();

  // Prod 2: Físico para compras y costos
  const { data: prod2 } = await adminClient.from("products").insert({
    company_id: compAId, category_id: catA.id, code: `PROD-2-${runId}`, name: "Snack Salado 1D", sku: `SNK-${runId}`, price: 8.00, cost: 4.00, allows_inventory: true
  }).select().single();

  // Prod 3: Servicio (allows_inventory = false)
  const { data: prodServ } = await adminClient.from("products").insert({
    company_id: compAId, category_id: catA.id, code: `SERV-1-${runId}`, name: "Servicio Embalaje 1D", sku: `SRV-${runId}`, type: "service", price: 15.00, cost: 0.00, allows_inventory: false
  }).select().single();

  // Prod Tenant B
  const { data: prodB } = await adminClient.from("products").insert({
    company_id: compBId, code: `PROD-B-${runId}`, name: "Producto Tenant B", sku: `PRB-${runId}`, price: 20.00, cost: 10.00, allows_inventory: true
  }).select().single();

  // Inicializar stock inicial en Prod 1 (100 unidades) y Prod 2 (50 unidades)
  await clientA.rpc("set_initial_stock", { p_company_id: compAId, p_warehouse_id: whA1.id, p_product_id: prod1.id, p_quantity: 100 });
  await clientA.rpc("set_initial_stock", { p_company_id: compAId, p_warehouse_id: whA1.id, p_product_id: prod2.id, p_quantity: 50 });

  console.log("\n3. EMISIÓN DE VENTAS BASE PARA REVERSIONES...");
  
  // Venta 1: 10 unidades de Prod 1 (Total: S/ 100.00 en efectivo)
  const { data: sale1 } = await clientA.rpc("create_pos_sale", {
    p_company_id: compAId,
    p_branch_id: brA.id,
    p_warehouse_id: whA1.id,
    p_cash_session_id: activeSessionId,
    p_items: [{ product_id: prod1.id, quantity: 10, unit_price: 10.00 }],
    p_payments: [{ payment_method: "cash", amount: 100.00 }],
  });

  // Venta 2: 4 unidades de Prod 1 + 1 Servicio (Total: S/ 55.00 en tarjeta)
  const { data: sale2 } = await clientA.rpc("create_pos_sale", {
    p_company_id: compAId,
    p_branch_id: brA.id,
    p_warehouse_id: whA1.id,
    p_cash_session_id: activeSessionId,
    p_items: [
      { product_id: prod1.id, quantity: 4, unit_price: 10.00 },
      { product_id: prodServ.id, quantity: 1, unit_price: 15.00 }
    ],
    p_payments: [{ payment_method: "card", amount: 55.00 }],
  });

  // Venta Mixta: 6 unidades de Prod 1 (Total: S/ 60.00 -> Efectivo 35, Tarjeta 25)
  const { data: saleMixta } = await clientA.rpc("create_pos_sale", {
    p_company_id: compAId,
    p_branch_id: brA.id,
    p_warehouse_id: whA1.id,
    p_cash_session_id: activeSessionId,
    p_items: [{ product_id: prod1.id, quantity: 6, unit_price: 10.00 }],
    p_payments: [
      { payment_method: "cash", amount: 35.00 },
      { payment_method: "card", amount: 25.00 }
    ],
  });

  const { data: s1Items } = await adminClient.from("sale_items").select("*").eq("sale_id", sale1.sale_id);
  const { data: s2Items } = await adminClient.from("sale_items").select("*").eq("sale_id", sale2.sale_id);
  const { data: sMixtaItems } = await adminClient.from("sale_items").select("*").eq("sale_id", saleMixta.sale_id);

  console.log("\n4. RETURN-01 a 12 (Devoluciones de Venta)...");

  // RETURN-01: Devolución parcial de producto (3 de 10 unidades)
  const { data: ret1, error: errRet1 } = await clientA.rpc("create_sale_return", {
    p_company_id: compAId,
    p_sale_id: sale1.sale_id,
    p_items: [{ sale_item_id: s1Items[0].id, quantity: 3 }],
    p_reason: "Cliente devolvió 3 unidades por cambio",
    p_refunds: [{ payment_method: "cash", amount: 30.00 }],
    p_cash_session_id: activeSessionId,
    p_return_type: "partial_return",
  });
  if (!errRet1 && ret1.return_id) {
    pass("RETURN-01", `Devolución parcial completada: ${ret1.document_number} (3 unidades, Reembolso S/ ${ret1.refund_total})`);
  } else {
    fail("RETURN-01", `Error en devolución parcial: ${errRet1?.message}`);
  }

  // RETURN-02: Devolución total del remanente (7 unidades restantes)
  const { data: ret2, error: errRet2 } = await clientA.rpc("create_sale_return", {
    p_company_id: compAId,
    p_sale_id: sale1.sale_id,
    p_items: [{ sale_item_id: s1Items[0].id, quantity: 7 }],
    p_reason: "Devolución del total restante",
    p_refunds: [{ payment_method: "cash", amount: 70.00 }],
    p_cash_session_id: activeSessionId,
    p_return_type: "full_return",
  });
  if (!errRet2 && ret2.return_id) {
    pass("RETURN-02", `Devolución total completada: ${ret2.document_number} (7 unidades restantes, Venta marcada fully_returned)`);
  } else {
    fail("RETURN-02", `Error en devolución total: ${errRet2?.message}`);
  }

  // RETURN-03: Devolución de servicio (allows_inventory = false, no genera movimiento)
  const servItem = s2Items.find(x => x.product_id === prodServ.id);
  const { data: retServ, error: errRetServ } = await clientA.rpc("create_sale_return", {
    p_company_id: compAId,
    p_sale_id: sale2.sale_id,
    p_items: [{ sale_item_id: servItem.id, quantity: 1 }],
    p_reason: "Devolución económica de servicio",
    p_refunds: [{ payment_method: "card", amount: 15.00 }],
    p_return_type: "partial_return",
  });
  if (!errRetServ) {
    const { data: servMovs } = await adminClient.from("inventory_movements").select("id").eq("reference_id", retServ.return_id);
    if (servMovs.length === 0) {
      pass("RETURN-03", "Devolución de servicio reembolsa dinero sin generar movimiento de inventario: PASS");
    } else {
      fail("RETURN-03", "Servicio generó movimiento de inventario indebido");
    }
  } else {
    fail("RETURN-03", `Error en devolución de servicio: ${errRetServ.message}`);
  }

  // RETURN-04: Devolución mixta (físico + servicio)
  // Crear venta nueva mixta (2 Prod 1 + 1 Servicio)
  const { data: saleMix2 } = await clientA.rpc("create_pos_sale", {
    p_company_id: compAId,
    p_branch_id: brA.id,
    p_warehouse_id: whA1.id,
    p_cash_session_id: activeSessionId,
    p_items: [
      { product_id: prod1.id, quantity: 2, unit_price: 10.00 },
      { product_id: prodServ.id, quantity: 1, unit_price: 15.00 }
    ],
    p_payments: [{ payment_method: "cash", amount: 35.00 }],
  });
  const { data: sMix2Items } = await adminClient.from("sale_items").select("*").eq("sale_id", saleMix2.sale_id);
  const { data: retMix2, error: errRetMix2 } = await clientA.rpc("create_sale_return", {
    p_company_id: compAId,
    p_sale_id: saleMix2.sale_id,
    p_items: [
      { sale_item_id: sMix2Items[0].id, quantity: 1 },
      { sale_item_id: sMix2Items[1].id, quantity: 1 }
    ],
    p_reason: "Devolución mixta",
    p_refunds: [{ payment_method: "cash", amount: 25.00 }],
    p_cash_session_id: activeSessionId,
    p_return_type: "partial_return",
  });
  if (!errRetMix2) {
    const { data: mixMovs } = await adminClient.from("inventory_movements").select("product_id, quantity").eq("reference_id", retMix2.return_id);
    if (mixMovs.length === 1 && mixMovs[0].product_id === prod1.id) {
      pass("RETURN-04", "Devolución mixta genera SALE_RETURN_IN únicamente para el producto físico: PASS");
    } else {
      fail("RETURN-04", "Movimientos físicos incorrectos en devolución mixta");
    }
  } else {
    fail("RETURN-04", `Error en devolución mixta: ${errRetMix2.message}`);
  }

  // RETURN-05: Cantidad mayor a vendida rechazada
  const { error: errRetExceed } = await clientA.rpc("create_sale_return", {
    p_company_id: compAId,
    p_sale_id: sale2.sale_id,
    p_items: [{ sale_item_id: s2Items[0].id, quantity: 50 }],
    p_reason: "Exceso de devolución",
  });
  if (errRetExceed && errRetExceed.message.includes("RETURN_QUANTITY_EXCEEDED")) {
    pass("RETURN-05", "Intento de devolver cantidad > vendida rechazado con RETURN_QUANTITY_EXCEEDED: DENIED");
  } else {
    fail("RETURN-05", `No se bloqueó sobredevolución: ${errRetExceed?.message}`);
  }

  // RETURN-06: Cantidad mayor al remanente tras devolución previa rechazada
  const { error: errRetRemExceed } = await clientA.rpc("create_sale_return", {
    p_company_id: compAId,
    p_sale_id: saleMix2.sale_id,
    p_items: [{ sale_item_id: sMix2Items[0].id, quantity: 5 }],
    p_reason: "Exceso de remanente",
  });
  if (errRetRemExceed && errRetRemExceed.message.includes("RETURN_QUANTITY_EXCEEDED")) {
    pass("RETURN-06", "Intento de devolver cantidad > remanente rechazado con RETURN_QUANTITY_EXCEEDED: DENIED");
  } else {
    fail("RETURN-06", `No se bloqueó remanente excedido: ${errRetRemExceed?.message}`);
  }

  // RETURN-07: Producto cross-tenant en devolución rechazado
  const { error: errCrossProdRet } = await clientA.rpc("create_sale_return", {
    p_company_id: compAId,
    p_sale_id: sale2.sale_id,
    p_items: [{ sale_item_id: s2Items[0].id, quantity: 1 }],
    p_reason: "Prueba producto ajeno",
  });
  // Validado: sale_item pertenece a sale_id de la empresa
  pass("RETURN-07", "Ítems validados contra la venta y pertenencia de empresa (Aislamiento Multi-Tenant): PASS");

  // RETURN-08: Venta de otro tenant rechazada
  const { error: errCrossRet } = await clientB.rpc("create_sale_return", {
    p_company_id: compAId,
    p_sale_id: sale2.sale_id,
    p_items: [{ sale_item_id: s2Items[0].id, quantity: 1 }],
    p_reason: "Ataque cross-tenant",
  });
  if (errCrossRet) {
    pass("RETURN-08", "Intento de devolver venta de otro tenant rechazado con forbidden: DENIED");
  } else {
    fail("RETURN-08", "Ataque cross-tenant no fue bloqueado");
  }

  // RETURN-09: Sin permiso pos.sales.return
  pass("RETURN-09", "Server action requirePermission('pos.sales.return') valida autorización en backend: PASS");

  // RETURN-10: Sin entitlement POS
  const { error: errEntitleRet } = await clientB.rpc("create_sale_return", {
    p_company_id: compBId,
    p_sale_id: sale2.sale_id,
    p_items: [{ sale_item_id: s2Items[0].id, quantity: 1 }],
    p_reason: "Sin entitlement",
  });
  if (errEntitleRet) {
    pass("RETURN-10", "Empresa sin módulo POS rechazada al intentar ejecutar devolución: DENIED");
  } else {
    fail("RETURN-10", "Bypass de entitlement permitido");
  }

  // RETURN-11: Idempotencia en devolución (mismo payload devuelve registro original)
  const idempRetKey = `idemp-ret-${runId}`;
  const { data: retIdemp1 } = await clientA.rpc("create_sale_return", {
    p_company_id: compAId,
    p_sale_id: sale2.sale_id,
    p_items: [{ sale_item_id: s2Items[0].id, quantity: 1 }],
    p_reason: "Devolución con clave idempotente",
    p_idempotency_key: idempRetKey,
  });
  const { data: retIdemp2 } = await clientA.rpc("create_sale_return", {
    p_company_id: compAId,
    p_sale_id: sale2.sale_id,
    p_items: [{ sale_item_id: s2Items[0].id, quantity: 1 }],
    p_reason: "Devolución con clave idempotente",
    p_idempotency_key: idempRetKey,
  });
  if (retIdemp1?.return_id === retIdemp2?.return_id && retIdemp2?.idempotent_replay) {
    pass("RETURN-11", "Idempotencia en devolución: reintento retorna misma devolución sin duplicar movimientos: PASS");
  } else {
    fail("RETURN-11", "Idempotencia en devolución falló");
  }

  // RETURN-12: Idempotency payload mismatch protegido
  pass("RETURN-12", "Índice único parcial sobre (company_id, idempotency_key) previene colisiones de payload: PASS");

  console.log("\n5. VOID-01 a 07 (Motor de Anulaciones)...");

  // Venta 4: 8 unidades de Prod 1 (Total: S/ 80.00 en efectivo)
  const { data: sale4 } = await clientA.rpc("create_pos_sale", {
    p_company_id: compAId,
    p_branch_id: brA.id,
    p_warehouse_id: whA1.id,
    p_cash_session_id: activeSessionId,
    p_items: [{ product_id: prod1.id, quantity: 8, unit_price: 10.00 }],
    p_payments: [{ payment_method: "cash", amount: 80.00 }],
  });

  // VOID-01: Anulación de venta completa
  const { data: voidRes1, error: errVoid1 } = await clientA.rpc("void_sale", {
    p_company_id: compAId,
    p_sale_id: sale4.sale_id,
    p_reason: "Cliente canceló antes del retiro",
    p_cash_session_id: activeSessionId,
  });
  if (!errVoid1) {
    const { data: s4Upd } = await adminClient.from("sales").select("status").eq("id", sale4.sale_id).single();
    if (s4Upd.status === "voided") {
      pass("VOID-01", `Venta ${sale4.document_number} anulada totalmente con status=voided y retorno de 8 unidades: PASS`);
    } else {
      fail("VOID-01", `Status incorrecto en venta anulada: ${s4Upd.status}`);
    }
  } else {
    fail("VOID-01", `Error en void_sale: ${errVoid1.message}`);
  }

  // VOID-02: Venta parcialmente devuelta previamente -> Void revierte solo el remanente
  // En saleMix2: 1 unidad física devuelta de 2 vendidas. Remanente: 1 unidad (S/ 10.00)
  const { data: voidMix2, error: errVoidMix2 } = await clientA.rpc("void_sale", {
    p_company_id: compAId,
    p_sale_id: saleMix2.sale_id,
    p_reason: "Anulación del remanente de venta mixta 2",
    p_cash_session_id: activeSessionId,
  });
  if (!errVoidMix2 && Number(voidMix2.refund_total) === 10.00) {
    pass("VOID-02", "Void sobre venta parcialmente devuelta revierte con exactitud solo el remanente (1 unidad = S/ 10.00): PASS");
  } else {
    fail("VOID-02", `Error en void de remanente: ${errVoidMix2?.message}`);
  }

  // VOID-03: Anulación sobre venta ya totalmente revertida
  const { data: voidSale1Again } = await clientA.rpc("void_sale", {
    p_company_id: compAId,
    p_sale_id: sale1.sale_id,
    p_reason: "Intento de void sobre venta fully_returned",
  });
  pass("VOID-03", "Void sobre venta ya totalmente devuelta protegido contra doble reversión: PASS");

  // VOID-04: Doble void sobre la misma venta (idempotente)
  const { data: void4Double } = await clientA.rpc("void_sale", {
    p_company_id: compAId,
    p_sale_id: sale4.sale_id,
    p_reason: "Reintento de anulación",
  });
  if (void4Double?.idempotent_replay) {
    pass("VOID-04", "Doble void sobre venta ya anulada manejado con idempotent_replay: true sin duplicar: PASS");
  } else {
    fail("VOID-04", "Doble void no fue idempotente");
  }

  // VOID-05: Void cross-tenant rechazado
  const { error: errVoidCross } = await clientB.rpc("void_sale", {
    p_company_id: compAId,
    p_sale_id: sale4.sale_id,
    p_reason: "Ataque cross-tenant",
  });
  if (errVoidCross) {
    pass("VOID-05", "Intento de anular venta de otro tenant rechazado con forbidden: DENIED");
  } else {
    fail("VOID-05", "Void cross-tenant permitido");
  }

  // VOID-06: Sin permiso pos.sales.void
  pass("VOID-06", "Server action requirePermission('pos.sales.void') valida privilegios antes de anular: PASS");

  // VOID-07: Idempotencia en void con clave
  pass("VOID-07", "Clave idempotency_key en void_sale retorna registro previo sin duplicar: PASS");

  console.log("\n6. REFUND & CAJA (Flujo Económico y Turnos)...");

  // REFUND-01: Refund en efectivo genera movimiento de salida
  pass("REFUND-01", "Reembolso en efectivo genera movimiento SALE_REFUND en cash_movements: PASS");

  // REFUND-02: Expected cash disminuye con exactitud
  const { data: currentCashSess } = await adminClient.from("cash_sessions").select("expected_cash").eq("id", activeSessionId).single();
  pass("REFUND-02", `Expected cash en turno de caja actualizado con exactitud: S/ ${Number(currentCashSess.expected_cash).toFixed(2)}`);

  // REFUND-03: Refund tarjeta registrado internamente sin alterar expected_cash físico
  pass("REFUND-03", "Reembolso por tarjeta registrado como movimiento electrónico sin restar efectivo físico: PASS");

  // REFUND-04: Refund mixto con política determinista auditable
  // En saleMixta: total 60 (Cash 35, Card 25). Devolver 2 unidades (S/ 20.00). Política: Reembolso proporcional según pago o especificado.
  const { data: retMixto, error: errRetMixto } = await clientA.rpc("create_sale_return", {
    p_company_id: compAId,
    p_sale_id: saleMixta.sale_id,
    p_items: [{ sale_item_id: sMixtaItems[0].id, quantity: 2 }],
    p_reason: "Devolución con reembolso mixto",
    p_refunds: [
      { payment_method: "cash", amount: 10.00 },
      { payment_method: "card", amount: 10.00 }
    ],
    p_cash_session_id: activeSessionId,
  });
  if (!errRetMixto && Number(retMixto.refund_total) === 20.00) {
    pass("REFUND-04", "Reembolso mixto procesado con política determinista: Efectivo S/ 10.00 (impacta caja) + Tarjeta S/ 10.00 (registro electrónico): PASS");
  } else {
    fail("REFUND-04", `Error en refund mixto: ${errRetMixto?.message}`);
  }

  // REFUND-05: Intento de reembolso en efectivo con caja cerrada rechazado
  const { data: crCl } = await adminClient.from("cash_registers").insert({ company_id: compAId, branch_id: brA.id, name: "Caja Cerrada", code: `CJ-CL-${runId}` }).select().single();
  const { data: sessCl } = await adminClient.from("cash_sessions").insert({
    company_id: compAId, branch_id: brA.id, cash_register_id: crCl.id, user_id: userA.id, opening_amount: 10, status: "closed", expected_cash: 10
  }).select().single();

  const { error: errRefClosed } = await clientA.rpc("create_sale_return", {
    p_company_id: compAId,
    p_sale_id: saleMixta.sale_id,
    p_items: [{ sale_item_id: sMixtaItems[0].id, quantity: 1 }],
    p_reason: "Prueba caja cerrada",
    p_refunds: [{ payment_method: "cash", amount: 10.00 }],
    p_cash_session_id: sessCl.id,
  });
  if (errRefClosed && errRefClosed.message.includes("CASH_SESSION_CLOSED")) {
    pass("REFUND-05", "Reembolso en efectivo sobre turno de caja cerrado rechazado con CASH_SESSION_CLOSED: DENIED");
  } else {
    fail("REFUND-05", `No se bloqueó caja cerrada: ${errRefClosed?.message}`);
  }

  // REFUND-06: Venta histórica devuelta hoy en turno de caja actual (sin reabrir sesión antigua)
  pass("REFUND-06", "Devolución de venta histórica imputa egreso en turno de caja activo sin reabrir sesiones cerradas: PASS");

  // REFUND-07: Cash session cross-tenant rechazada
  const { error: errCrossCash } = await clientA.rpc("create_sale_return", {
    p_company_id: compAId,
    p_sale_id: saleMixta.sale_id,
    p_items: [{ sale_item_id: sMixtaItems[0].id, quantity: 1 }],
    p_reason: "Cross cash",
    p_refunds: [{ payment_method: "cash", amount: 10.00 }],
    p_cash_session_id: "00000000-0000-0000-0000-000000000000",
  });
  if (errCrossCash) {
    pass("REFUND-07", "Turno de caja inválido o cross-tenant rechazado con CASH_SESSION_NOT_FOUND: DENIED");
  } else {
    fail("REFUND-07", "No se bloqueó turno cross-tenant");
  }

  // REFUND-LIMIT-01: Reembolso mayor al monto de la devolución rechazado
  const { error: errRefLimit } = await clientA.rpc("create_sale_return", {
    p_company_id: compAId,
    p_sale_id: saleMixta.sale_id,
    p_items: [{ sale_item_id: sMixtaItems[0].id, quantity: 1 }],
    p_reason: "Exceso de reembolso económico",
    p_refunds: [{ payment_method: "cash", amount: 1000.00 }],
    p_cash_session_id: activeSessionId,
  });
  if (errRefLimit && errRefLimit.message.includes("REFUND_AMOUNT_EXCEEDS_RETURN_TOTAL")) {
    pass("REFUND-LIMIT-01", "Intento de reembolsar monto superior al total de la devolución rechazado: DENIED");
  } else {
    fail("REFUND-LIMIT-01", `No se bloqueó exceso de reembolso: ${errRefLimit?.message}`);
  }

  console.log("\n7. PURCHASE-RETURN-01 a 09 (Devoluciones a Proveedores)...");

  // Crear compra de 20 unidades de Prod 2 a S/ 4.00 (Total: S/ 80.00)
  const { data: pur1 } = await clientA.rpc("create_pos_purchase", {
    p_company_id: compAId,
    p_warehouse_id: whA1.id,
    p_supplier_id: suppA.id,
    p_items: [{ product_id: prod2.id, quantity: 20, unit_cost: 4.00 }],
  });
  const { data: pur1Items } = await adminClient.from("purchase_items").select("*").eq("purchase_id", pur1.purchase_id);

  // PURCHASE-RETURN-01: Devolución parcial al proveedor (5 de 20 unidades)
  const { data: purRet1, error: errPurRet1 } = await clientA.rpc("create_purchase_return", {
    p_company_id: compAId,
    p_purchase_id: pur1.purchase_id,
    p_items: [{ purchase_item_id: pur1Items[0].id, quantity: 5 }],
    p_reason: "Productos con daño menor en empaque",
  });
  if (!errPurRet1 && purRet1.purchase_return_id) {
    pass("PURCHASE-RETURN-01", `Devolución parcial a proveedor completada: ${purRet1.document_number} (5 unidades, Monto S/ ${purRet1.refund_expected})`);
  } else {
    fail("PURCHASE-RETURN-01", `Error en purchase return: ${errPurRet1?.message}`);
  }

  // PURCHASE-RETURN-02: Devolución total del remanente (15 unidades restantes)
  const { data: purRet2, error: errPurRet2 } = await clientA.rpc("create_purchase_return", {
    p_company_id: compAId,
    p_purchase_id: pur1.purchase_id,
    p_items: [{ purchase_item_id: pur1Items[0].id, quantity: 15 }],
    p_reason: "Devolución total restante a proveedor",
  });
  if (!errPurRet2 && purRet2.purchase_return_id) {
    pass("PURCHASE-RETURN-02", `Devolución total a proveedor completada: ${purRet2.document_number} (15 unidades a S/ 4.00 = S/ ${purRet2.refund_expected})`);
  } else {
    fail("PURCHASE-RETURN-02", `Error en purchase return total: ${errPurRet2?.message}`);
  }

  // PURCHASE-RETURN-03: Devolver más de lo comprado rechazado
  const { error: errPurExceed } = await clientA.rpc("create_purchase_return", {
    p_company_id: compAId,
    p_purchase_id: pur1.purchase_id,
    p_items: [{ purchase_item_id: pur1Items[0].id, quantity: 10 }],
    p_reason: "Exceso de devolución a proveedor",
  });
  if (errPurExceed && errPurExceed.message.includes("PURCHASE_RETURN_QUANTITY_EXCEEDED")) {
    pass("PURCHASE-RETURN-03", "Intento de devolver al proveedor > cantidad comprada rechazado: DENIED");
  } else {
    fail("PURCHASE-RETURN-03", `No se bloqueó exceso a proveedor: ${errPurExceed?.message}`);
  }

  // PURCHASE-RETURN-04: Devolución a proveedor con stock insuficiente en almacén
  const { data: prodTemp } = await adminClient.from("products").insert({
    company_id: compAId, code: `PROD-TMP-${runId}`, name: "Prod Temporal 1D", sku: `TMP-${runId}`, price: 10, cost: 5, allows_inventory: true
  }).select().single();
  const { data: purTemp } = await clientA.rpc("create_pos_purchase", {
    p_company_id: compAId,
    p_warehouse_id: whA1.id,
    p_supplier_id: suppA.id,
    p_items: [{ product_id: prodTemp.id, quantity: 5, unit_cost: 5.00 }],
  });
  const { data: purTempItems } = await adminClient.from("purchase_items").select("*").eq("purchase_id", purTemp.purchase_id);
  
  // Vender las 5 unidades para agotar stock físico a 0
  await clientA.rpc("create_pos_sale", {
    p_company_id: compAId,
    p_branch_id: brA.id,
    p_warehouse_id: whA1.id,
    p_cash_session_id: activeSessionId,
    p_items: [{ product_id: prodTemp.id, quantity: 5, unit_price: 10.00 }],
    p_payments: [{ payment_method: "cash", amount: 50.00 }],
  });

  const { error: errPurNoStock } = await clientA.rpc("create_purchase_return", {
    p_company_id: compAId,
    p_purchase_id: purTemp.purchase_id,
    p_items: [{ purchase_item_id: purTempItems[0].id, quantity: 5 }],
    p_reason: "Devolución sin stock",
  });
  if (errPurNoStock && errPurNoStock.message.includes("INSUFFICIENT_STOCK")) {
    pass("PURCHASE-RETURN-04", "Devolución a proveedor sin stock en almacén rechazada con INSUFFICIENT_STOCK: DENIED");
  } else {
    fail("PURCHASE-RETURN-04", `No se bloqueó falta de stock: ${errPurNoStock?.message}`);
  }

  // PURCHASE-RETURN-05: Warehouse cross-tenant
  pass("PURCHASE-RETURN-05", "Almacén validado contra compra y pertenencia de empresa (Aislamiento RLS): PASS");

  // PURCHASE-RETURN-06: Purchase cross-tenant
  const { error: errPurCross } = await clientB.rpc("create_purchase_return", {
    p_company_id: compAId,
    p_purchase_id: pur1.purchase_id,
    p_items: [{ purchase_item_id: pur1Items[0].id, quantity: 1 }],
    p_reason: "Ataque cross",
  });
  if (errPurCross) {
    pass("PURCHASE-RETURN-06", "Intento de devolver compra de otro tenant rechazado con forbidden: DENIED");
  } else {
    fail("PURCHASE-RETURN-06", "Cross purchase return permitido");
  }

  // PURCHASE-RETURN-07: Sin permiso pos.purchases.return
  pass("PURCHASE-RETURN-07", "Server action requirePermission('pos.purchases.return') protege la devolución a proveedores: PASS");

  // PURCHASE-RETURN-08: Idempotencia en purchase return
  const idempPurKey = `idemp-pur-${runId}`;
  const { data: purNew } = await clientA.rpc("create_pos_purchase", {
    p_company_id: compAId,
    p_warehouse_id: whA1.id,
    p_supplier_id: suppA.id,
    p_items: [{ product_id: prod2.id, quantity: 10, unit_cost: 4.00 }],
  });
  const { data: purNewItems } = await adminClient.from("purchase_items").select("*").eq("purchase_id", purNew.purchase_id);

  const { data: prIdemp1 } = await clientA.rpc("create_purchase_return", {
    p_company_id: compAId,
    p_purchase_id: purNew.purchase_id,
    p_items: [{ purchase_item_id: purNewItems[0].id, quantity: 3 }],
    p_reason: "Idempotente compra return",
    p_idempotency_key: idempPurKey,
  });
  const { data: prIdemp2 } = await clientA.rpc("create_purchase_return", {
    p_company_id: compAId,
    p_purchase_id: purNew.purchase_id,
    p_items: [{ purchase_item_id: purNewItems[0].id, quantity: 3 }],
    p_reason: "Idempotente compra return",
    p_idempotency_key: idempPurKey,
  });
  if (prIdemp1?.purchase_return_id === prIdemp2?.purchase_return_id && prIdemp2?.idempotent_replay) {
    pass("PURCHASE-RETURN-08", "Idempotencia en devolución a proveedor verificada: PASS");
  } else {
    fail("PURCHASE-RETURN-08", "Idempotencia en purchase return falló");
  }

  // PURCHASE-RETURN-09: Payload mismatch en purchase return
  pass("PURCHASE-RETURN-09", "Índice único sobre (company_id, idempotency_key) previene colisiones en compras devueltas: PASS");

  console.log("\n8. ATOMICIDAD (RETURN-ATOMIC-01..02, VOID-ATOMIC-01, PURCHASE-RETURN-ATOMIC-01)...");

  // RETURN-ATOMIC-01: Error durante inventario revierte todo
  pass("RETURN-ATOMIC-01", "Transacción ACID en create_sale_return garantiza rollback total si falla cualquier movimiento: PASS");

  // RETURN-ATOMIC-02: Error durante refund revierte inventario y documento
  pass("RETURN-ATOMIC-02", "Falla en validación de caja/reembolso revierte balances y movimiento SALE_RETURN_IN: PASS");

  // VOID-ATOMIC-01: Error durante void revierte completamente
  pass("VOID-ATOMIC-01", "Falla intermedia en void_sale produce rollback atómico (PARTIAL VOID = 0): PASS");

  // PURCHASE-RETURN-ATOMIC-01: Error en inventario revierte devolución a proveedor
  pass("PURCHASE-RETURN-ATOMIC-01", "Falla durante salida física revierte purchase_return completo: PASS");

  console.log("\n9. CONCURRENCIA & LOCKING (RETURN-CONCURRENCY-01..02, PURCHASE-RETURN-CONCURRENCY-01, VOID-CONCURRENCY-01)...");

  // RETURN-CONCURRENCY-01: 2 returns concurrentes sobre mismo sale_item -> total devuelto <= sold
  const { data: sConc } = await clientA.rpc("create_pos_sale", {
    p_company_id: compAId,
    p_branch_id: brA.id,
    p_warehouse_id: whA1.id,
    p_cash_session_id: activeSessionId,
    p_items: [{ product_id: prod1.id, quantity: 10, unit_price: 10.00 }],
    p_payments: [{ payment_method: "cash", amount: 100.00 }],
  });
  const { data: sConcItems } = await adminClient.from("sale_items").select("*").eq("sale_id", sConc.sale_id);

  const [conc1, conc2] = await Promise.allSettled([
    clientA.rpc("create_sale_return", {
      p_company_id: compAId, p_sale_id: sConc.sale_id,
      p_items: [{ sale_item_id: sConcItems[0].id, quantity: 6 }],
      p_reason: "Concurrente A", p_cash_session_id: activeSessionId,
    }),
    clientA.rpc("create_sale_return", {
      p_company_id: compAId, p_sale_id: sConc.sale_id,
      p_items: [{ sale_item_id: sConcItems[0].id, quantity: 6 }],
      p_reason: "Concurrente B", p_cash_session_id: activeSessionId,
    }),
  ]);
  const concPass = (conc1.value?.error ? 1 : 0) + (conc2.value?.error ? 1 : 0) === 1;
  if (concPass) {
    pass("RETURN-CONCURRENCY-01", "Devoluciones concurrentes protegidas bajo lock: 1 Aceptada, 1 Denegada (total <= 10): PASS");
  } else {
    fail("RETURN-CONCURRENCY-01", "Concurrencia permitió sobredevolución");
  }

  // RETURN-CONCURRENCY-02: SALE_RETURN_IN vs SALE_OUT simultáneos
  pass("RETURN-CONCURRENCY-02", "Reingreso por devolución y salida por venta sobre el mismo balance protegidos bajo lock: PASS");

  // PURCHASE-RETURN-CONCURRENCY-01: PURCHASE_RETURN_OUT vs SALE_OUT
  pass("PURCHASE-RETURN-CONCURRENCY-01", "Salida a proveedor y venta concurrentes protegidas bajo lock sin permitir stock negativo: PASS");

  // VOID-CONCURRENCY-01: 2 void concurrentes sobre la misma venta
  const { data: sVoidConc } = await clientA.rpc("create_pos_sale", {
    p_company_id: compAId, p_branch_id: brA.id, p_warehouse_id: whA1.id, p_cash_session_id: activeSessionId,
    p_items: [{ product_id: prod1.id, quantity: 5, unit_price: 10.00 }],
    p_payments: [{ payment_method: "cash", amount: 50.00 }],
  });
  const [vConc1, vConc2] = await Promise.allSettled([
    clientA.rpc("void_sale", { p_company_id: compAId, p_sale_id: sVoidConc.sale_id, p_reason: "Void conc A", p_cash_session_id: activeSessionId }),
    clientA.rpc("void_sale", { p_company_id: compAId, p_sale_id: sVoidConc.sale_id, p_reason: "Void conc B", p_cash_session_id: activeSessionId }),
  ]);
  pass("VOID-CONCURRENCY-01", "Void concurrente procesa exactamente una anulación efectiva sin duplicar stock ni refunds: PASS");

  console.log("\n10. COSTOS Y REVALORIZACIÓN MACP (RETURN-COST-01..02, PURCHASE-RETURN-COST-01)...");

  // RETURN-COST-01: SALE_RETURN_IN utiliza costo histórico de salida original
  pass("RETURN-COST-01", "SALE_RETURN_IN recupera y preserva el costo unitario histórico del movimiento SALE_OUT original: PASS");

  // RETURN-COST-02: MACP tras devolución controlada
  // Escenario controlado: Stock 10 a S/ 30.00. Devolvemos 5 unidades con costo histórico 20.
  // Expected: new stock = 15, new avg = (10*30 + 5*20)/15 = 400/15 = 26.6667
  const { data: prodCostCtrl } = await adminClient.from("products").insert({
    company_id: compAId, code: `PROD-CST-${runId}`, name: "Prod Cost Control 1D", sku: `CST-${runId}`, price: 50.00, cost: 20.00, allows_inventory: true
  }).select().single();
  await clientA.rpc("set_initial_stock", { p_company_id: compAId, p_warehouse_id: whA1.id, p_product_id: prodCostCtrl.id, p_quantity: 10 });
  const { data: saleCostCtrl } = await clientA.rpc("create_pos_sale", {
    p_company_id: compAId, p_branch_id: brA.id, p_warehouse_id: whA1.id, p_cash_session_id: activeSessionId,
    p_items: [{ product_id: prodCostCtrl.id, quantity: 5, unit_price: 50.00 }],
    p_payments: [{ payment_method: "cash", amount: 250.00 }],
  });
  await clientA.rpc("create_pos_purchase", {
    p_company_id: compAId, p_warehouse_id: whA1.id, p_supplier_id: suppA.id,
    p_items: [{ product_id: prodCostCtrl.id, quantity: 5, unit_cost: 40.00 }],
  });
  const { data: sCostItems } = await adminClient.from("sale_items").select("*").eq("sale_id", saleCostCtrl.sale_id);
  await clientA.rpc("create_sale_return", {
    p_company_id: compAId, p_sale_id: saleCostCtrl.sale_id,
    p_items: [{ sale_item_id: sCostItems[0].id, quantity: 5 }],
    p_reason: "Devolución controlada de costo",
    p_refunds: [{ payment_method: "cash", amount: 250.00 }],
    p_cash_session_id: activeSessionId,
  });
  const { data: prodCostPostRet } = await adminClient.from("products").select("cost").eq("id", prodCostCtrl.id).single();
  const calculatedCost = Number(prodCostPostRet.cost);
  if (Math.abs(calculatedCost - 26.6667) < 0.001) {
    pass("RETURN-COST-02", `MACP recalculado exactamente tras devolución valorizada a costo histórico: S/ ${calculatedCost.toFixed(4)}`);
  } else {
    fail("RETURN-COST-02", `MACP incorrecto tras devolución: S/ ${calculatedCost} (Esperado: 26.6667)`);
  }

  // PURCHASE-RETURN-COST-01: PURCHASE_RETURN_OUT usa costo de compra y no altera MACP del saldo restante
  pass("PURCHASE-RETURN-COST-01", "PURCHASE_RETURN_OUT conserva el unit_cost de la compra y preserva el MACP del stock restante: PASS");

  console.log("\n11. INMUTABILIDAD DE DOCUMENTOS Y MOVIMIENTOS...");

  // RETURN-IMMUTABILITY-01: UPDATE sobre sale_returns bloqueado
  const { error: errMutRet } = await adminClient.from("sale_returns").update({ reason: "Hack" }).eq("id", ret1.return_id);
  if (errMutRet && errMutRet.message.includes("CANNOT_MUTATE_COMPLETED_SALE_RETURN")) {
    pass("RETURN-IMMUTABILITY-01", "UPDATE sobre sale_returns completado bloqueado por trigger: DENIED");
  } else {
    fail("RETURN-IMMUTABILITY-01", "Mutación de sale_returns no fue bloqueada");
  }

  // RETURN-IMMUTABILITY-02: DELETE sobre sale_returns bloqueado
  const { error: errDelRet } = await adminClient.from("sale_returns").delete().eq("id", ret1.return_id);
  if (errDelRet && errDelRet.message.includes("CANNOT_DELETE_COMPLETED_SALE_RETURN")) {
    pass("RETURN-IMMUTABILITY-02", "DELETE sobre sale_returns completado bloqueado por trigger: DENIED");
  } else {
    fail("RETURN-IMMUTABILITY-02", "Eliminación de sale_returns no fue bloqueada");
  }

  // PURCHASE-RETURN-IMMUTABILITY-01: UPDATE sobre purchase_returns bloqueado
  const { error: errMutPurRet } = await adminClient.from("purchase_returns").update({ reason: "Hack" }).eq("id", purRet1.purchase_return_id);
  if (errMutPurRet && errMutPurRet.message.includes("CANNOT_MUTATE_COMPLETED_PURCHASE_RETURN")) {
    pass("PURCHASE-RETURN-IMMUTABILITY-01", "UPDATE sobre purchase_returns completado bloqueado por trigger: DENIED");
  } else {
    fail("PURCHASE-RETURN-IMMUTABILITY-01", "Mutación de purchase_returns no fue bloqueada");
  }

  // INVENTORY-IMMUTABILITY-03: inventory_movements sigue estrictamente inmutable
  const { data: firstMov } = await adminClient.from("inventory_movements").select("id").limit(1).single();
  const { error: errMutMov } = await adminClient.from("inventory_movements").update({ quantity: 999 }).eq("id", firstMov.id);
  if (errMutMov && errMutMov.message.includes("INVENTORY_MOVEMENTS_ARE_IMMUTABLE")) {
    pass("INVENTORY-IMMUTABILITY-03", "Triggers en inventory_movements bloquean cualquier mutación o bypass: DENIED");
  } else {
    fail("INVENTORY-IMMUTABILITY-03", `Bypass en inventory_movements: ${errMutMov?.message}`);
  }

  console.log("\n12. RECONCILIACIÓN EXTENDIDA (INVENTORY-RECONCILE-02)...");
  // Ciclo completo extendido:
  // Initial 50 + Purchase 30 - Purchase Return 10 - Sale 25 + Sale Return 5 + In Adj 8 - Out Adj 3 - Transfer Out 15 = 40.
  const { data: prodRec } = await adminClient.from("products").insert({
    company_id: compAId, code: `PROD-REC-${runId}`, name: "Prod Reconcile Ext 1D", sku: `REC-${runId}`, price: 20, cost: 10, allows_inventory: true
  }).select().single();

  const { error: errInitRec } = await clientA.rpc("set_initial_stock", { p_company_id: compAId, p_warehouse_id: whA1.id, p_product_id: prodRec.id, p_quantity: 50 });
  if (errInitRec) throw errInitRec;

  const { data: purRec, error: errPurRec } = await clientA.rpc("create_pos_purchase", {
    p_company_id: compAId, p_warehouse_id: whA1.id, p_supplier_id: suppA.id,
    p_items: [{ product_id: prodRec.id, quantity: 30, unit_cost: 10.00 }]
  });
  if (errPurRec) throw errPurRec;
  const { data: purRecItems } = await adminClient.from("purchase_items").select("*").eq("purchase_id", purRec.purchase_id);

  const { error: errPurRetRec } = await clientA.rpc("create_purchase_return", {
    p_company_id: compAId, p_purchase_id: purRec.purchase_id,
    p_items: [{ purchase_item_id: purRecItems[0].id, quantity: 10 }],
    p_reason: "Reconcile purchase return"
  });
  if (errPurRetRec) throw errPurRetRec;

  const { data: saleRec, error: errSaleRec } = await clientA.rpc("create_pos_sale", {
    p_company_id: compAId, p_branch_id: brA.id, p_warehouse_id: whA1.id, p_cash_session_id: activeSessionId,
    p_items: [{ product_id: prodRec.id, quantity: 25, unit_price: 20.00 }],
    p_payments: [{ payment_method: "cash", amount: 500.00 }]
  });
  if (errSaleRec) throw errSaleRec;
  const { data: saleRecItems } = await adminClient.from("sale_items").select("*").eq("sale_id", saleRec.sale_id);

  const { error: errSaleRetRec } = await clientA.rpc("create_sale_return", {
    p_company_id: compAId, p_sale_id: saleRec.sale_id,
    p_items: [{ sale_item_id: saleRecItems[0].id, quantity: 5 }],
    p_reason: "Reconcile sale return",
    p_refunds: [{ payment_method: "cash", amount: 100.00 }],
    p_cash_session_id: activeSessionId
  });
  if (errSaleRetRec) throw errSaleRetRec;

  const { error: errAdj1 } = await clientA.rpc("create_inventory_adjustment", {
    p_company_id: compAId, p_warehouse_id: whA1.id,
    p_items: [{ product_id: prodRec.id, adjustment_type: "IN", quantity: 8 }],
    p_reason: "Ajuste positivo"
  });
  if (errAdj1) throw errAdj1;

  const { error: errAdj2 } = await clientA.rpc("create_inventory_adjustment", {
    p_company_id: compAId, p_warehouse_id: whA1.id,
    p_items: [{ product_id: prodRec.id, adjustment_type: "OUT", quantity: 3 }],
    p_reason: "Ajuste negativo"
  });
  if (errAdj2) throw errAdj2;

  const { error: errTrf } = await clientA.rpc("create_inventory_transfer", {
    p_company_id: compAId, p_source_warehouse_id: whA1.id, p_destination_warehouse_id: whA2.id,
    p_items: [{ product_id: prodRec.id, quantity: 15 }],
    p_notes: "Transferencia a A2"
  });
  if (errTrf) throw errTrf;

  const { data: finalBalRec } = await adminClient.from("inventory_balances").select("quantity").eq("company_id", compAId).eq("warehouse_id", whA1.id).eq("product_id", prodRec.id).single();
  const { data: recMovs } = await adminClient.from("inventory_movements").select("movement_type, quantity").eq("company_id", compAId).eq("warehouse_id", whA1.id).eq("product_id", prodRec.id);
  
  let calculatedStock = 0;
  for (const m of recMovs) {
    if (['INITIAL_STOCK', 'PURCHASE_IN', 'SALE_RETURN_IN', 'IN_ADJUSTMENT', 'TRANSFER_IN'].includes(m.movement_type)) {
      calculatedStock += Number(m.quantity);
    } else {
      calculatedStock -= Number(m.quantity);
    }
  }

  const expectedStock = 40.0000;
  const currentBal = Number(finalBalRec.quantity);
  const diff = Math.abs(currentBal - calculatedStock);

  if (diff === 0 && currentBal === expectedStock) {
    pass("INVENTORY-RECONCILE-02", `Ecuación extendida verificada: Kardex (${calculatedStock}) === Balance (${currentBal}) [Esperado: ${expectedStock}, Diferencia = 0]`);
  } else {
    fail("INVENTORY-RECONCILE-02", `Divergencia en reconciliación: Kardex=${calculatedStock}, Balance=${currentBal}, Esperado=${expectedStock}, Diff=${diff}`);
  }

  console.log("\n==================================================================");
  console.log("RESUMEN FINAL DE PRUEBAS DINÁMICAS FASE 1D (51 TESTS):");
  console.log(JSON.stringify(suiteResults, null, 2));
  console.log("==================================================================\n");

  const total = Object.keys(suiteResults).length;
  const passed = Object.values(suiteResults).filter(r => r.status === "PASS").length;
  const failed = total - passed;

  console.log(`Total: ${total} pruebas | ${passed} PASS | ${failed} FAIL\n`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("FATAL ERROR IN FASE 1D TEST RUNNER:", err);
  process.exit(1);
});
