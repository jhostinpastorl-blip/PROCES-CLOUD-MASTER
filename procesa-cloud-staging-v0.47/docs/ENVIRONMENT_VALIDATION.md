# Environment validation
Requeridas: NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY.
Server-only: SUPABASE_SERVICE_ROLE_KEY.
QA y producción deben usar proyectos/secretos separados.
`/api/config-check` solo devuelve estado general y nunca valores de configuración.
