# ADR-003: ESTRATEGIA DE MARCA MATRIZ E IDENTIDADES VISUALES VERTICALES

============================================================
ESTADO: ACEPTADO
FECHA: 2026-08-27
RESPONSABLE: Product Manager & UX/UI Product Designer
============================================================

### CONTEXTO
PROCESA Cloud comercializa soluciones para múltiples industrias disímiles (bodegas, restaurantes, gimnasios, veterinarias). Si todos los productos comparten exactamente el mismo diseño visual plano, se perciben genéricos y desalineados con la naturaleza del negocio del cliente. Por el contrario, crear aplicaciones web totalmente independientes fragmenta la marca corporativa, encarece el desarrollo y destruye la reutilización de código.

### DECISIÓN
Adoptar la estrategia de **Marca Matriz (PROCESA Cloud / PROCESA CORP) con Identidad Visual Especializada por Vertical**:
1. **Elementos Comunes Invariables:**
   - Logotipo corporativo de PROCESA Cloud.
   - Color corporativo principal `#1b2c54` en headers, shells y footer.
   - Slogan: *"El futuro se procesa hoy."*.
   - Sistema base de componentes UI, tipografía, accesibilidad, autenticación y seguridad.
2. **Elementos Especializados por Vertical:**
   - Paleta de acentos secundarios (`accentPrimary`, `accentGlow`, `accentBadge`).
   - Iconografía y widgets contextuales adaptados a la industria (ej. caja y balanza para POS, mesas para REST, rutinas para GYM).
   - Lenguaje, terminología comercial y copys enfocados en la resolución de problemas específicos del sector.

### CONSECUENCIAS
- **Positivas:**
  * Coherencia visual empresarial de alto nivel.
  * Mayor conversión comercial al hablar en el idioma del negocio del cliente.
  * Reutilización del 100% de la arquitectura técnica y componentes base.
- **Negativas / Mitigaciones:**
  * Requiere disciplina de diseño para no saturar con colores no auditados (Mitigado mediante matriz centralizada de tokens en `src/config/products.ts` y tokens CSS validados en A11Y).
