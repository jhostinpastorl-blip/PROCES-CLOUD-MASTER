# PROCESA CLOUD — PROTOCOLO Y PLAN DE ROLLBACK

============================================================
1. PRINCIPIOS DE RECUPERACIÓN SEGURA
============================================================
El rollback en PROCESA Cloud está diseñado para ser rápido, predecible y no destructivo:
- **Regla Estricta:** En ambientes compartidos o remotos (GitHub / Producción) está **terminantemente prohibido** el uso de `git reset --hard` o `git push --force`.
- **Estrategia Preferida:** Reversiones hacia adelante mediante `git revert` o despliegue de tags de respaldo inmutables.

---

============================================================
2. PROCEDIMIENTOS DE ROLLBACK OPERATIVO
============================================================

### A. Volver Inmediatamente al Código de Producción Estable V1
Para regresar a la versión oficial estable de producción:
```bash
git switch main
```

### B. Inspeccionar el Checkpoint Exacto de Respaldo V1
Para auditar o verificar el estado congelado exacto de V1:
```bash
git checkout tags/backup/procesacloud-v1-pre-v2
# NOTA: Esto deja el repositorio en estado 'detached HEAD' para inspección o pruebas locales.
```

### C. Deshacer un Cambio Específico en la Rama de Desarrollo V2
Para revertir un commit defectuoso publicado en `develop/procesacloudv2` sin alterar el historial:
```bash
git revert <hash-del-commit>
git push origin develop/procesacloudv2
```

### D. Restaurar Producción en Cloudflare ante Incidente Crítico
Si un despliegue en producción fallase:
1. En el panel de Cloudflare Dashboard → Workers / Pages → Deployments.
2. Localizar el despliegue anterior marcado como estable.
3. Hacer clic en **"Rollback to this deployment"**.

---

============================================================
3. MATRIZ DE ADVERTENCIAS Y RIESGOS
============================================================

| Comando / Acción | Nivel de Peligro | Razón de Prohibición |
|---|:---:|---|
| `git reset --hard` | **CRÍTICO** | Destruye el historial de commits y elimina cambios de trabajo no guardados. |
| `git push --force` | **CRÍTICO** | Reescribe la historia remota en GitHub y desincroniza a otros desarrolladores. |
| `DROP TABLE / TRUNCATE` | **CATASTRÓFICO** | Destruye datos persistentes multi-tenant en PostgreSQL. |
