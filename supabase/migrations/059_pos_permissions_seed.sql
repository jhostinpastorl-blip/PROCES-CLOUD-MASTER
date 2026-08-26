-- ===================================================================
-- PROCESA CLOUD · FASE 1A · MIGRATION 059
-- POS Permission Catalog & Seed
-- ===================================================================

insert into public.permissions (code, description) values
  ('pos.products.read', 'Permite consultar el catálogo de productos y servicios'),
  ('pos.products.manage', 'Permite crear, editar y desactivar productos y servicios'),
  ('pos.categories.read', 'Permite consultar las categorías de productos'),
  ('pos.categories.manage', 'Permite crear y editar categorías de productos'),
  ('pos.customers.read', 'Permite consultar el directorio de clientes'),
  ('pos.customers.manage', 'Permite crear y editar clientes'),
  ('pos.suppliers.read', 'Permite consultar el directorio de proveedores'),
  ('pos.suppliers.manage', 'Permite crear y editar proveedores'),
  ('pos.warehouses.read', 'Permite consultar los almacenes de la empresa'),
  ('pos.warehouses.manage', 'Permite crear y editar almacenes'),
  ('pos.inventory.read', 'Permite consultar el stock y balances de inventario'),
  ('pos.inventory.manage', 'Permite establecer stock inicial y ajustes de inventario'),
  ('pos.cash_registers.read', 'Permite consultar las cajas de las sucursales'),
  ('pos.cash_registers.manage', 'Permite crear y configurar cajas registradoras')
on conflict (code) do nothing;

-- Asignar automáticamente los nuevos permisos POS a los roles de Administrador de sistema
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.is_system = true and r.name = 'Administrador'
  and p.code like 'pos.%'
on conflict do nothing;
