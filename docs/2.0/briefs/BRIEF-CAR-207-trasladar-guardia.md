# BRIEF — CAR-207 · Trasladar guardia (y backfill de cobertura)

Encargo de Carlos del 6-nov-2026 (respuestas de las 13:05). Rama `brief/car-207-trasladar-guardia`, desde `main` 3b4a3d08 (con CAR-206 integrado, #358). Referencias: BRIEF-CAR-206, ADR-081 y su adenda, ADR-048 (series), ADR-022, ADR-055.

## 1. Objetivo
Una sola acción **Trasladar** que mueve a un guardia de un puesto a otro (misma instalación o distinta) sin los pasos manuales de hoy (terminar vínculo, crear vínculo, cerrar y fijar series). Además, un backfill único para que los puestos con serie anterior a CAR-206 dejen de aparecer «Por cubrir».

## 2. Estado actual (verificado)
- `core.vinculos.terminar` no cierra las series de la Pauta; el guardia seguía de titular en la instalación anterior.
- `fijarSerieInterna` (CAR-206) es la lógica de fijar series sin `executeCapability` anidado; `sincronizarTitular` deja vínculo y cobertura al día.
- El consumidor de anexos generaba borrador ante cualquier cambio de `puestoId` del vínculo.
- La cobertura de los puestos con serie previa a CAR-206 sigue en PPC.

## 3. Alcance
1. `pauta.titular.trasladar` (+ `preview_`): guardia, puesto de destino, «Rige desde», inicio de ciclo y motivo.
2. Botón «Trasladar» y hoja con vista previa en la ficha del puesto.
3. Backfill de cobertura (script con vista previa) y fila de CAR-206 pasada a integrada en `ESTADO.md`.
4. Decisión de anexos: un cambio solo de puesto no genera anexo.
Fuera de alcance: turnos extra (CAR-96) y los menores de UI de CAR-206 (PR de pendientes).

## 4. Arquitectura
`titular-trasladar.ts` orquesta en una transacción, en este orden: (a) si cambia de instalación, termina el vínculo (`termino` = día antes, motivo, evento `core.vinculo.terminado`); (b) cierra con `fijarSerieInterna(..., titular null, quitar)` cada serie vigente del guardia; (c) crea el vínculo nuevo (mismo cargo, tipo, jornada y distribución; `crearVinculo`) y emite `core.vinculo.actualizado` con `campos: ["instalacionId"]` (borrador de anexo); (d) fija la serie nueva con `fijarSerieInterna` y `sincronizarTitular`. La vista previa pasa `simular` (cierres que la operación real hará antes y vínculo aún inexistente) para que «no doblar» no vea un choque con la serie que se cierra. `pauta.titulares.listar` agrega `destinos` (puestos activos con patrón en alcance).

## 5. Archivos
Nuevos: `pauta/titular-trasladar.ts`, `titular-vista.ts`; UI `hoja-trasladar.tsx`; `packages/db/scripts/sincronizar-cobertura{,-nucleo}.ts`; tests `titular-trasladar-db.test.ts`, `sincronizar-cobertura.test.ts`; e2e `puestos-trasladar-car207.spec.ts`. Modificados: `series-nucleo.ts` (`simular`), `doblaje.ts` (`cierres`), `titular-sincronizar.ts` (sin evento de anexo), `core/anexos/consumidor.ts` (solo `instalacionId`), `titulares-listar.ts`, `seccion-titular.tsx`, `vista-previa-titular.tsx`, `page.tsx` de puestos, etiquetas de auditoría, instantánea MCP e inventario.

## 6. Modelo de datos y migraciones
Sin migración. El backfill escribe solo `core.puestos.cobertura` y `cobertura_motivo`.

## 7. Capacidades
`pauta.titular.trasladar`: permiso `pauta:write`; **irreversible** (agentes piden aprobación; `dryRun`, `idempotencyKey`, auditoría); a otra instalación exige owner o admin (como `core.vinculos.*`). Reglas: persona activa con vínculo vigente, puesto destino activo con patrón y en alcance, «Rige desde» no anterior a hoy, no ya titular del destino, sin asignación futura en otro puesto, vínculo actual con jornada pactada.

## 8. Interfaz y responsive
Sheet del DS con puesto de destino (Combobox), «Rige desde», inicio de ciclo, motivo y vista previa (series que se cierran, vínculo, 14 días). Sin diseño aprobado: desvío reportado. Verificado a 375, 1024 y 1280 px. **Cambio visual: a Carlos (A2.10); OPAI 2.0 revisa la preview por su delegación del 6-nov 12:29.**

## 9. Seguridad y tenant
Todo por `ctx.db`/`ctx.transaccion`; persona y puestos con alcance en la consulta; otra empresa o fuera de alcance → «no encontrado». Orden de locks sin cambio (persona → puesto). El backfill trabaja un tenant por corrida y usa `dbAdmin()` solo como script (rol con BYPASSRLS), con compare-and-set por puesto.

## 10. Casos límite
Dos traslados simultáneos de la misma persona: una sola serie abierta y un vínculo apuntándole. Puesto de origen inactivo: su serie no se cierra. Vínculo que empieza después del día anterior: se rechaza. Vista previa sin doblaje falso con la serie que se cierra.

## 11. Plan por bloques
1. `core: pauta.titular.trasladar y simulación de series`. 2. `core: un cambio de puesto del vínculo no genera anexo`. 3. `operaciones: botón y hoja Trasladar`. 4. `db: backfill de cobertura de puestos`. 5. `docs: brief, adenda ADR-081 y ESTADO`.

## 12. Tests
`test:db`: misma instalación (sin anexo), otra instalación (vínculos, series, cobertura, borrador de anexo), vista previa sin escritura, reglas, permisos (viewer, supervisor), concurrencia, turnos esperados. Backfill: simula, aplica, idempotente, aislamiento. e2e: asignar → trasladar → destino. Paridad MCP e inventario.

## 13. Validación
`pnpm typecheck && pnpm lint && pnpm test && pnpm test:db && pnpm build && pnpm presupuesto`; e2e local; subagente revisor; revisión final (A2.2).

## 14. Criterios de aceptación
1. Trasladar deja, en una transacción, series, vínculo y cobertura coherentes y el historial con el autor. 2. Cambio solo de puesto: sin anexo; cambio de instalación: borrador. 3. Backfill con vista previa e idempotente. 4. `tools/list` trae `pauta_titular_trasladar` y su `preview_`.

## 15. Riesgos y rollback
Sin migración: revert del PR. El traslado a otra instalación termina un vínculo (irreversible por API; se corrige creando otro traslado). El backfill deja un respaldo JSON para revertir.

## 16. Reporte de ejecución
Se completa al cierre en el PR (gate, capturas, revisor, revisión final).
