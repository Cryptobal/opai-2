# BRIEF CAR-322b · Desempeño: pestaña «Meses cerrados» y pendientes menores

Apilado sobre CAR-322 (cierre de período, PR #561). ADR-094 y su adenda CAR-322.

## 1 Objetivo

Que quien administra los scorecards vea los meses cerrados y pueda cerrar el mes anterior desde la pantalla, sin esperar el cierre automático. Cerrar dos pendientes menores de la segunda entrega (#560).

## 2 Estado actual (verificado)

- `desempeno.periodos.cerrar` y `desempeno.periodos.list` existen (PR #561) pero no tienen pantalla.
- Archivar un indicador propio en uso decía «N cargo(s)» sin nombrarlos.
- Un supervisor con alcance acotado y el permiso `desempeno:scorecards.manage` veía los botones de editar indicadores propios y recibía un error al guardar.

## 3 Alcance

- Pestaña «Meses cerrados» (`/desempeno/cierres`): lista de meses cerrados (mes, fecha de cierre, a mano o automático, personas) y botón «Cerrar <mes>» para el mes anterior si sigue abierto, con confirmación (no se puede reabrir).
- `desempeno.periodos.list` devuelve `{ cerrados, porCerrar }`: `porCerrar` es el mes anterior si no está cerrado.
- `desempeno.periodos.cerrar` rechaza (FORBIDDEN) a quien tiene alcance acotado: cerrar es de toda la empresa.
- Archivar en uso nombra los cargos («Vendedor», …), y archivar también rechaza el alcance acotado.
- La confirmación simula el cierre (`dryRun`) y dice cuántas personas y cargos quedan fijos, o que el mes queda vacío.
- Indicadores propios y meses cerrados: los botones de escritura se ocultan con alcance acotado.

Fuera: cerrar meses más antiguos desde la pantalla (lo hace el cierre automático o el MCP), elegir el mes, cierre por otro período que no sea mensual.

## 4 Arquitectura

Sin capacidades nuevas. `periodos.list` pasa a `cierre-lista.ts` (límite de 150 líneas). La pantalla usa `ListScreen` con `accionPrincipal` y `DialogoConfirmar`, igual que «Indicadores propios». No hay diseño aprobado específico: se usa el de la pestaña «Indicadores propios» (mismo módulo), y se reporta.

## 5 Archivos

`apps/web/app/(erp)/desempeno/cierres/{page.tsx,_componentes/cerrar-mes.tsx}`, `_componentes/{pestanas.tsx,datos.ts}`, `indicadores/page.tsx`; `packages/capabilities/src/desempeno/{cierre.ts,cierre-lista.ts,index.ts,propios-archivar.ts}`; tests db de cierre y propios; e2e `desempeno-cierres.spec.ts` y `desempeno-preview.spec.ts`; novedad `2026-11-12-desempeno-meses-cerrados.md`.

## 6 Modelo de datos y migraciones

Ninguna.

## 7 Capacidades

`desempeno.periodos.list` (salida cambia, aún sin integrar) y `desempeno.periodos.cerrar` (rechazo por alcance). Snapshots de paridad actualizados.

## 8 Interfaz y responsive

Lista con tarjetas en teléfono y tabla en escritorio (patrón `ListScreen`). Botón principal en el patrón. Confirmación con `DialogoConfirmar` en modo peligro.

## 9 Seguridad y tenant

Lecturas por `forTenant`. Cerrar exige `desempeno:scorecards.manage`, alcance completo, aprobación humana a agentes y auditoría (ya existentes).

## 10 Casos límite

Mes anterior ya cerrado → sin botón. Ningún mes cerrado → estado vacío que explica el cierre automático. Doble clic → `CONFLICT` «Ese mes ya está cerrado».

## 11 Plan por bloques

1. Capacidades: `porCerrar`, alcance en cerrar, cargos nombrados; tests.
2. Pantalla, e2e, novedad, ESTADO.

## 12 Tests

`desempeno-cierre-db` (alcance acotado → FORBIDDEN; lista con `cerrados`), `desempeno-propios-db` (rechazo nombra «Vendedor»), e2e local y `@preview`.

## 13 Validación

Gate local, e2e local a 375/1024/1280 con capturas, `preview-e2e` cuando `qa-e2e` tenga Desempeño activo.

## 14 Criterios de aceptación

- Se ve la lista de meses cerrados; el mes anterior abierto se puede cerrar con confirmación y aparece en la lista.
- Un supervisor con alcance acotado no ve los botones y la capacidad lo rechaza.
- El rechazo de archivar nombra los cargos.

## 15 Riesgos y rollback

Bajo: sin migración. Rollback = revertir el PR.

## 16 Reporte de ejecución

Ver la descripción del PR y `ESTADO.md`.
