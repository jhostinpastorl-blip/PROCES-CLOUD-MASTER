# ADR-002: ESTRATEGIA DE MULTI-TENANCY CON POSTGRESQL RLS

============================================================
ESTADO: ACEPTADO
FECHA: 2026-08-27
RESPONSABLE: Chief Software Architect & Security Engineer
============================================================

### CONTEXTO
Una plataforma SaaS empresarial requiere aislamiento riguroso entre empresas para evitar cualquier fuga o alteración de datos cross-tenant. Existen tres modelos tradicionales: Base de datos por tenant, Schema por tenant o Base de datos compartida con discriminador de tenant.

### DECISIÓN
Adoptar el modelo de **Base de datos relacional compartida con discriminador obligatorio `company_id` y políticas nativas de PostgreSQL Row-Level Security (RLS)**:
1. Todas las tablas transaccionales y de configuración contienen `company_id uuid references public.companies(id)`.
2. Las políticas RLS aplican la cláusula `using (public.is_company_member(company_id))` para operaciones de lectura.
3. Las operaciones de escritura validan los permisos de rol correspondientes mediante `public.has_permission(company_id, permission_code)`.
4. Los índices compuestos primarios comienzan con `company_id` (ej. `(company_id, created_at desc)`) para garantizar búsquedas indexadas ultra rápidas.

### CONSECUENCIAS
- **Positivas:**
  * Máxima simplicidad en migraciones (1 sola migración aplica a todos los tenants).
  * Aislamiento enforced en el motor de base de datos, independiente de errores en código de frontend.
  * Costo mínimo de mantenimiento y gestión.
- **Negativas / Mitigaciones:**
  * Riesgo de consultas sin filtro `company_id` en tablas masivas (Mitigado por índices compuestos y verificación automática con scripts de auditoría SQL).

### ALTERNATIVAS CONSIDERADAS
- **Base de datos por cliente:** Rechazado por costos inviables de aprovisionamiento en la etapa actual.
- **Schemas independientes:** Rechazado por complejidad extrema al ejecutar migraciones masivas en cientos de esquemas.
