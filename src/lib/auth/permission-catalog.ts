export const CORE_PERMISSIONS=[
"branches.read","branches.manage","users.read","users.invite","roles.read","roles.manage",
"modules.read","modules.manage","company.read","company.update","subscription.read",
"subscription.manage","storage.read","storage.manage","audit.read","notifications.read"
] as const;
export type CorePermission=typeof CORE_PERMISSIONS[number];
