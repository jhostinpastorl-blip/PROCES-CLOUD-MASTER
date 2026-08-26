# Datos QA para RC0
Crear exclusivamente en Supabase QA:
- Empresa A: ACME QA, plan Pro, 2 sucursales.
- Empresa B: BETA QA, plan Lite, 1 sucursal.
- admin-a: Administrador en A.
- cashier-a: Cajero en A.
- admin-b: Administrador en B.
- platform-qa: platform_admin, sin membresía empresarial automática.
Pruebas negativas: admin-a intenta IDs de B; cashier-a intenta roles.manage; admin-b intenta invitación de A; platform-qa intenta datos tenant sin membresía.
Nunca reutilizar datos reales de clientes en QA.
