# Platform Admin Matrix v0.45

1. Usuario no autenticado -> `/procesa-admin` bloqueado.
2. Usuario tenant admin sin registro en `platform_admins` -> bloqueado.
3. Usuario registrado en `platform_admins` activo -> acceso permitido.
4. `platform_admins.is_active=false` -> bloqueado.
5. Super Admin no omite RLS tenant en rutas cliente salvo acción explícita de plataforma.
6. Ninguna credencial del Super Admin aparece en código, logs o respuestas públicas.
