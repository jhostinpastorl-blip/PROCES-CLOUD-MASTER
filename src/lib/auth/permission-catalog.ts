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
  "pos.cash_registers.read", "pos.cash_registers.manage"
] as const;

export const ALL_PERMISSIONS = [
  ...CORE_PERMISSIONS,
  ...POS_PERMISSIONS
] as const;

export type CorePermission = typeof CORE_PERMISSIONS[number];
export type PosPermission = typeof POS_PERMISSIONS[number];
export type Permission = typeof ALL_PERMISSIONS[number];
