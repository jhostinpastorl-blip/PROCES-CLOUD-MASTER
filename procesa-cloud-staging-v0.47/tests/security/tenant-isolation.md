# QA obligatorio — aislamiento multiempresa
Caso 1: Usuario A pertenece únicamente a Empresa A. Debe leer A y no B.
Caso 2: Usuario B pertenece únicamente a Empresa B. Debe leer B y no A.
Caso 3: enviar manualmente company_id de B desde sesión A: backend debe rechazar.
Caso 4: consultar branches de B con sesión A: RLS debe devolver cero/rechazar.
Caso 5: intentar crear branch en A sin branches.manage: guard debe rechazar.
Caso 6: usuario cliente intenta /procesa-admin: redirección al dashboard.
Caso 7: platform_admin activo accede /procesa-admin.
Caso 8: platform_admin desactivado pierde acceso.
Estos casos deberán automatizarse al disponer del proyecto Supabase de pruebas.
