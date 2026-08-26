# Bootstrap Supabase QA
Crear proyecto QA separado de producción.
Variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY solo server-side.
Aplicar migraciones numéricamente.
No usar service role en navegador.
Crear datos sintéticos A/B y validar RLS antes de cualquier dato real.
Guardar credenciales solo en secretos del entorno.
