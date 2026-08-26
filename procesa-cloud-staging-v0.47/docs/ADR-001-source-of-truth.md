# ADR-001 — Fuente de verdad
Decisión: PostgreSQL será la única fuente de verdad transaccional.
Google Drive: documentos y archivos.
Excel/Sheets: importación, exportación, reportes y snapshots.
Razón: evitar doble escritura, inconsistencias y bloqueos de concurrencia.
Consecuencia: ninguna operación de venta, caja, stock, permisos o suscripción dependerá de Excel como base primaria.
