# Google Drive Storage Provider
Drive será almacenamiento documental inicial, no base transaccional.
Ruta lógica sugerida: companies/{company_uuid}/{documents|sales|purchases|reports|exports|imports|backups}/...
PostgreSQL guarda provider, provider_object_id, logical_path, nombre, MIME, tamaño, checksum, owner y timestamps.
La autorización se decide antes de llamar al proveedor. Una URL o ID de Drive nunca concede acceso.
No guardar secretos en Drive. Credenciales API solo en entorno server-side.
