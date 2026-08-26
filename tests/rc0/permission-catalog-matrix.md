# Permission Catalog Matrix v0.31
Verificar:
- Admin de tenant obtiene catálogo completo según rol.
- Cajero no recibe roles.manage/users.invite salvo asignación explícita.
- Usuario con branches.read puede listar, no crear.
- Usuario con branches.manage puede crear dentro del límite.
- Usuario sin audit.read no puede leer audit_logs.
- Usuario sin storage.read no puede listar storage_objects.
- Usuario sin modules.manage no puede cambiar company_modules.
- Super Admin de plataforma no recibe estos permisos automáticamente en tenants.
