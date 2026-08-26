# Bootstrap Google Drive API
Drive será provider de archivos, no DB.
Crear credencial server-side con alcance mínimo.
Raíz lógica PROCESA CLOUD DATA.
Cada archivo: autorizar tenant -> subir provider -> registrar provider_object_id en PostgreSQL -> audit.
Descarga: autorizar tenant -> resolver metadata -> solicitar provider.
No exponer credenciales ni confiar en enlaces Drive como autorización.
