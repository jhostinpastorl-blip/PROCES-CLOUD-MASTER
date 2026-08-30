# PROCESA CLOUD — MODELO MULTI-TENANT Y PRINCIPIOS DE SEGURIDAD

============================================================
1. MODELO JERÁRQUICO MULTI-TENANT
============================================================

```
User (auth.users)
 └── Company Membership (public.company_memberships)
      ├── Company (public.companies) -> Frontera principal de aislamiento (company_id)
      │    ├── Branch (public.branches) -> Sede física/operativa (branch_id)
      │    ├── Subscriptions & Plan (public.subscriptions -> public.plans)
      │    ├── Company Modules (public.company_modules)
      │    └── Roles & Permissions (public.roles -> public.permissions)
      │         └── Operaciones y Datos (Ventas, Caja, Stock, Clientes, Facturas)
```

---

============================================================
2. AISLAMIENTO MULTIEMPRESA Y MULTISUCURSAL
============================================================

### A. Regla del `company_id` (Frontera de Seguridad Absoluta)
- Toda entidad o registro empresarial contiene obligatoriamente una columna `company_id uuid references public.companies(id)`.
- El acceso cross-tenant está denegado por defecto en la base de datos mediante políticas PostgreSQL RLS.
- Ninguna consulta puede confiar en el input del frontend; el `company_id` se extrae del contexto autenticado y se valida con `public.is_company_member(company_id)`.

### B. Regla del `branch_id` (Sede Operativa)
- `branch_id` se utiliza en entidades dependientes de la sede física: `cash_registers`, `cash_sessions`, `sales`, `inventory_levels`, `warehouses`.
- Entidades corporativas globales (como `customers`, `suppliers`, `categories`, `products_catalog`, `roles`, `plans`) no llevan `branch_id` forzoso para evitar fragmentación innecesaria.

---

============================================================
3. MATRIZ DE AUTORIZACIÓN BASADA EN PERMISOS (RBAC)
============================================================
- La autorización en PROCESA Cloud **no depende de nombres de roles fijos**, sino de **permisos granulares**.
- **Convención de Nombres:** `<modulo>.<entidad>.<accion>`
  * *Ejemplos:* `pos.sales.create`, `pos.sales.cancel`, `pos.cash.open`, `pos.cash.close`, `inventory.kardex.read`, `company.update`.
- **Verificación en Capas:**
  1. **PostgreSQL RLS:** `public.has_permission(company_id, 'permiso')`.
  2. **Server Actions:** `await requirePermission(companyId, 'permiso')`.
  3. **Frontend:** Renderizado condicional de botones según array de permisos en contexto.

---

============================================================
4. DECÁLOGO DE SEGURIDAD (SECURITY PRINCIPLES)
============================================================
1. **Defensa en Profundidad:** La interfaz web es una capa de experiencia de usuario, nunca una barrera de seguridad. Todo se valida en servidor y base de datos.
2. **Zero Service Role en Cliente:** `SUPABASE_SERVICE_ROLE_KEY` vive exclusivamente en el backend y jamás se expone en bundles o variables `NEXT_PUBLIC_*`.
3. **RLS Inquebrantable:** Prohibido desactivar RLS en tablas de producción para "resolver problemas de permisos".
4. **Auditoría Inmutable:** Toda acción administrativa, cancelación de venta, arqueo de caja o emisión tributaria genera un registro inmutable en `audit_logs`.
5. **Sesiones Seguras:** Tokens JWT emitidos y verificados criptográficamente mediante cookies `httpOnly`, `secure`, `sameSite: "lax"`.
6. **Validación Estricta:** Todo payload de entrada se valida mediante esquemas Zod en Server Actions antes de interactuar con la base de datos.
7. **Principio de Menor Privilegio:** Los usuarios solo reciben los permisos mínimos necesarios para su función operativa.
8. **Inmutabilidad Fiscal:** Los comprobantes electrónicos (CPE) firmados y enviados a SUNAT no admiten mutación directa (`UPDATE`/`DELETE` bloqueados por triggers).
