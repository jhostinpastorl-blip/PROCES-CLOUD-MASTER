# Rate Limiting Policy v0.35
Aplicar en Cloudflare/staging y mantener defensa server-side cuando corresponda.
- login: 10 / 5 min
- registro: 6 / 15 min
- password reset: 5 / 15 min
- demo: 12 / hora
- aceptar invitación: 20 / 15 min
No revelar si un correo existe. Evitar límites demasiado agresivos para redes empresariales/NAT.
