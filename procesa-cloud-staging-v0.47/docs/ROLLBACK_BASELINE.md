# Rollback baseline
Antes de cualquier release:
- commit/tag conocido;
- listado de migraciones;
- backup previo a migraciones destructivas;
- migraciones destructivas requieren plan explícito;
- aplicación debe poder volver al último build estable cuando DB sea compatible.
En RC0 no se aceptan cambios destructivos improvisados.
