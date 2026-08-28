# PROCESA Cloud Premium Design System v0.47

## Propósito

PROCESA Cloud debe sentirse como un único SaaS empresarial: tecnológico, confiable y claro. La experiencia combina una base navy profunda con azul eléctrico como color de acción y acentos cyan/violeta usados con moderación. Premium significa control y precisión, no saturación visual.

## Identidad

- **Marca:** el isotipo hexagonal y el lockup PROCESA Cloud son el ancla visual. Nunca deben competir con otros elementos.
- **Promesa:** “El futuro se procesa hoy.” se reserva para mensajes de marca y no sustituye beneficios concretos.
- **Voz:** directa, empresarial y verificable. Se evitan métricas, clientes o capacidades no comprobadas.
- **Producto:** cada vista demostrativa o capacidad en evolución debe estar identificada explícitamente.

## Color y temas

- **Navy:** fondos de producto, paneles de alto contraste y navegación lateral.
- **Azul eléctrico:** acciones primarias, selección y foco.
- **Cyan:** telemetría, estados activos y detalles operativos.
- **Violeta:** inteligencia, automatización y profundidad ambiental.
- **Magenta:** acento puntual dentro del gradiente de marca; nunca como color dominante.
- **Verde / ámbar / rojo:** solo estados semánticos.

Los temas claro y oscuro mantienen la misma jerarquía. En claro, las superficies son blanco frío y azul muy pálido; en oscuro, navy y superficies translúcidas. Los textos nunca dependen únicamente de un fondo luminoso para ser legibles.

## Niveles de superficie

1. **Nivel 0 — ambiente:** fondo general y campos de luz decorativos.
2. **Nivel 1 — contenedor:** navegación, bandas y secciones agrupadas.
3. **Nivel 2 — tarjeta:** información accionable o comparable.
4. **Nivel 3 — foco:** tarjeta seleccionada, KPI o CTA destacado.
5. **Nivel 4 — producto:** mockups, dashboard y superficies operativas de máxima densidad.

El efecto glass utiliza transparencia, borde fino y desenfoque. Debe conservar contraste y no aplicarse a todo indiscriminadamente.

## Tipografía y jerarquía

- Titulares compactos, de alto peso y con interlineado cerrado.
- Texto de lectura entre 15 y 18 px en escritorio, sin bajar de 14 px en móvil.
- Kicker en mayúsculas para orientar, no para repetir el título.
- Cifras operativas con alineación estable y contraste superior a su etiqueta.
- Los párrafos comerciales se limitan a una idea principal por bloque.

## Componentes

- **Botón primario:** gradiente azul–violeta–magenta, texto blanco y sombra contenida.
- **Botón secundario:** superficie translúcida, borde visible y alto equivalente al primario.
- **Tarjetas:** radio amplio, borde sutil, sombra suave y separación interna consistente.
- **Navegación:** marca a la izquierda, rutas principales al centro y acciones a la derecha; en móvil se transforma en menú desplegable accesible.
- **Dashboard:** sidebar oscuro, barra superior contextual, KPIs escaneables y una banda específica para Viernes.
- **Estados:** texto y símbolo acompañan al color; ningún estado se comunica solo mediante color.

### Material interactivo

Los controles comparten un ADN óptico sin perder jerarquía:

- **Primary premium:** gradiente azul–violeta–magenta, bisel interno, reflejo superior, glow contenido y respiración lumínica lenta.
- **Secondary glass:** superficie translúcida del tema, borde fino, bevel y sombra suave; nunca replica el gradiente primario.
- **Tertiary / ghost:** menor elevación y contraste suficiente para acciones de apoyo.
- **Navigation control:** superficie glass direccional para anterior/siguiente y movimiento de flecha de 2 px.
- **Icon control:** objetivo táctil mínimo de 44 px y foco visible.

El shimmer realiza una única pasada en hover. En active, el control reduce escala y sombra externa para comunicar presión. Radios, bordes, highlights, sombras y easing se consumen mediante tokens compartidos; no se recrean por componente.

### Marca sensible al tema

El lockup automático utiliza una sola ranura de asset. OFF carga exclusivamente `/brand/logo-off.png` (amarillo/dorado) y ON carga exclusivamente `/brand/logo-on.png` (navy). No se renderizan ambas variantes para alternarlas con opacidad, ni se aplican filtros de color.

## Espaciado, radios y profundidad

La escala espacial base es de 4 px, con intervalos preferidos de 8, 12, 16, 24, 32, 48 y 64 px. Los radios se agrupan en 12 px para controles, 18–24 px para tarjetas y 28–32 px para contenedores protagonistas. Las sombras se reservan para separar niveles y nunca deben producir halos que reduzcan la lectura.

## Movimiento

- Duración rápida: 160–220 ms para controles.
- Duración media: 320–480 ms para tarjetas, menús y transiciones de contenido.
- Entrada de secciones: opacidad y desplazamiento corto mediante `IntersectionObserver`.
- El carrusel conserva navegación por botones, indicadores y teclado.
- Con `prefers-reduced-motion: reduce`, las entradas quedan visibles y las transiciones se reducen prácticamente a cero.

## Responsive

- **≥ 1280 px:** composición completa, hero en dos columnas y mockup con máximo detalle.
- **1024–1279 px:** densidad reducida y navegación compacta.
- **768–1023 px:** hero apilado y navegación móvil.
- **≤ 430 px:** acciones a ancho completo, tarjetas en una columna y detalles secundarios del mockup simplificados.

Las decoraciones pueden recortarse con `overflow: clip`; el contenido y las acciones deben conservar ancho intrínseco y no generar scroll horizontal.

## Accesibilidad

- Enlace “Saltar al contenido” preservado.
- Foco visible con color de marca y separación suficiente.
- Controles con nombre accesible, estado (`aria-expanded`, `aria-checked`, `aria-selected`) y objetivos de toque adecuados.
- Contraste mínimo WCAG AA para texto esencial y controles.
- Orden DOM coherente con el orden visual.
- Imágenes decorativas sin ruido para lectores de pantalla; logos y visuales informativos con texto alternativo.

## Uso de claims

Toda afirmación comercial debe corresponder a una capacidad comprobada o indicar con claridad que pertenece al roadmap, una demostración o un producto en evolución. No se publican logotipos, porcentajes, cifras de clientes, uptime ni certificaciones sin evidencia aprobada.
