# PROCESA CLOUD — ESTRATEGIA DE DESPLIEGUE CLOUDFLARE

============================================================
1. AMBIENTES DE DESPLIEGUE
============================================================

| Ambiente | Rama Origen | Dominio / URL | Propósito |
|---|---|---|---|
| **PRODUCCIÓN** | `main` | `https://procesacloud.com` | Servicio estable de cara a clientes finales. |
| **STAGING V2** | `develop/procesacloudv2` | `https://staging.procesacloud.com` *(o preview Cloudflare)* | Pruebas de integración, QA visual y validación de producto. |
| **PREVIEW PR** | `feature/*` | `https://*.workers.dev` *(temporal)* | Validación rápida de ramas de características. |

---

============================================================
2. FLUJO DE COMPILACIÓN Y DESPLIEGUE CON OPENNEXT
============================================================
El despliegue de PROCESA Cloud en Cloudflare Workers utiliza el adaptador oficial `@opennextjs/cloudflare`:
1. **Compilación de la Aplicación:**
   ```bash
   npm run build:cloudflare
   # Ejecuta npx @opennextjs/cloudflare build
   ```
2. **Generación del Bundle Worker:**
   OpenNext transforma los Server Components, Server Actions y Middleware en `.open-next/worker.js` y extrae los assets estáticos a `.open-next/assets/`.
3. **Publicación con Wrangler:**
   ```bash
   npm run deploy:cloudflare
   # Ejecuta npx wrangler deploy según la configuración de wrangler.jsonc
   ```

---

============================================================
3. VARIABLES DE ENTORNO EN CLOUDFLARE
============================================================
En el panel de Cloudflare (o mediante `wrangler secret put`):
- `NEXT_PUBLIC_SUPABASE_URL`: URL del proyecto Supabase Cloud.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Llave anónima pública de Supabase.
- `SUPABASE_SERVICE_ROLE_KEY`: Llave de servicio administrativa *(marcada como Secret / Server Only)*.
- `NEXT_PUBLIC_APP_URL`: URL del dominio correspondiente al ambiente.

---

============================================================
4. PROTOCOLO DE DESPLIEGUE SEGURO
============================================================
1. **Regla de Oro:** Nunca desplegar directamente a producción sin validación previa en la rama `develop/procesacloudv2`.
2. **Verificaciones Previas Obligatorias:**
   - `npm run typecheck` = PASS
   - `npm run build` = PASS
   - Tests de aislamiento multi-tenant = PASS
