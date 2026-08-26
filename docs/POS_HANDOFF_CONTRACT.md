# POS handoff contract
POS podrá consumir Core únicamente mediante contratos estables:
- usuario autenticado;
- company_id resuelto desde membresía;
- branch_id validado dentro de company_id;
- requirePermission para capacidades POS;
- requireModule(companyId,"pos");
- límites comerciales desde plan/entitlements;
- storage vía StorageProvider;
- audit para operaciones críticas.
POS no podrá crear su propio sistema paralelo de usuarios, empresas, roles, archivos o planes.
