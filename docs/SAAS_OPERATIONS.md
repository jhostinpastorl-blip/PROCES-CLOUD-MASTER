# PROCESA CLOUD — RESUMEN DE OPERACIONES Y DOCUMENTACIÓN TÉCNICA

## 1. Onboarding (`docs/ONBOARDING.md`)
- Flujo en 6 pasos: Datos Empresa -> Plan/Trial -> Primera Sucursal -> Equipo -> Módulos -> Dashboard.
- Estado recuperable por usuario en `user_onboarding_states`.

## 2. Abstracción de Email (`docs/EMAIL.md`)
- Interfaz `IEmailProvider` con `DevelopmentEmailProvider` y `SmtpEmailProvider`.
- Registro de envíos en `sent_emails_log`.
- Templates HTML/Texto con branding corporativo PROCESA Cloud.

## 3. Tareas Asíncronas (`docs/JOBS.md`)
- Tabla `system_jobs` con control de estados: `PENDING`, `PROCESSING`, `SUCCEEDED`, `FAILED`, `RETRYABLE`, `DEAD`.
- Idempotencia garantizada por clave única `idempotency_key`.

## 4. Respaldo y Restauración (`docs/BACKUP_RESTORE.md`)
- Estrategia diaria con retención de 30 días en Supabase Hosted (PITR).
- Procedimiento de simulacro de restauración documentado.

## 5. Auditoría y Retención (`docs/AUDIT_RETENTION_POLICY.md`)
- `audit_logs`: Retención mínima 365 días para cumplimiento normativo contable/fiscal.
- `platform_audit_logs`: Retención permanente de acciones de Super Admins.
- Prohibición estricta de `UPDATE` y `DELETE` mediante triggers.

## 6. Despliegue (`docs/DEPLOYMENT.md`)
- Frontend en Vercel / Cloudflare Pages / Node.js Standalone.
- Backend en Supabase PostgreSQL (Managed).
