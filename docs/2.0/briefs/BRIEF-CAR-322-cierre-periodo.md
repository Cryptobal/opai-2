# BRIEF CAR-322 · Desempeño: cierre de período

[Sesión Desempeño] · ADR-094 (adenda CAR-322) · rama `brief/car-322-cierre-periodo`, apilada sobre la segunda entrega de pantallas (PR #560).

## 1. Objetivo
Que el resultado de un mes pasado quede fijo. Hoy cada consulta lo recalcula con los hechos actuales: si se corrige una tarea, se reasigna un negocio o la persona cambia de cargo, el puntaje de un mes ya terminado cambia.

## 2. Estado actual (verificado)
`desempeno.resultados.ver_persona` y `.ver_cargo` calculan siempre en vivo (`calculo.ts`) con el vínculo vigente de hoy. No hay tablas de cierre ni trabajo diario de Desempeño.

## 3. Alcance
Entra: cerrar un mes (a mano o automático), guardar el resultado de cada persona con su cargo, jefatura y versión del scorecard, leer un mes cerrado desde lo guardado, lista de meses cerrados, ajuste del día de cierre, borrado del resultado guardado al anonimizar.
No entra (queda en CAR-322 como pendiente): guardar el responsable de un negocio al ganarse (depende de la decisión pendiente de Carlos en #541), períodos distintos del mensual, medir en base en vez de en memoria para cargos grandes, pantalla para cerrar el mes (hoy por MCP y API).

## 4. Arquitectura
`cierre-calculo.ts` arma el resultado con el mismo cálculo que el mes abierto (`resultadosDe`). `cierre.ts` lo guarda en una transacción con su evento. `cierre-lectura.ts` lee lo guardado; las capacidades de resultados lo usan cuando el mes está cerrado. El trabajo diario solo encola y decide si toca cerrar (ADR-029).

## 5. Archivos
- Migración `20261203100000_desempeno_cierre_periodo`, `packages/db/prisma/schema/desempeno.prisma`.
- `packages/capabilities/src/desempeno/{cierre,cierre-calculo,cierre-lectura,ajustes,resultados,resultados-cargo,resultados-cargo-cerrado,index}.ts`.
- `core/cumplimiento/retencion-anonimizar.ts`, `modules/desempeno/manifest.ts`, `apps/web/lib/registro.ts`.
- Test `packages/capabilities/test/desempeno-cierre-db.test.ts`.

## 6. Modelo de datos y migraciones
Aditiva: `desempeno.periodos_cerrados` (único por empresa y mes) y `desempeno.resultados_cerrados` (único por empresa, mes y persona; FK compuestas a persona, cargo, versión del scorecard y mes cerrado). RLS + FORCE + `tenant_isolation`. `opai_app` no puede actualizar ninguna de las dos ni borrar meses; sí borrar resultados, solo para anonimizar.

## 7. Capacidades
- `desempeno.periodos.cerrar` (escritura, `dryRun`, siempre pide aprobación a un agente, permiso `desempeno:scorecards.manage`).
- `desempeno.periodos.list` (lectura, sin datos de personas).
- `ver_persona` y `ver_cargo` devuelven `cerrado` y, si el mes está cerrado, lo guardado.
- Trabajo diario `desempeno.periodos.cerrar_automatico` y ajuste `dia_cierre` (1 a 28, por defecto 5).

## 8. Interfaz y responsive
Sin pantalla nueva en este bloque; las pantallas de resultados ya leen la salida de las capacidades.

## 9. Seguridad y tenant
Todo por `ctx.db` con RLS. El cálculo del cierre mide sin el alcance de quien cierra (igual que hoy el resultado no depende de quién mira). Quién ve qué en un mes cerrado lo decide la visibilidad de siempre. El resultado guardado no entra a la auditoría (solo ids, como toda lectura auditada).

## 10. Casos límite
Mes en curso o futuro (rechazo); mes ya cerrado (conflicto, también en carrera); empresa sin scorecards (cierra con 0 personas); persona que cambió de cargo dentro del mes; persona anonimizada (su resultado se borra); módulo apagado (el trabajo no hace nada).

## 11. Plan por bloques
1. Migración, capacidades, trabajo, pruebas y documentación (un commit).

## 12. Tests
`desempeno-cierre-db.test.ts`: vista previa sin escribir, rechazo del mes en curso, cierre con auditoría, conflicto al repetir, mes cerrado que no cambia con hechos ni cambio de cargo, cierre automático por día y aislamiento entre empresas. Más paridad, RLS e integridad de FK.

## 13. Validación
Gate local completo y pruebas de base.

## 14. Criterios de aceptación
- Un mes cerrado no cambia aunque se corrija un hecho o la persona cambie de cargo.
- No se cierra un mes en curso ni se cierra dos veces.
- Si nadie lo cierra, OPAI lo cierra el día configurado.
- Una empresa no ve ni cierra los meses de otra.

## 15. Riesgos y rollback
La migración es aditiva; revertir el código deja las tablas sin uso. Riesgo: medir un mes con muchos cargos y personas en memoria puede tardar (pendiente de medir en base).

## 16. Reporte de ejecución
Ver el PR.
