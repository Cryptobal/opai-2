# BRIEF — CAR-206 · Asignar titular desde la ficha del puesto

Encargo de Carlos del 6-nov-2026 (sesión «Operaciones · Puestos · Code»). Rama `brief/car-206-asignar-titular`. Referencias: `referencias/flujo-puestos.md` (paso 5), BRIEF-11 (Puestos), BRIEF-11b (Pauta), ADR-048 (series), ADR-022 (alcance), ADR-055 (agent-first), ADR-078 (turnos esperados) y la adenda ADR-081 (orden de trabajo Personas → Instalaciones › Puestos → Pauta). Los siguientes encargos de la sesión, CAR-96 (turnos extra) y CAR-207 (traslados), van en PRs aparte y **no** están en este.

## 1. Objetivo
Que los puestos se creen y los guardias se asignen en **Instalaciones › Puestos**, sin ir a la Pauta: desde la ficha del puesto se elige el guardia, desde cuándo rige y el inicio de ciclo, se ve una vista previa y se confirma. Quitar al titular deja el puesto PPC «sin titular». La Pauta solo muestra el resultado (y sigue pudiendo fijar series).

## 2. Estado actual (verificado en `main` 95d9351, 6-nov-2026)
- `pauta.series.fijar` cierra la serie anterior el día antes de «desde», valida «no doblar» (A9), exige que el titular tenga un vínculo vigente en la instalación y rechaza una fecha anterior a hoy si el puesto ya tenía serie (R11). Bloquea primero a la persona (`pg_advisory_xact_lock`) y luego el puesto (`FOR UPDATE`).
- `core.puestos` tiene `patronId` opcional y `cobertura`/`coberturaMotivo` (nacen `ppc`/`sin_asignar`); **nadie los pasaba a «cubierto»**: la lista de puestos nunca mostraba «Cubierto».
- `core.vinculos_laborales.puesto_id` existe y lo cambia `core.vinculos.update` (que emite `core.vinculo.actualizado` y genera el borrador de anexo, R11).
- `core.turnos` escucha `pauta.serie.fijada` y mantiene `core.turnos_esperados` (ADR-078).
- La hoja del puesto (`hoja-puesto.tsx`) solo crea y edita; no asigna.
- La bitácora de la Pauta (`pauta.historial`) **ya guarda al autor** (`actor_tipo`, `actor_id`, nombre en `detalle.actorNombre`): no hizo falta agregarlo.

## 3. Alcance
1. Acción **Asignar / Cambiar titular** y **Quitar titular** en la ficha del puesto, con vista previa (`dryRun`): serie que se cierra, primeros 14 días y choques de «no doblar». Si el puesto no tiene patrón, la acción se deshabilita y se pide el patrón.
2. Capacidad **`pauta.titular.asignar`** (con `preview_`), que reutiliza la lógica de `pauta.series.fijar` extraída a `fijarSerieInterna` (sin `executeCapability` anidado) y, **en la misma transacción**: fija la serie, pone el `puestoId` en el vínculo del nuevo titular, deja en null el de quien salía, pasa el puesto a «cubierto» o PPC, registra la bitácora con el autor y emite `pauta.serie.fijada`.
3. **Historial de titulares** en la ficha, armado con `pauta.series` y la bitácora (`pauta.titulares.listar`, lectura). Sin tabla nueva.
4. Paridad MCP: `pauta_titular_asignar`, `preview_pauta_titular_asignar` y `pauta_titulares_listar`; instantánea de herramientas e inventario actualizados.

**Fuera de alcance:** traslados entre puestos o instalaciones (CAR-207), turnos extra (CAR-96), columna «Dotación N de M», anexos de contrato (el existente sigue funcionando, ver §9).

## 4. Arquitectura
- `packages/capabilities/src/pauta/series-nucleo.ts`: `fijarSerieInterna(ctx, input, { dryRun, validar?, enTransaccion?, detalle? })`. Es la lógica de antes de `series.ts` sin cambiar su comportamiento; añade ganchos para sumar reglas y escrituras a la misma transacción y guarda el `serieId` en la línea del historial. **Esta función es la que CAR-207 reutiliza** (con su propio `validar`, sin la regla «ya es titular en otro puesto»).
- `titular-asignar.ts`: arma la entrada (patrón del puesto o el de la serie al quitar), pone los ganchos y calcula la vista previa (`trabajaEn` del dominio). El orden de locks no cambia: persona → puesto → fila de la persona (`bloquearNoAnonimizado`) → vínculos.
- `titulares-listar.ts`: series del puesto (hasta 50) + bitácora (por `serieId`; las líneas anteriores se emparejan por la fecha de inicio) + candidatos (`candidatos.ts`, el mismo criterio que usa la Pauta para sugerir).
- UI: `seccion-titular.tsx` (en la ficha), `hoja-titular.tsx` (Sheet diferido por `?titular=<puesto>[&quitar=1]`), `vista-previa-titular.tsx`, `estado-puesto.tsx` (extraído de la hoja del puesto para respetar el límite de líneas). La página de puestos carga los titulares solo del puesto abierto.

## 5. Archivos
Nuevos: `packages/capabilities/src/pauta/{series-nucleo,titular-asignar,titulares-listar,candidatos}.ts`; `apps/web/app/(erp)/instalaciones/_componentes/{seccion-titular,hoja-titular,vista-previa-titular,estado-puesto}.tsx` y `titular-tipos.ts`; tests `titular-asignar{,-db}.test.ts` y `e2e/puestos-titular-car206.spec.ts`.
Modificados: `pauta/series.ts` (delgado), `pauta/index.ts`, `pauta/comun.ts` (`patronId` en `puestoParaPauta`), `pauta/lectura-mes.ts` (usa `candidatosDeInstalacion`), `hoja-puesto.tsx`, `diferidas.ts`, `instalaciones/[id]/puestos/page.tsx`, `seed-pauta-e2e.ts`, la instantánea MCP y `paridad/mcp-inventario.md`.

