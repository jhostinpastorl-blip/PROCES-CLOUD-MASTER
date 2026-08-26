# Secret Handling
Nunca guardar valores reales en Git, Drive docs, screenshots o tickets.
Variables sensibles se configuran en el entorno del deployment.
`SUPABASE_SERVICE_ROLE_KEY` es exclusivamente server-side.
Antes del primer push oficial: escaneo de secretos y revisión de `.gitignore`.
Si un secreto se publica accidentalmente: revocar/rotar inmediatamente; borrarlo del último commit no es suficiente.
