# Headers
X-Content-Type-Options nosniff
Referrer-Policy strict-origin-when-cross-origin
X-Frame-Options DENY
Permissions-Policy restringida
Cross-Origin-Opener-Policy same-origin
CSP inicial deny-by-default con conexiones Supabase explícitas.
Antes de producción revisar CSP contra recursos reales y eliminar unsafe-inline cuando la estrategia de nonce/hash esté implementada.
