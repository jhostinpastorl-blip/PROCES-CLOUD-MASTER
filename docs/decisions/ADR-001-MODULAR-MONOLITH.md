# ADR-001: ADOPCIÓN DE ARQUITECTURA MODULAR MONOLITH

============================================================
ESTADO: ACEPTADO
FECHA: 2026-08-27
RESPONSABLE: Chief Software Architect
============================================================

### CONTEXTO
PROCESA Cloud es un ecosistema SaaS que inicia su comercialización con el producto PROCESA POS (Minimarkets/Retail) y proyecta incorporar múltiples verticales (REST, GYM, VET) y módulos transversales (CONTA, RRHH). La adopción prematura de microservicios o Kubernetes generaría sobrecostos de infraestructura, complejidad operativa excesiva, latencias de red internas y dispersión del equipo de desarrollo.

### DECISIÓN
Adoptar una arquitectura de **Modular Monolith** construida sobre Next.js 15 App Router, TypeScript y PostgreSQL en Supabase, desplegada en Cloudflare Workers:
1. Todos los módulos coexisten en un único repositorio con límites de dominio estrictos.
2. La comunicación entre dominios se realiza mediante llamadas directas a funciones tipadas y Server Actions en el backend.
3. Se diseñan los dominios intensivos (CPE, reportes, colas) con contratos desacoplados que faciliten su extracción futura a microservicios si el volumen lo requiere.

### CONSECUENCIAS
- **Positivas:**
  * Costo de infraestructura cercano a cero durante la etapa inicial.
  * Despliegues atómicos y consistentes.
  * Refactorizaciones y validaciones con tipado integral en TypeScript.
  * Mayor velocidad de desarrollo de nuevas verticales.
- **Negativas / Mitigaciones:**
  * Riesgo de acoplamiento accidental entre módulos (Mitigado mediante reglas de dependencia documentadas en `MODULE_BOUNDARIES.md` y revisiones de código).

### ALTERNATIVAS CONSIDERADAS
- **Microservicios distribuidos:** Rechazado por costo elevado, complejidad de orquestación y sobrecarga innecesaria para la etapa actual del negocio.
- **Múltiples repositorios independientes:** Rechazado por dificultad de sincronización y duplicación masiva del código del Core.
