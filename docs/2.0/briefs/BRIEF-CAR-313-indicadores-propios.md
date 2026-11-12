# BRIEF CAR-313 · Desempeño: indicadores propios de cada empresa

Sesión Desempeño · 12-nov-2026 · rama `brief/car-313-indicadores-propios` (apilada sobre `brief/car-306-scorecard-cargo`, PR #537) · ADR-094 §8 · alcance aprobado (`docs/2.0/diseño/alcance-desempeno.md`: «la primera versión trae el catálogo y los indicadores propios»).

## 1. Objetivo

Que una empresa pueda medir algo que el catálogo no trae, **sin pedir código**: arma su indicador sobre hechos que OPAI ya registra, lo comprueba con datos reales y lo usa en el scorecard de un cargo.

## 2. Estado actual (verificado)

- El catálogo (CAR-305) solo conoce indicadores escritos en código por cada módulo.
- El scorecard (CAR-306, PR #537) acepta solo ids del catálogo.
- No existe la noción de «hecho» que un módulo ofrece. Los informes de Comercial y el indicador de tareas leen sus tablas directamente.

## 3. Alcance

Entra:
- **Hechos**: cada módulo declara en su manifiesto (`hechos`) qué ocurrió, a quién se atribuye, qué montos se pueden sumar y por qué atributos se puede filtrar. Lo no declarado no se puede usar.
- **Cuatro formas de cálculo**: contar un hecho, sumar un monto, tiempo promedio entre dos hechos de la misma entidad, y porcentaje de un hecho sobre otro. Con filtros por los atributos declarados.
- **Definición versionada** por mes, evaluada en dominio puro (ADR-021).
- **Vista previa obligatoria** con los datos reales del mes en curso en cada guardado.
- Uso en el scorecard con el id `propio.<id>`.
- Hechos iniciales: `core.tarea_completada`; de Comercial, `negocio_ganado`, `negocio_perdido`, `solicitud_recibida`, `solicitud_atendida` y `solicitud_convertida`.

No entra: pedir el indicador al agente «con palabras propias» (el agente ya puede armar el borrador con estas capacidades; el flujo en el hilo es de CAR-312); pantallas (CAR-307); hechos de Personas, Operaciones y Asistencia (cuando publiquen, CAR-309 a 311); filtros por rangos de monto o fechas (solo por atributos declarados).

## 4. Arquitectura

- `packages/domain/src/desempeno/propios.ts`: tipos de la definición, `erroresDePropio`, `unidadDePropio`, `evaluarPropio`. Puro y con tests.
- `packages/capabilities/src/hechos-gestion.ts`: `defineHecho` y el tipo `HechoGestion` (declaración + `permiso` + `listar(ctx, rango)`). `defineModule` valida los hechos del manifiesto.
- `core/indicadores-gestion/hechos.ts`: hechos del Núcleo y `hechosDeLaEmpresa(ctx)` (núcleo + módulos activos).
- `desempeno/propios-*.ts`: capacidades. `propios-indicadores.ts` convierte cada indicador propio publicado en un indicador con la misma forma que los del catálogo, así el scorecard y el cálculo no distinguen su origen.
- Emparejamiento de la forma «tiempo»: por la entidad (`clave`); el hecho de inicio se busca hasta 180 días antes del mes medido, y el tiempo se atribuye a quien cierra.

## 5. Archivos

Nuevos: `packages/domain/src/desempeno/propios.ts` y su test; `packages/capabilities/src/hechos-gestion.ts`; `core/indicadores-gestion/hechos.ts`; `comercial/hechos-gestion.ts`; `desempeno/propios-{comun,lectura,guardar,archivar,indicadores}.ts`; migración `20261202100000_desempeno_indicadores_propios`; `packages/capabilities/test/desempeno-propios-db.test.ts`.

Tocados: `module.ts` (`hechos` en el manifiesto), `desempeno/{calculo,scorecards-guardar,index}.ts`, manifiestos de Desempeño y Comercial, `desempeno.prisma`, siembra de dos empresas, instantáneas y etiquetas.

## 6. Modelo de datos y migraciones (aditiva)

En el schema `desempeno`:
- `indicadores_propios`: nombre (único por empresa entre los no archivados), descripción y `archivado_en`. La app no puede borrarlos (REVOKE DELETE): se archivan.
- `indicador_propio_versiones`: `vigente_desde`, estado, `definicion` (JSONB), unidad, **sentido y meta sugerida** (van en la versión porque cambian el logro: un borrador no puede alterar un indicador publicado).
- RLS + FORCE + `tenant_isolation`, FK compuesta por empresa, CHECK de sentido, meta, estado y mes.
- Va después de `20261126100000_desempeno_scorecards` (usa su schema).

## 7. Capacidades

| Capacidad | Qué hace | Permiso |
| --- | --- | --- |
| `desempeno.hechos.list` | Hechos disponibles, con montos, atributos y si quien consulta puede usarlos | `desempeno:scorecards.read` |
| `desempeno.propios.list` | Indicadores propios de la empresa | `desempeno:scorecards.read` |
| `desempeno.propios.guardar` | Crea o cambia uno; siempre devuelve la vista previa con datos reales. Con vista previa (`dryRun`) no guarda | `desempeno:scorecards.manage` y el permiso del módulo dueño de cada hecho |
| `desempeno.propios.archivar` | Lo archiva si no está en un scorecard publicado | `desempeno:scorecards.manage` |

## 8. Interfaz

Sin pantallas (CAR-307).

## 9. Seguridad y tenant

- Todo por `ctx.db`; los hechos leen con RLS de la empresa.
- Para armar un indicador hace falta el permiso del módulo dueño de cada hecho y, con una API key, que ese módulo esté en su scope: Desempeño no abre datos de Comercial a quien no puede leerlos. Quien tiene alcance por filas no puede armar indicadores.
- La vista previa es agregada (cuántos sujetos, mínimo, máximo y promedio) y con menos de tres sujetos solo dice cuántos son: no se puede leer por ahí el valor de una persona.
- Publicar y archivar piden aprobación humana a un agente. Las escrituras quedan en la auditoría con sus eventos.
- La definición guardada se valida con el mismo esquema al leerla; una fila ilegible se ignora.

## 10. Casos límite

- Hecho de un módulo que se apagó después: el indicador deja de estar disponible para scorecards nuevos y, en los existentes, aparece como no disponible.
- Hechos de sujetos distintos (usuario y Persona), de entidades distintas en «tiempo», o el mismo hecho como inicio y cierre: rechazado.
- Un borrador sobre un indicador publicado no cambia su nombre, su sentido ni su meta hasta publicarse.
- El hecho «tarea completada» cuenta todas las tareas hechas (una sin vencimiento cuenta como a tiempo) y no excluye las ligadas a negocios, a diferencia del indicador `core.tareas_a_tiempo`.
- `desempeno.propios.list` muestra la versión vigente; el borrador pendiente de un indicador publicado todavía no se puede releer (queda para las pantallas, CAR-307).
- Cierre sin inicio conocido en los 180 días previos: no se mide (no cuenta como cero).
- Meta sobre 100 con resultado en porcentaje: rechazada.
- Cambiar un indicador publicado: rige desde el mes siguiente. Un borrador no pisa una versión publicada que aún no rige.
- Archivar un indicador en uso: rechazado, con cuántos cargos lo usan. Uno archivado sigue midiéndose en los meses en que estuvo en un scorecard.
- Mismo nombre que otro vigente (sin distinguir mayúsculas): conflicto.

## 11. Plan por bloques

1. `desempeno:` reglas puras de indicadores propios.
2. `core:` hechos en el manifiesto, hechos del Núcleo y de Comercial.
3. `desempeno:` tablas, capacidades, uso en el scorecard, paridad y test de base.
4. `docs:` brief, ADR y `ESTADO.md`.

## 12. Tests

- Dominio (5, con el rechazo del mismo hecho como inicio y cierre): validación de las cuatro formas y sus rechazos; contar, sumar con filtro, porcentaje y tiempo.
- Base real (6): hechos por módulos activos; vista previa con datos reales sin guardar y publicación; rechazos; tiempo con inicio en el mes anterior; uso en un scorecard con resultado, borrador que no altera lo publicado, módulo apagado y archivado en uso; otra empresa.

## 13. Validación

Gate local y CI. Sin cambio visual. Migración por el bot, después de las de CAR-314 y CAR-306.

## 14. Criterios de aceptación

- Una empresa arma un indicador con cada una de las cuatro formas sin tocar código.
- La vista previa muestra datos reales antes de publicar.
- El indicador publicado se usa en un scorecard y da resultado.
- Queda solo para esa empresa.

## 15. Riesgos y rollback

- Una fórmula mal armada da un número sin sentido: por eso las formas acotadas, la vista previa y el versionado.
- Los hechos se leen completos del período y se agrupan en memoria; con volúmenes grandes conviene agregarlos en la base (se revisa con el cierre de período, CAR-322).
- Migración aditiva: revertir es borrar las dos tablas.

## 16. Reporte de ejecución

Se completa en el PR.
