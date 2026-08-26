# RC matrix
A. Auth: login/logout/reset/update password.
B. Tenant: A cannot read/write B by URL, RPC, query or forged company_id.
C. Branch: permission + plan limit + audit.
D. Users: invite/revoke/accept/role; cross-tenant role denied; user limit.
E. Roles: create/assign permission; no cross-tenant assignment.
F. Modules: plan entitlement and explicit company_modules.
G. Storage: list/write metadata only with permission; provider path never authorizes.
H. Audit: immutable from normal client; tenant-scoped reads.
I. Platform: procesa-admin only platform_admin; no implicit tenant access.
J. UX: responsive mobile/tablet/desktop, empty/error/loading states.
