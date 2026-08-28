# PROCESA CLOUD — CONTROL DE VERSIONES Y ESTRATEGIA GIT

============================================================
1. ESTRATEGIA DE RAMAS (BRANCHING STRATEGY)
============================================================

```
main (Producción Estable) ──●──●──●── [Tag: backup/procesacloud-v1-pre-v2]
                              \
develop/procesacloudv2 ────────●──●──●── (Desarrollo Activo V2)
                                \
                                 └── feature/v2-landing (Opcional para cambios grandes)
```

- **`main`:** Rama protegida que contiene el código estable de producción. Ningún commit directo está permitido.
- **`develop/procesacloudv2`:** Rama de desarrollo activa donde se construye y evoluciona PROCESA Cloud V2.
- **`feature/*`:** Ramas temporales de ciclo corto para refactorizaciones aisladas, integradas a `develop/procesacloudv2` mediante Pull Requests.

---

============================================================
2. CONVENCIÓN DE COMMITS (CONVENTIONAL COMMITS)
============================================================
Cada commit debe ser atómico, descriptivo y categorizado:
- `feat(<scope>):` Nueva funcionalidad o componente (ej. `feat(landing-v2): add multi-product hero carousel`).
- `fix(<scope>):` Corrección de errores (ej. `fix(auth): prevent redirect loop on expired session`).
- `docs(<scope>):` Creación o actualización de documentación (ej. `docs(v2): define ecosystem architecture`).
- `style(<scope>):` Cambios de estilos o tokens visuales sin alterar lógica de negocio.
- `refactor(<scope>):` Reorganización interna de código sin cambio de comportamiento.
- `test(<scope>):` Incorporación o actualización de suites de prueba.
- `chore(<scope>):` Tareas de mantenimiento, dependencias o configuración de compilación.

---

============================================================
3. ESTRATEGIA DE TAGS (SEMANTIC VERSIONING)
============================================================
- **Puntos de Respaldo Histórico:** `backup/<nombre-descriptivo>` (ej. `backup/procesacloud-v1-pre-v2`).
- **Hitos de Desarrollo V2:** `v2.0.0-alpha.1`, `v2.0.0-alpha.2`, `v2.0.0-beta.1`, `v2.0.0-rc.1`.
- **Lanzamientos Oficiales:** `v2.0.0`, `v2.1.0`.
- **Creación de Tags Anotados Obligatoria:** `git tag -a <nombre-tag> <hash> -m "<mensaje-detallado>"`.
