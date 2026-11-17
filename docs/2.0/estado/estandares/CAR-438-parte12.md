# CAR-438 · Limpieza 3, parte 12: satélites ERP y helpers `apps/web/lib`

- **Sesión:** [Sesión Cursor · Estándares]
- **PR:** rama `cursor/car-438-erp-satelites-1f57`
- **Estado:** En PR
- **Migración:** No
- **Base:** `main`

## Qué entra

31 exportaciones sin uso menos (simplicidad **246 → 215**):

- **ERP:** tipos/helpers internos en cumplimiento, importar, firmas, finanzas (cobranza, rentabilidad, centros), cotizaciones (`meta-ficha`), negocios (hojas), remuneraciones, usuarios (grupos, permisos), personas (ausencias), calendario de pagos.
- **Lib:** `cpq-ficha-pasos`, `instrumentos-valores`, avisos/presentación CPQ, `tipos-maestros` (tipos base que solo alimentan filas/detalle).
- Código muerto: `BASES_PLANTILLA_CPQ`, `ORDEN_BLOQUES`, `OpcionPersona`.

Sin cambio de pantalla. `pnpm --filter @opai/web test`: 879 en verde.

## Qué queda pendiente

- CAR-438 en archivos cubiertos por PRs #1011/#1025/#1030 y resto de `apps/web/lib`.
- CAR-440 (archivos/funciones largas).

## Qué se decidió

- Parte 12 desde `main`, sin solapar ramas abiertas de configuración/documentos/personas (partes 9–10).