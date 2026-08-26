# Modelo de permisos v0.31
Los roles son agrupadores de permisos. La lógica de negocio no debe depender del nombre del rol.
Ejemplo: `branches.manage` autoriza la capacidad; que el rol se llame Administrador o Gerente es secundario.
Los permisos Core se centralizan en `src/lib/auth/permission-catalog.ts` y en la migración 040.
Los módulos comerciales podrán añadir sus propios namespaces, por ejemplo `pos.sales.create`.
