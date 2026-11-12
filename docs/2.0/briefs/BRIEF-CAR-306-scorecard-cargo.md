# BRIEF CAR-306 · Desempeño: scorecard por cargo y resultado por persona

Sesión Desempeño · 11-nov-2026 · rama `brief/car-306-scorecard-cargo` (apilada sobre `brief/car-314-jefatura-cargo`, PR #528) · ADR-094 · alcance aprobado en `docs/2.0/diseño/alcance-desempeno.md`.

## 1. Objetivo

Que cada empresa defina, por cargo, **con qué indicadores mide la gestión, con qué meta y con qué peso**, y que OPAI entregue el **resultado de cada persona** (puntaje de 0 a 120) al que corresponde verlo: la persona, su jefatura y la gerencia.

## 2. Estado actual (verificado)

- `main` tiene el catálogo de indicadores (CAR-305, PR #525) con un indicador real: `core.tareas_a_tiempo`.
- La jefatura por cargo (CAR-314) está en el PR #528, esperando la migración. Este bloque se apila sobre esa rama porque usa `equipoDe`, `personaDelUsuario` y el índice único `(tenant_id, id)` de `core.cargos`.
- No existe el módulo Desempeño. No hay pantallas aprobadas más allá del mockup (`docs/2.0/design/export-desempeno/`).

## 3. Alcance

Entra: módulo `desempeno` (vendible aparte), tablas del scorecard con versiones por mes, reglas puras (validación, vigencia y puntaje), cinco capacidades con herramienta MCP y permisos propios.

No entra, y por qué:
- **Plantillas sugeridas por vertical.** Hoy el catálogo tiene un solo indicador; una plantilla de un indicador no aporta. Entran cuando Comercial, Personas y Operaciones publiquen los suyos (CAR-308 a 310), desde la configuración por vertical.
- **Cierre de período** (congelar el resultado del mes): CAR-322. Mientras tanto el resultado de un mes pasado se recalcula con los hechos actuales, pero siempre con el scorecard que regía ese mes.
- **Ranking visible para la persona.** El ajuste `personaVeRanking` se guarda, pero la vista de ranking para la propia persona llega con las pantallas (CAR-307).
- **Indicadores propios por empresa:** CAR-313. **Pantallas:** CAR-307.
- **Aviso a los trabajadores** sobre la medición con datos individuales (Ley 21.719): es un texto y un flujo de pantalla; se define con CAR-307 antes de encender el módulo en una empresa real.

## 4. Arquitectura

- `packages/domain/src/desempeno/`: `erroresDeScorecard`, `erroresParaPublicar`, `vigenciaDelCambio`, `versionVigente`, `puntajeDe`.
- `packages/capabilities/src/desempeno/`: capacidades (mismo patrón que Pauta o Nómina). `calculo.ts` mide un scorecard para un grupo de personas; `visibilidad.ts` decide a quién puede ver quien consulta.
- `modules/desempeno/manifest.ts`: permisos, eventos y capacidades. Sin navegación ni UI.
- **Versiones.** Cada guardado apunta a un mes de vigencia. El primer scorecard de un cargo rige desde el mes en curso; con una versión publicada ya vigente, el cambio rige desde el mes siguiente. Para un mes dado rige la última publicada con vigencia hasta ese mes.
- **Puntaje.** Promedio de los logros ponderado por peso, ×100. El logro viene del catálogo (tope 1,2), así que el puntaje va de 0 a 120. Un indicador sin hechos no cuenta como cero: queda fuera y `cobertura` informa cuánto peso sí tuvo datos.
- **Medición independiente de quien mira.** El resultado de una persona no puede cambiar según quién lo consulta, así que los indicadores se miden con un contexto sin los permisos ni el alcance del consultante (`contextoDeMedicion`, interno a `calculo.ts`). A quién puede ver cada uno se resuelve antes, en la capacidad.

## 5. Archivos

Nuevos: `packages/domain/src/desempeno/*`, `packages/capabilities/src/desempeno/*`, `modules/desempeno/*`, `packages/db/prisma/schema/desempeno.prisma`, `packages/db/prisma/migrations/20261126100000_desempeno_scorecards/migration.sql`, `packages/capabilities/test/desempeno-db.test.ts`.

Tocados: `packages/db/prisma/schema/core.prisma` (schema nuevo), `modules/registry/*`, `packages/capabilities/src/index.ts`, `packages/domain/src/{index,permisos-patrones}.ts`, instantáneas de paridad y de lecturas, etiquetas de auditoría.

## 6. Modelo de datos y migraciones (aditiva)

Schema nuevo `desempeno`, con sus GRANT para `opai_app`:

- `desempeno.scorecards`: una versión por `(tenant_id, cargo_id, vigente_desde)`; `estado` (`borrador` o `publicado`), `persona_ve_resultado`, `persona_ve_ranking`, `publicado_en`.
- `desempeno.scorecard_indicadores`: indicador del catálogo, `meta` (decimal), `peso` (1 a 100), `orden`.
- RLS + FORCE + `tenant_isolation` en ambas. FK compuesta por empresa hacia `core.cargos` y entre las dos tablas. CHECK de estado, formato del mes, meta > 0 y peso entre 1 y 100.
- Depende de `20261125100000_core_jefatura_cargo` (índice único de cargos): debe aplicarse después.

## 7. Capacidades

| Capacidad | Qué hace | Permiso |
| --- | --- | --- |
| `desempeno.scorecards.list` | Resumen por cargo activo: scorecard vigente y si hay cambios pendientes. | `desempeno:scorecards.read` |
| `desempeno.scorecards.get` | Scorecard vigente de un cargo en un mes y la versión pendiente. | `desempeno:scorecards.read` |
| `desempeno.scorecards.guardar` | Guarda como borrador o publica (pesos = 100). Con vista previa. | `desempeno:scorecards.manage` |
| `desempeno.resultados.ver_persona` | Puntaje y detalle por indicador de una persona en un mes. Lectura auditada. | `desempeno:resultados.ver` |
| `desempeno.resultados.ver_cargo` | Puntaje de las personas visibles de un cargo, de a 200. Lectura auditada. | `desempeno:resultados.ver` |

Permisos por rol: owner y admin, todo. Gerente: todo menos configurar (`scorecards.manage`). Supervisor: ver scorecards y resultados (propio y equipo). Viewer: ver scorecards y su resultado. `desempeno:resultados.ver_todos` (owner, admin, gerente) permite ver a cualquier persona.

## 8. Interfaz y responsive

Sin pantallas. Todo se opera por MCP o API hasta CAR-307.

## 9. Seguridad y tenant

- Todo por `ctx.db` y `ctx.transaccion`; sin SQL crudo.
- **Quién ve a quién:** con `ver_todos`, a todos; si no, a sí mismo (si el scorecard lo permite) y a las personas a su cargo según la jefatura. El alcance por filas (ADR-022) se aplica siempre y nada lo amplía (decisión de Carlos, 11-nov 22:28).
- Una persona fuera de lo visible, de otra empresa o anonimizada responde `NOT_FOUND`, igual que inexistente.
- `contextoDeMedicion` eleva permisos **solo** para llamar a `medir` de los indicadores, después de decidir la visibilidad; no sale de `calculo.ts` ni se usa para leer filas hacia la respuesta.
- **Agentes:** publicar un scorecard pide aprobación humana a un agente (`APPROVAL_REQUIRED`, ADR-094 §6); guardar un borrador es su forma de proponer. Una key de servicio no hereda la ficha ni el equipo de su responsable.
- El resultado muestra el valor de cada indicador aunque quien mira no tenga el permiso del módulo dueño de esos hechos (por ejemplo, un supervisor sin acceso a Comercial ve el porcentaje de su gente): es la consecuencia buscada de que el resultado no dependa de quién mira. `medir` es solo lectura por contrato.
- Lecturas de resultados auditadas con los ids de persona, sin valores. Las escrituras quedan en la auditoría y emiten `desempeno.scorecard.guardado` o `.publicado`.

## 10. Casos límite

- Publicar con pesos que no suman 100, con un indicador que no es del catálogo de la empresa, o con meta de porcentaje sobre 100: rechazado con el motivo.
- Guardar dos veces en el mismo mes antes de que rija: reemplaza la versión pendiente; solo queda un borrador por cargo. Un borrador no puede pisar una versión ya publicada que aún no rige: hay que publicar el cambio.
- Dos guardados simultáneos: el segundo revalida el mes de vigencia dentro de la transacción y, si cambió, responde conflicto.
- **Solo período mensual.** ADR-094 habla de configurar el período; esta versión mide por mes. Otros períodos se evalúan con el cierre (CAR-322).
- **Meses pasados usan el cargo y la jefatura de hoy**, no los que la persona tenía ese mes. Se corrige con el cierre de período (CAR-322).
- Indicador cuyo módulo se apagó después: aparece como no disponible y no entra en el puntaje.
- Persona sin usuario vinculado: sin dato en los indicadores atribuidos al usuario (no cero).
- Persona sin vínculo vigente o cargo sin scorecard ese mes: resultado vacío, sin error.
- Cargo inactivo: no admite guardar.

## 11. Plan por bloques

1. `desempeno:` esquema y migración.
2. `desempeno:` reglas puras con tests.
3. `desempeno:` capacidades, manifiesto, permisos por rol, paridad, etiquetas y test de base.
4. `docs:` brief, ADR y `ESTADO.md`.

## 12. Tests

- Dominio (6): validación de borrador y de publicación, vigencia del cambio, versión vigente por mes, puntaje y cobertura.
- Base real (6, incluye despublicación rechazada, resultado propio oculto y lista de pendientes): borrador, publicación y auditoría; resultado por persona y por cargo; cambio de meta que rige el mes siguiente sin alterar el actual; jefatura, persona y rol sin permiso de configurar; otra empresa y FK entre empresas.

## 13. Validación

Gate completo local y CI. Sin cambio visual. Migración por el bot «OPAI 2.0», después de la de CAR-314.

## 14. Criterios de aceptación

- Dos empresas con cargos e indicadores distintos, sin cruce de datos.
- Cambiar una meta no altera el mes en curso.
- Todo se puede hacer por MCP.
- La jefatura ve solo a su gente; la persona, el suyo.

## 15. Riesgos y rollback

- Migración aditiva en un schema nuevo: revertir es borrar el schema (sección «Reversión»).
- El módulo nace apagado para toda empresa: nada cambia hasta activarlo.
- `ver_cargo` hace una medición por indicador para la página de 200 personas; con muchos indicadores y cargos grandes conviene el cierre de período (CAR-322).
- Mientras no exista el cierre, corregir un hecho de un mes pasado cambia el resultado de ese mes.

## 16. Reporte de ejecución

Se completa en el PR.