## 6. Modelo de datos y migraciones
**Sin migración.** No hay tablas ni columnas nuevas: se escribe en `pauta.series`, `pauta.historial`, `core.vinculos_laborales.puesto_id` y `core.puestos.cobertura`. El PR no lleva `migracion-pendiente`.

## 7. Capacidades
| Capacidad | Permiso | Efecto | Notas |
|---|---|---|---|
| `pauta.titular.asignar` | `pauta:write` | escritura, `dryRun`, `idempotencyKey`, auditoría | `titularPersonaId` null = quitar. `inicioCiclo` obligatorio al asignar; al quitar se conserva el de la serie. Devuelve serie, serie que se cierra, titular anterior y 14 días. |
| `pauta.titulares.listar` | `pauta:read` | lectura auditada por IDs | Titular de hoy, historial (desde/hasta, quién, cuándo) y candidatos con vínculo vigente en la instalación. |

## 8. Interfaz y responsive
Sin diseño aprobado para «Asignar»: se usa el patrón **Sheet** del DS con los campos de la hoja de serie de la Pauta (Select/Combobox, `InputFecha`, `Alerta`, `Timeline`) y la hoja del puesto de `export-puestos` como base. **Se reporta como desvío**: la vista de 14 días (verde = turno) y la ubicación del bloque «Titular» al tope de la ficha son propuestas de esta sesión. Verificado a 375, 1024 y 1280 px; foco, estados vacío y de error, y sin desborde horizontal. **Cambio visual: va a Carlos antes de integrar (A2.10).**

## 9. Seguridad y tenant
- Tenant de la sesión; todo por `ctx.db`/`ctx.transaccion` (RLS). Guardia sin vínculo vigente en la instalación o de otra empresa: «no encontrado». Puesto fuera de alcance del supervisor: «no encontrado» (ADR-022). El historial no copia personas ni texto libre.
- **Decisión propia (confirmar):** `pauta.titular.asignar` rechaza a un guardia que ya es titular de **otro puesto** con serie abierta o futura («quítalo de ahí primero o usa el traslado»), porque el vínculo tiene un solo `puestoId` y dejar dos series sin reflejo en el vínculo rompería la consistencia. `pauta.series.fijar` no lo exige y sigue igual. «No doblar» se evalúa antes y da el detalle del cruce.
- **Anexos de contrato:** cambiar `puestoId` del vínculo emite `core.vinculo.actualizado` (igual que `core.vinculos.update`), así que el consumidor de anexos puede generar un **borrador** para RR. HH. (R11: el puesto puede mover la capa de sueldo). Es el comportamiento vigente del núcleo; no se suprime.
- El `puestoId` del vínculo y la cobertura del puesto se actualizan al dar la orden, aunque «Rige desde» sea futuro; la Pauta y los turnos esperados siempre respetan la fecha.

## 10. Casos límite
Titular que dobla con otro puesto → error con detalle. «Rige desde» anterior a hoy con serie previa → se rechaza (R11). Dos asignaciones simultáneas al mismo puesto → los locks las serializan: queda una serie abierta y un vínculo apuntándole. Puesto inactivo → «no encontrado». Sin patrón → regla de negocio. Quitar en el mismo día en que se asignó → la serie de ese día se reemplaza. Quitar sin titular → «el puesto ya está sin titular».

## 11. Plan por bloques
1. `core: extrae fijarSerieInterna de pauta.series.fijar`. 2. `core: pauta.titular.asignar y pauta.titulares.listar`. 3. `core: paridad MCP`. 4. `operaciones: ficha del puesto con titular, hoja de asignar e historial`. 5. `docs: brief, ADR-081 y ESTADO`.

## 12. Tests
Unitario del contrato (permiso, `dryRun`, entrada). `test:db` (`titular-asignar-db.test.ts`, 10 casos): vista previa sin escritura; asignar (serie, vínculo, cobertura, bitácora, evento y `core.turnos_esperados` tras despachar el outbox); cambiar y quitar; reglas y errores; doblar; concurrencia; viewer, aislamiento entre dos empresas y auditoría. e2e `puestos-titular-car206.spec.ts`: crear puesto → asignar → la pauta pinta «Cubierto» hoy → historial → quitar. Más `pauta-db`, paridad y el gate completo.

## 13. Validación
`pnpm typecheck && pnpm lint && pnpm test && pnpm test:db && pnpm build && pnpm presupuesto`; e2e local a 375/1024/1280; subagente revisor sin contexto; revisión final del head (A2.2).

## 14. Criterios de aceptación
1. Asignar con vista previa no escribe; la real deja la serie, el vínculo, la cobertura, la bitácora con el autor y el evento en una sola transacción.
2. Quitar deja el puesto PPC y suelta el vínculo. 3. Rige el R11 y «no doblar». 4. Un guardia sin vínculo en la instalación no aparece y por API responde «no encontrado». 5. `core.turnos_esperados` queda consistente. 6. `tools/list` trae las tres herramientas. 7. Carlos aprueba lo visual.

## 15. Riesgos y rollback
Sin migración: se revierte con el revert del PR (los datos escritos son datos válidos de Pauta). Riesgo: borradores de anexo adicionales por el cambio de `puestoId` (§9). Riesgo: vínculo y cobertura se anticipan a un «Rige desde» futuro (§9).

## 16. Reporte de ejecución
Se completa al cierre en el PR: resultado del gate, capturas a 375/1024/1280, hallazgos del subagente revisor y la revisión final con SHA.
