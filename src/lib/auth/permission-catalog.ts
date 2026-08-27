export const CORE_PERMISSIONS = [
  "branches.read", "branches.manage",
  "users.read", "users.invite",
  "roles.read", "roles.manage",
  "modules.read", "modules.manage",
  "company.read", "company.update",
  "subscription.read", "subscription.manage",
  "storage.read", "storage.manage",
  "audit.read", "notifications.read"
] as const;

export const POS_PERMISSIONS = [
  "pos.products.read", "pos.products.manage",
  "pos.categories.read", "pos.categories.manage",
  "pos.customers.read", "pos.customers.manage",
  "pos.suppliers.read", "pos.suppliers.manage",
  "pos.warehouses.read", "pos.warehouses.manage",
  "pos.inventory.read", "pos.inventory.manage",
  "pos.cash_registers.read", "pos.cash_registers.manage",
  "pos.sales.read", "pos.sales.create",
  "pos.cash_sessions.open", "pos.cash_sessions.close",
  "pos.purchases.read", "pos.purchases.create",
  "pos.inventory.adjust", "pos.inventory.transfer", "pos.inventory.kardex",
  "pos.sales.return", "pos.sales.void", "pos.purchases.return",
  "pos.reports.sales", "pos.reports.cash", "pos.reports.inventory", "pos.reports.purchases", "pos.reports.cost",
  "pos.cash_sessions.x_report", "pos.cash_sessions.z_report",
  "pos.cpe.read", "pos.cpe.issue", "pos.cpe.retry", "pos.cpe.credit_note", "pos.cpe.config.manage"
] as const;

export const ALL_PERMISSIONS = [
  ...CORE_PERMISSIONS,
  ...POS_PERMISSIONS
] as const;

export type CorePermission = typeof CORE_PERMISSIONS[number];
export type PosPermission = typeof POS_PERMISSIONS[number];
export type Permission = typeof ALL_PERMISSIONS[number];
