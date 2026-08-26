# Bootstrap Cloudflare
Antes de staging público: DNS/TLS, proxy, rate limiting login/demo, reglas contra abuso, headers, revisar cache de rutas autenticadas.
No cachear /app ni APIs privadas.
Mantener /api/health y assets públicos cacheables solo cuando corresponda.
Evaluar Workers/R2 únicamente si aportan costo/rendimiento real.
