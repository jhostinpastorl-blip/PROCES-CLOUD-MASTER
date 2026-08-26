# PROCESA CLOUD — ARCHITECTURE & PLATFORM DESIGN

## 1. Visión General
PROCESA Cloud es una plataforma empresarial multi-tenant construida sobre Next.js 15 App Router, TypeScript y Supabase (PostgreSQL con RLS). Su arquitectura divide limpiamente el plano de control (Control Plane) del plano de aplicación del cliente (Data & Tenant Plane).

## 2. Planos de Arquitectura
- **SaaS Control Plane (`/procesa-admin`):** Administrado exclusivamente por Super Admins de PROCESA CORP. Gobierna planes, límites, catálogo de módulos, suspensiones, auditoría de plataforma y métricas agregadas.
- **Tenant Application Plane (`/app`):** Espacio operativo de cada empresa. Aislado a nivel de fila (RLS) en PostgreSQL según las membresías activas del usuario autenticado.

## 3. Jerarquía de Contexto
```
Usuario Autenticado (auth.users)
  └─ Membresía Activa (company_memberships)
       ├─ Empresa (companies)
       ├─ Rol & Permisos (roles -> role_permissions -> permissions)
       ├─ Suscripción & Límites (subscriptions -> plans)
       ├─ Módulos Activos (company_modules)
       └─ Sucursal (branches)
```

## 4. Principios de Seguridad
- RLS obligatorio en todas las tablas con clave `company_id`.
- Service Role Key restringido exclusivamente a Server Actions y scripts de migración; jamás expuesto al cliente.
- Auditoría inmutable en `audit_logs` y `platform_audit_logs` con triggers de solo-inserción.
