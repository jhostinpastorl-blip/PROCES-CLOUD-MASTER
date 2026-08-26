# ADR-003 — Multi-tenancy
Decisión: shared PostgreSQL con company_id + RLS + autorización server-side.
Razón: costo inicial bajo, operación sencilla y aislamiento verificable.
Regla: frontend nunca es frontera de seguridad. Toda consulta/mutación empresarial debe quedar tenant-bound.
