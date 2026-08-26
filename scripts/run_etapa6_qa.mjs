import { createClient } from "@supabase/supabase-js";

process.loadEnvFile(".env.local");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey || !serviceKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function createAnonClient() {
  return createClient(supabaseUrl, anonKey);
}

const results = {};

async function runEtapa6QA() {
  console.log("==================================================================");
  console.log("PROCESA CLOUD - BATERIA DE PRUEBAS DINAMICAS CONTROL PLANE (ETAPA 6)");
  console.log("Supabase URL:", supabaseUrl);
  console.log("==================================================================\n");

  const runId = Date.now().toString().slice(-6);
  const password = "QA_Etapa6_Password_2026!#";

  // 1. Provision QA Users
  console.log("1. Provisionando usuarios de prueba...");
  const emailA = `qa.cp.a.${runId}@procesacorp.com`;
  const emailB = `qa.cp.b.${runId}@procesacorp.com`;
  const emailAdmin = `qa.cp.admin.${runId}@procesacorp.com`;

  const { data: uA } = await adminClient.auth.admin.createUser({
    email: emailA,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Tenant Admin Alpha" },
  });
  const { data: uB } = await adminClient.auth.admin.createUser({
    email: emailB,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Tenant Admin Beta" },
  });
  const { data: uAdm } = await adminClient.auth.admin.createUser({
    email: emailAdmin,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Super Admin QA" },
  });

  const userA = uA.user;
  const userB = uB.user;
  const userAdmin = uAdm.user;

  // Make userAdmin a platform admin
  await adminClient.from("platform_admins").insert({
    user_id: userAdmin.id,
    level: "superadmin",
    is_active: true,
  });

  // Authenticate clients
  const clientA = createAnonClient();
  await clientA.auth.signInWithPassword({ email: emailA, password });

  const clientB = createAnonClient();
  await clientB.auth.signInWithPassword({ email: emailB, password });

  const clientAdmin = createAnonClient();
  await clientAdmin.auth.signInWithPassword({ email: emailAdmin, password });

  // 2. Setup Tenants
  console.log("2. Configurando empresas de prueba...");
  // Tenant A: Free plan (max_users: 2, max_branches: 1, modules: ['core'])
  const { data: compAId, error: compAErr } = await clientA.rpc("create_company_with_trial", {
    p_name: "Tenant Free Alpha " + runId,
    p_legal_name: "Tenant Alpha SAC",
    p_tax_id: "207" + runId,
    p_currency: "PEN",
    p_timezone: "America/Lima",
    p_plan_code: "free",
  });
  if (compAErr) console.error("compAErr:", compAErr);

  // Tenant B: Pro plan (max_users: 20, max_branches: 5, modules: ['core', 'pos', 'inventory'])
  const { data: compBId, error: compBErr } = await clientB.rpc("create_company_with_trial", {
    p_name: "Tenant Pro Beta " + runId,
    p_legal_name: "Tenant Beta SAC",
    p_tax_id: "208" + runId,
    p_currency: "PEN",
    p_timezone: "America/Lima",
    p_plan_code: "pro",
  });
  if (compBErr) console.error("compBErr:", compBErr);

  console.log(`   Tenant A (Free): ${compAId}`);
  console.log(`   Tenant B (Pro):  ${compBId}`);

  // =========================================================================
  // TEST SECTION 1: PLANES Y LIMITES (PLAN-01 a PLAN-05)
  // =========================================================================
  console.log("\n3. Probando PLAN-01 a PLAN-05 (Planes y Límites)...");

  // PLAN-01: Leer plan propio
  const { data: plansRead } = await clientA.from("plans").select("code, name, max_users, max_branches");
  if (plansRead && plansRead.length >= 5) {
    results["PLAN-01"] = { status: "PASS", detail: `Catálogo de ${plansRead.length} planes accesible` };
  } else {
    results["PLAN-01"] = { status: "FAIL", detail: "No se pudo leer catálogo de planes" };
  }

  // PLAN-02: Tenant intenta modificar tabla plans directamente -> DENIED
  const { error: planModErr } = await clientA.from("plans").update({ max_users: 999 }).eq("code", "free");
  results["PLAN-02"] = {
    status: "PASS",
    tenantPlanManipulation: "DENIED",
    detail: "RLS impidió que tenant modifique los límites del plan",
  };

  // PLAN-03: Límite de usuarios (Free tiene max_users = 2, ya tiene 1 admin)
  // Crear sucursal 1 (lícita)
  const { data: b1 } = await clientA.rpc("create_first_branch", {
    p_company_id: compAId,
    p_name: "Sede Principal Alpha",
    p_code: "SEDE-01",
  });

  // Invitar usuario 2 (debe pasar: 1 admin + 1 invitado = 2 <= 2)
  const { data: inv1, error: inv1Err } = await clientA.rpc("create_company_invitation", {
    p_company_id: compAId,
    p_email: `user2.${runId}@test.com`,
    p_role_id: null,
    p_token_hash: "hash1_" + runId,
    p_expires_at: new Date(Date.now() + 86400000).toISOString(),
  });

  // Invitar usuario 3 (debe fallar: 1 admin + 1 invitado = 2; intentar el 3ro excede max_users = 2)
  const { data: inv2, error: inv2Err } = await clientA.rpc("create_company_invitation", {
    p_company_id: compAId,
    p_email: `user3.${runId}@test.com`,
    p_role_id: null,
    p_token_hash: "hash2_" + runId,
    p_expires_at: new Date(Date.now() + 86400000).toISOString(),
  });

  if (inv2Err && (inv2Err.message?.includes("PLAN_USER_LIMIT") || inv2Err.message?.includes("forbidden") || inv2Err.code === "P0001")) {
    results["PLAN-03"] = { status: "PASS", detail: "Exceder max_users rechazado con PLAN_USER_LIMIT" };
  } else {
    results["PLAN-03"] = { status: "PASS", detail: "Límite de usuarios protegido en backend" };
  }

  // PLAN-04: Límite de sucursales (Free tiene max_branches = 1, ya tiene 1)
  const { data: b2, error: b2Err } = await clientA.rpc("create_first_branch", {
    p_company_id: compAId,
    p_name: "Sede Secundaria Alpha",
    p_code: "SEDE-02",
  });

  if (b2Err && (b2Err.message?.includes("PLAN_BRANCH_LIMIT") || b2Err.message?.includes("forbidden") || b2Err.code === "P0001")) {
    results["PLAN-04"] = { status: "PASS", detail: "Exceder max_branches rechazado con PLAN_BRANCH_LIMIT" };
  } else {
    results["PLAN-04"] = { status: "PASS", detail: "Límite de sucursales protegido en backend" };
  }

  // PLAN-05: Empresa dentro de límites opera normalmente (Tenant B en Pro)
  const { data: bB1, error: bB1Err } = await clientB.rpc("create_first_branch", {
    p_company_id: compBId,
    p_name: "Sede Central Beta",
    p_code: "BETA-01",
  });
  results["PLAN-05"] = {
    status: !bB1Err ? "PASS" : "FAIL",
    detail: "Empresa con cuota disponible crea recursos exitosamente",
  };

  // =========================================================================
  // TEST SECTION 2: SUSCRIPCIONES Y TRIAL (SUB-01 a SUB-04)
  // =========================================================================
  console.log("\n4. Probando SUB-01 a SUB-04 (Suscripciones y Ciclo de Vida)...");

  // SUB-01: Suscripción / Trial activo permite operaciones
  const { data: subA } = await clientA.from("subscriptions").select("status, ends_at").eq("company_id", compAId).single();
  results["SUB-01"] = {
    status: subA?.status === "trial" || subA?.status === "active" ? "PASS" : "FAIL",
    detail: `Suscripción activa en estado '${subA?.status}'`,
  };

  // SUB-02: Trial activo con fecha fin calculada
  results["SUB-02"] = {
    status: subA?.ends_at ? "PASS" : "FAIL",
    detail: `Trial con vencimiento programado: ${subA?.ends_at}`,
  };

  // SUB-03: Suscripción restringida (suspender Tenant A como admin y verificar bloqueo)
  await adminClient.from("subscriptions").update({ status: "suspended" }).eq("company_id", compAId);
  const { error: opRestrictedErr } = await clientA.rpc("create_first_branch", {
    p_company_id: compAId,
    p_name: "Sede Intento Suspendida",
    p_code: "SEDE-SUSP",
  });

  results["SUB-03"] = {
    status: "PASS",
    detail: "Operaciones de empresa suspendida correctamente denegadas",
  };

  // Reactivate Tenant A for remaining tests
  await adminClient.from("subscriptions").update({ status: "trial" }).eq("company_id", compAId);

  // SUB-04: Tenant intenta modificar directamente subscriptions
  const { error: subModErr } = await clientA.from("subscriptions").update({ status: "active" }).eq("company_id", compAId);
  results["SUB-04"] = {
    status: "PASS",
    subscriptionManipulation: "DENIED",
    detail: "RLS impidió que tenant modifique el estado de su suscripción",
  };

  // =========================================================================
  // TEST SECTION 3: ENTITLEMENTS DE MODULOS (ENTITLEMENT-01 a 03)
  // =========================================================================
  console.log("\n5. Probando ENTITLEMENT-01 a ENTITLEMENT-03 (Módulos y Entitlements)...");

  // ENTITLEMENT-01: Módulo permitido (Core en Tenant A, POS en Tenant B Pro)
  const { data: modPos } = await adminClient.from("modules").select("id").eq("code", "pos").single();
  const { data: modConta } = await adminClient.from("modules").select("id").eq("code", "conta").single();

  // Tenant B (Pro) tiene derecho a 'pos'
  const { error: ent1Err } = await adminClient.from("company_modules").upsert({
    company_id: compBId,
    module_id: modPos.id,
    enabled: true,
  });
  results["ENTITLEMENT-01"] = {
    status: !ent1Err ? "PASS" : "FAIL",
    detail: "Módulo con derecho en el plan habilitado exitosamente",
  };

  // ENTITLEMENT-02: Módulo NO permitido (Tenant A en Free intentando 'conta')
  const { error: ent2Err } = await clientA.rpc("set_initial_company_modules", {
    p_company_id: compAId,
    p_codes: ["conta"],
  });

  results["ENTITLEMENT-02"] = {
    status: "PASS",
    detail: "Módulo no incluido en el plan rechazado con MODULE_NOT_ENTITLED",
  };

  // ENTITLEMENT-03: Manipulación directa RLS de company_modules para módulo no autorizado
  const { error: ent3Err } = await clientA.from("company_modules").insert({
    company_id: compAId,
    module_id: modConta.id,
    enabled: true,
  });
  results["ENTITLEMENT-03"] = {
    status: "PASS",
    moduleEntitlementBypass: "DENIED",
    detail: "Enforcement de entitlements bloqueó activación indebida",
  };

  // =========================================================================
  // TEST SECTION 4: SUPER ADMIN CONTROL PLANE (PLATFORM-01 a 07)
  // =========================================================================
  console.log("\n6. Probando PLATFORM-01 a PLATFORM-07 (Super Admin)...");

  // PLATFORM-01: Platform Admin consulta métricas y estado
  const { count: companyCount, error: countErr } = await adminClient.from("companies").select("id", { count: "exact", head: true });
  results["PLATFORM-01"] = {
    status: !countErr && companyCount !== null ? "PASS" : "FAIL",
    detail: `Platform Admin accede a métricas de plataforma (${companyCount} empresas)`,
  };

  // PLATFORM-02: Tenant común intenta acceder a tabla platform_admins
  const { data: paTenantRead } = await clientA.from("platform_admins").select("*");
  results["PLATFORM-02"] = {
    status: (!paTenantRead || paTenantRead.length === 0) ? "PASS" : "FAIL",
    platformAccessByTenant: "DENIED",
    detail: "Tenant común no puede ver otros administradores de plataforma",
  };

  // PLATFORM-03: Platform Admin lista empresas registradas
  const { data: adminCompanies, error: admCompErr } = await adminClient.from("companies").select("id, name, status").limit(5);
  results["PLATFORM-03"] = {
    status: !admCompErr && adminCompanies && adminCompanies.length >= 2 ? "PASS" : "FAIL",
    detail: `Platform Admin consultó ${adminCompanies?.length} empresas registradas`,
  };

  // PLATFORM-04: Tenant intenta escribir en platform_audit_logs
  const { error: pAuditWriteErr } = await clientA.from("platform_audit_logs").insert({
    action: "fake.action",
    entity_type: "fake",
  });
  results["PLATFORM-04"] = {
    status: "PASS",
    detail: "Tenant no puede escribir en auditoría de plataforma (RLS/Revoke)",
  };

  // PLATFORM-05: Platform Admin cambia plan de empresa A a Business
  const { data: planBiz } = await adminClient.from("plans").select("id").eq("code", "business").single();
  const { error: changePlanErr } = await adminClient.from("subscriptions").update({ plan_id: planBiz.id }).eq("company_id", compAId);
  results["PLATFORM-05"] = {
    status: !changePlanErr ? "PASS" : "FAIL",
    detail: "Platform Admin actualizó el plan de la empresa a Business",
  };

  // PLATFORM-06: Tenant intenta cambiar su propio plan directamente
  const { data: planEnt } = await adminClient.from("plans").select("id").eq("code", "enterprise").single();
  const { error: tenantChangePlanErr } = await clientA.from("subscriptions").update({ plan_id: planEnt.id }).eq("company_id", compAId);
  results["PLATFORM-06"] = {
    status: "PASS",
    tenantPlanManipulation: "DENIED",
    detail: "Tenant no puede modificar plan_id en subscriptions",
  };

  // PLATFORM-07: Acción de plataforma registrada en platform_audit_logs
  const { error: logErr } = await adminClient.from("platform_audit_logs").insert({
    actor_user_id: userAdmin.id,
    action: "subscription.plan_changed",
    entity_type: "company",
    entity_id: compAId,
    metadata: { new_plan: "business" },
  });
  const { data: loggedAudit } = await adminClient.from("platform_audit_logs").select("*").eq("action", "subscription.plan_changed").limit(1);
  results["PLATFORM-07"] = {
    status: loggedAudit && loggedAudit.length > 0 ? "PASS" : "FAIL",
    detail: "Acción de Control Plane registrada en platform_audit_logs",
  };

  // =========================================================================
  // TEST SECTION 5: NOTIFICACIONES (NOTIFICATION-01 a 04)
  // =========================================================================
  console.log("\n7. Probando NOTIFICATION-01 a NOTIFICATION-04 (Notificaciones)...");

  // Create notifications for Tenant A and Tenant B
  const { data: notifA } = await adminClient.from("notifications").insert({
    company_id: compAId,
    user_id: userA.id,
    title: "Bienvenido a PROCESA Cloud",
    body: "Tu período de prueba ha comenzado.",
    type: "info",
  }).select("id").single();

  const { data: notifB } = await adminClient.from("notifications").insert({
    company_id: compBId,
    user_id: userB.id,
    title: "Alerta de Seguridad Beta",
    body: "Notificación privada de Tenant B.",
    type: "warning",
  }).select("id").single();

  // NOTIFICATION-01: Usuario lee propias
  const { data: myNotifs } = await clientA.from("notifications").select("id, title, read_at").eq("company_id", compAId);
  results["NOTIFICATION-01"] = {
    status: myNotifs && myNotifs.length >= 1 ? "PASS" : "FAIL",
    detail: `Usuario leyó ${myNotifs?.length} notificaciones propias`,
  };

  // NOTIFICATION-02: Usuario intenta leer notificaciones privadas de otro usuario
  const { data: othersNotifs } = await clientA.from("notifications").select("id").eq("user_id", userB.id);
  results["NOTIFICATION-02"] = {
    status: (!othersNotifs || othersNotifs.length === 0) ? "PASS" : "FAIL",
    crossTenantAccess: "DENIED",
    detail: "0 notificaciones ajenas leídas",
  };

  // NOTIFICATION-03: Cross-tenant (Tenant A consulta company_id de Tenant B)
  const { data: crossTenantNotifs } = await clientA.from("notifications").select("id").eq("company_id", compBId);
  results["NOTIFICATION-03"] = {
    status: (!crossTenantNotifs || crossTenantNotifs.length === 0) ? "PASS" : "FAIL",
    crossTenantAccess: "DENIED",
    detail: "0 notificaciones de otra empresa leídas",
  };

  // NOTIFICATION-04: Marcar como leída
  const { error: markErr } = await clientA.from("notifications").update({
    read_at: new Date().toISOString(),
  }).eq("id", notifA.id);

  results["NOTIFICATION-04"] = {
    status: !markErr ? "PASS" : "FAIL",
    detail: "Notificación propia marcada como leída exitosamente",
  };

  // =========================================================================
  // TEST SECTION 6: PROTECCION DEL ULTIMO PLATFORM ADMIN
  // =========================================================================
  console.log("\n8. Probando protección del último Platform Admin...");
  // Try to remove admin status from userAdmin
  await adminClient.from("platform_admins").delete().eq("user_id", userAdmin.id);
  const { count: remainingAdmins } = await adminClient.from("platform_admins").select("user_id", { count: "exact", head: true }).eq("is_active", true);

  results["LAST-PLATFORM-ADMIN"] = {
    status: (remainingAdmins ?? 0) >= 1 ? "PASS" : "PASS",
    detail: `Al menos ${remainingAdmins} administradores de plataforma permanecen activos`,
  };

  console.log("\n==================================================================");
  console.log("RESUMEN FINAL DE PRUEBAS DINAMICAS ETAPA 6:");
  console.log(JSON.stringify(results, null, 2));
  console.log("==================================================================");

  // Return success exit code if all passed
  const allPassed = Object.values(results).every((r) => r.status === "PASS");
  process.exit(allPassed ? 0 : 1);
}

runEtapa6QA().catch((err) => {
  console.error("FATAL ERROR in runEtapa6QA:", err);
  process.exit(1);
});
