# BRIEF · Hilo H2: piel Hilo de estados, indicadores y tablero (CAR-324)

Etapa H2 del plan `BRIEF-base-hilo.md` (ADR-090, CAR-274). Sesión Hilo. Sin migración.

## 1. Objetivo

Que, dentro del marco Hilo, los indicadores, el tablero y los estados de pantalla (cargando, vacío, error, sin permiso, sin conexión) se vean como en el diseño aprobado `docs/2.0/design/export-base-hilo/`: el «Pulso» de Inicio y «Piezas y estados» del tablero principal. El marco clásico no cambia.

## 2. Estado actual (verificado en `main`, 12-nov-2026)

- H1 (#509) y H1.1 ya trajeron el marco y la piel de las piezas comunes del DS: botones, campos, etiquetas, tablas y pestañas con subrayado.
- H1 dejó para H2 los estados vacíos (con el bloque centrado y el borde punteado del clásico), los avisos, `KpiTile` (todavía en tarjeta) y los ajustes finos de cada patrón (`BRIEF-hilo-h1-marco.md`, §16).

## 3. Alcance

- **Entra:**
  - Estados de `@opai/ds` (`Empty`, `ErrorState`, `Forbidden`, `SinConexion`) y `Loading`.
  - `KpiTile` y la grilla de indicadores (`DashboardScreen`, Inicio, Asistencia, Pauta y Consumos).
  - `DISENO.md` (§3b, piel del marco Hilo).
  - Muestra en `/ds/hilo?vista=piezas`.
- **No entra:**
  - Avisos dentro de pantalla: el DS no tiene una pieza común (cada pantalla arma el suyo); llevarlos a una pieza del DS es un bloque aparte.
  - Las tarjetas de los widgets.
  - Plataforma y los otros portales: el marco Hilo todavía es solo del ERP (H5).

## 4. Arquitectura

- La piel vive en el DS, con alcance al marco Hilo. A diferencia de H1, no usa clases `marco-hilo:` en los componentes, sino utilidades `ds-*` en `packages/ds/src/styles.css` (`ds-estado`, `ds-estado-icono`, `ds-kpi`, `ds-grilla-kpi`, `ds-esq-*`…). Con clases en el JS, 16 rutas pasaban su tope de JS compartido por entre 0,1 y 0,4 KB. En CSS, el JS solo lleva el nombre y no se sube ningún tope.
- Las reglas del marco Hilo usan `:is([data-marco="hilo"] *)`, que tiene más especificidad que las utilidades del clásico.
- El esqueleto no agrega elementos: en el marco Hilo, los mismos bloques del clásico se pintan como filas, con pseudo-elementos para las líneas y un fondo para el monograma.
- `GRILLA_KPI_HILO` (`"ds-grilla-kpi"`) se suma a la grilla de cada pantalla que arma indicadores.

## 5. Archivos

- `packages/ds/src/styles.css` (utilidades `ds-*` de la piel Hilo)
- `packages/ds/src/states/{index.tsx,sin-conexion.tsx,estados-hilo.test.tsx}`
- `packages/ds/src/components/{card.tsx,index.ts}`
- `packages/ds/src/patterns/dashboard-screen.tsx`
- `apps/web/app/(erp)/_componentes/indicadores-inicio.tsx`, `asistencia/page.tsx`, `pauta/_componentes/contenido-pauta.tsx` y `configuracion/consumos/page.tsx`: suman la grilla
- `apps/web/app/ds/hilo/{piezas.tsx,piezas-estados.tsx}`
- `apps/web/e2e/hilo-h2.spec.ts`
- `docs/2.0/DISENO.md`, `ESTADO.md` y novedad `2026-11-12-hilo-indicadores-estados.md`

## 6. Modelo de datos y migraciones

Ninguno.

## 7. Capacidades

Ninguna nueva. No cambia la paridad.

## 8. Interfaz y responsive

| Pieza | Diseño (`gen3.py`, bloques `kpis`, `estado`, `skeleton`) | Construido |
|---|---|---|
| Indicador | Sin tarjeta, línea, etiqueta 13/18, valor 26/24/22 px, nota 12/16 en su tono | Igual; el valor escala con el ancho del indicador hasta 26 px |
| Grilla | `gap: 0 24px` y líneas entre filas | `gap-x-6 gap-y-0`, línea arriba de cada indicador y al pie |
| Estados | Izquierda, ícono 44 px con radio 14 y fondo de su tono, título 18/26 y botón de línea | Igual |
| Cargando | Filas con monograma de 36 px (radio 10) y dos líneas | Igual en listas; el tablero, indicadores bajo una línea |

Verificado a 375, 1024 y 1280 px (más 390 y 1440), en claro y oscuro.

## 9. Seguridad y tenant

Solo presentación. No cambian datos, permisos ni consultas.

## 10. Casos límite

- Montos de 9 dígitos en el teléfono: el valor escala con el ancho del indicador, con un mínimo de 14 px.
- Pantallas con su propia grilla: si no suman `GRILLA_KPI_HILO`, sus indicadores quedan sin tarjeta y con la línea encima, pero conservan su espacio vertical.

## 11. Plan por bloques

1. `ds:` piel Hilo de estados, esqueleto, indicador y tablero, con su prueba unitaria.
2. `web:` grilla en Inicio, Asistencia, Pauta y Consumos; muestra en `/ds/hilo` y prueba `@preview`.
3. `docs:` `DISENO.md`, brief, ESTADO y novedad.

## 12. Tests

- `estados-hilo.test.tsx`: clases con alcance para cada estado, el tono del ícono, el esqueleto y el indicador; el clásico conserva su bloque.
- `hilo-h2.spec.ts` (`@preview`), en Inicio y Consumos:
  - con el marco Hilo, el indicador va sin radio y con la línea encima;
  - con el clásico, vuelve a tener tarjeta;
  - sin errores de consola.

## 13. Validación

- Capturas en local de `/ds/hilo?vista=piezas` (claro y oscuro) y de Inicio y Consumos con sesión, comparadas con el «Pulso» y con «Piezas y estados» del diseño.
- `preview-e2e` en el PR.

## 14. Criterios de aceptación

- Indicadores, tablero y estados como en el export dentro del marco Hilo.
- El marco clásico sin cambios.
- Contraste AA en claro y oscuro (los tonos usan los tokens existentes).
- Ninguna pantalla pierde contenido.

## 15. Riesgos y rollback

Solo clases con alcance: revertir el PR deja todo como en H1. Riesgo bajo.

## 16. Reporte de ejecución

Los tres bloques del plan. Diferencias:

- **Avisos dentro de pantalla:** quedan fuera (ver §3).
- **Tamaño del valor:** escala con el ancho del indicador en vez de los tamaños fijos por dispositivo del prototipo, para que los montos largos quepan.
- **Piel en CSS:** para no subir el JS compartido (ver §4). Medido con `pnpm presupuesto` sobre la compilación local: todas las rutas dentro de su tope; la más justa, `platform/tenants/[id]/cobro`, queda en 170,0 KB, igual que en `main`.
- **Monograma del esqueleto:** queda con esquinas rectas (el diseño usa radio de 10 px). Se dibuja solo con CSS para no agregar elementos al DOM.
- **`mapa-esqueleto.test.ts`:** la prueba del mapa sin coordenadas buscaba `border-dashed` para reconocer el estado vacío del DS; ahora busca `ds-estado`. Se mantiene la intención: es el estado vacío del DS y no una caja gris.
