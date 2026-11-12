# BRIEF · CAR-335 · Diseño nuevo de OPAI 2.0 (plan por bloques)

Decisión: ADR-109 (Carlos, 12-nov-2026). Diseño aprobado: `docs/2.0/design/export-diseno-nuevo/`. Este archivo es el plan general; cada bloque trae su propio brief completo (16 secciones) en el PR que lo construye.

## 1. Objetivo

Llevar toda la aplicación al diseño nuevo sin dejar pantallas a medio cambiar: primero el sistema de diseño, después el marco, y luego los patrones y los módulos.

## 2. Estado actual (verificado en `main` el 12-nov-2026)

- `packages/ds` tiene dos pieles: la clásica y Hilo (`[data-marco="hilo"]` en `tokens.css`, variante `marco-hilo:` y utilidades `ds-*`), elegibles en «Mi cuenta → Diseño» (ADR-090).
- Hilo no tiene menú lateral ni barra inferior; el diseño nuevo sí. El marco cambia, no solo los colores.
- El perfil de marca del tenant ya existe en el núcleo (ADR-028) y lo usan PDF y correos; la interfaz todavía no toma su color.
- No hay vistas guardadas ni selección de varias filas en `ListScreen`.

## 3. Regla de convivencia

El diseño nuevo entra como una tercera piel, `[data-marco="nuevo"]`, elegible en «Mi cuenta → Diseño». Mientras se construye, nadie la ve por defecto. Cuando D1 a D5 estén integrados y revisados, pasa a ser la predeterminada (D6) y se retiran las otras dos. Así las demás sesiones siguen trabajando sin choques: sus pantallas usan piezas del DS y toman la piel nueva sin tocar su código.

## 4. Bloques

| Bloque | Qué entra | Depende de |
|---|---|---|
| **D1 · Sistema de diseño** | Tokens de la piel nueva (claro y oscuro), fuentes Geist y Geist Mono, color de acento por empresa (función pura en `packages/domain` que deriva tono de día y de noche con contraste AA, con tests), piezas del DS con la piel nueva, página `/ds` y el sistema en Claude Design | — |
| **D2 · Marco** | `AppShell` nuevo: menú lateral con íconos y acordeón, cerrado que se asoma al pasar el mouse, Configuración y Novedades abajo, barra superior con buscador único (⌘K) y tema como ícono; en teléfono, barra inferior (Inicio, Agente, Menú, Yo) | D1 |
| **D3 · Inicio** | Cola de trabajo e indicadores elegidos por empresa (catálogo de Indicadores) | D2 |
| **D4 · Listas y fichas** | `ListScreen` con secciones, vistas guardadas y selección de varias filas; ficha a la derecha, ampliable y editable; estados de carga, vacío, sin permiso, error y sin conexión | D1 |
| **D5 · Agente en la ficha** | «Preguntar a OPAI» responde dentro de la ficha y propone acciones con Aprobar o Descartar | D4 |
| **D6 · Activación** | La piel nueva queda predeterminada; se retiran la clásica y Hilo; logo y color de la empresa en Configuración → Empresa → Marca | D1 a D5 |
| **Módulos** | Pantallas especiales (pauta, flujo de caja, embudo, carpetas) y portales, un PR por módulo | D6 |

## 5. Capacidades nuevas (paridad con el MCP, ADR-055)

- Vistas guardadas: `core.vistas.list`, `core.vistas.save`, `core.vistas.delete` (por usuario y pantalla).
- Marca: color y logo del tenant por `core.marca.*` (se revisa lo que ya existe antes de agregar).
- Acciones sobre varias filas: cada módulo expone la suya; la interfaz solo las invoca en lote con `dryRun`.

## 6. Reglas que no cambian

Solo tokens y piezas de `@opai/ds`; sin hex fuera de `tokens.css`; presupuesto de JS (ADR-037): las fuentes se cargan con `next/font` y se mide; pruebas `@preview` a 375, 1024 y 1280 px en cada bloque visual; entrada de novedades en cada bloque que cambie pantallas.

## 7. Riesgos

- **Choque con sesiones en paralelo.** D2 toca `AppShell`, que usan todos. Se mitiga con la piel aparte (nadie la ve hasta D6) y avisando en `ESTADO.md`.
- **Contraste del color de la empresa.** Un color muy claro u oscuro puede leerse mal; la función de D1 lo corrige y, si no alcanza AA, usa el neutro.
- **Peso de las fuentes.** Si Geist supera el presupuesto, se usa solo el peso variable con subconjunto latino.

## 8. Reporte de ejecución

Se completa en cada PR de bloque.
