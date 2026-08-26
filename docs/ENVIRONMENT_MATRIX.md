# Matriz de entornos

| Entorno | Uso | Base de datos | Dominio |
|---|---|---|---|
| local | desarrollo | Supabase QA/dev | localhost |
| qa | RLS/integración | Supabase QA | privado |
| staging | validación web | Supabase QA/Staging | subdominio staging |
| production | clientes | Supabase Production | cloud.procesacorp... |

Nunca compartir service-role entre QA y Production.
