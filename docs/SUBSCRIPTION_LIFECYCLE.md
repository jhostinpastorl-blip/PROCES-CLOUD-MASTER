# Ciclo de suscripción v0.22
trial -> active -> past_due/cancelled/expired (futuro).
La UI muestra countdown del trial y capacidad del plan.
Upgrade/downgrade todavía es asistido: no existe checkout ni cobro automático.
Toda mutación futura de billing debe ser server-side, idempotente y auditable.
