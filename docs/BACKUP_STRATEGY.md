# Estrategia de backup
PostgreSQL/Supabase es fuente de verdad transaccional. Usar backup nativo acorde al plan y criticidad.
Drive recibe snapshots/exportaciones adicionales en formatos abiertos, no sustituye PITR/backups de base.
Cada snapshot futuro debe incluir manifest: company_id, fecha UTC, schema version, archivos, checksum y resultado.
Restauración debe probarse; un backup no probado no se considera estrategia de recuperación.
