# ADR-002 — Modular monolith inicial
Decisión: iniciar PROCESA Cloud como aplicación web modular con límites claros de dominio, no microservicios prematuros.
Razón: menor costo y complejidad operativa durante crecimiento inicial.
Escalabilidad: módulos y contratos se separan desde código para extraer servicios solo cuando métricas reales lo justifiquen.
