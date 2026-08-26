# Validación local
Comandos objetivo:
npm ci
npm run verify
npm run typecheck
npm run build

En el entorno de generación v0.15 se intentó materializar dependencias, pero la instalación excedió el tiempo disponible; por ello NO se declara build verde.
La verificación estática propia sí queda incorporada al repositorio para CI.
Nunca sustituir un CI verde por una afirmación basada solo en generación de archivos.
