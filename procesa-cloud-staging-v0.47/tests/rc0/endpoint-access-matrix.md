# Endpoint access matrix

## Public
- `/`
- `/login`
- `/registro`
- `/demo`
- `/recuperar-contrasena`
- `/aceptar-invitacion` requires authenticated email before acceptance

## Authenticated Core
- `/app/*` requires session through app layout
- `/app/context`
- `/app/dashboard`
- `/app/branches`
- `/app/users`
- `/app/roles`
- `/app/modules`
- `/app/storage`
- `/app/audit`
- `/app/notifications`
- `/app/subscription`
- `/app/settings`

## Platform
- `/procesa-admin/*` requires `platform_admin`

## Mandatory QA
Try all protected routes:
1. anonymous;
2. authenticated without company;
3. member tenant A;
4. member tenant B;
5. suspended member;
6. platform admin without tenant membership.
