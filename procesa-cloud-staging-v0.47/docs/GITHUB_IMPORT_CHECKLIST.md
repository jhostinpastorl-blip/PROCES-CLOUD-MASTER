# GitHub Import Checklist
1. Crear repositorio privado `PROCESA-CLOUDE`.
2. Importar el contenido del proyecto, no el ZIP como único archivo.
3. Confirmar que `.env*` reales están ignorados.
4. Confirmar que no existen secretos en historial.
5. Rama principal: `main`.
6. Activar protección de `main` cuando CI esté operativo.
7. Requerir PR + checks para cambios posteriores.
8. Etiqueta inicial sugerida: `core-pre-rc0-v0.26`.
9. No desplegar producción desde este tag.
