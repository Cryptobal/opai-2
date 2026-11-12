# BRIEF CAR-314 · Jefatura por cargo y personas a cargo

Sesión Desempeño · 11-nov-2026 · rama `brief/car-314-jefatura-cargo` · ADR-094 (puntos 9 y 10 y adenda de las 17:10) · alcance aprobado en `docs/2.0/diseño/alcance-desempeno.md`.

## 1. Objetivo

Que cada empresa defina **a qué cargo reporta cada cargo** y **a quiénes ve cada jefe**, y que OPAI pueda responder «¿quiénes están a cargo de esta persona?». Es lo que Desempeño usará para decidir quién ve el resultado de quién (CAR-306), y queda disponible para aprobaciones o tickets.

## 2. Estado actual (verificado en `main` `5384ac7`)

- Ningún cargo ni persona guarda a quién reporta. Solo existe el alcance por instalaciones del supervisor (ADR-022).
- **Corrección de un hallazgo anterior.** El ADR-094 y la tarea CAR-314 decían que un usuario no está unido a su ficha de Persona. **No es así:** la unión ya existe (`core.personas.usuario_id`, 1 a 1 por empresa, con índice único y la capacidad `core.personas.vincular_usuario`). Lo que no existe es el uso de esa unión en Comercial (el responsable de un negocio es un usuario). Por lo tanto **este bloque no crea la unión**: la usa. Se corrige el texto en `01-decisiones.md` y en la hoja de alcance.
- No hay pantalla aprobada para esto fuera del mockup de Desempeño («Quién ve los resultados»), que se construye en CAR-307.

## 3. Alcance

Entra: jefatura en el cargo, jefe directo en la persona, regla pura de «personas a cargo», tres capacidades con herramienta MCP y una migración aditiva.

No entra: pantallas (CAR-307); que el resultado de Desempeño se filtre por jefatura (CAR-306, que consume `equipoDe`); vincular automáticamente usuarios con Personas (ya existe la capacidad; la carga es operación de cada empresa).

## 4. Arquitectura

- `packages/domain/src/jefatura/`: `cierraCiclo`, `esJefeDirecto`, `personasACargo`. Puro y con tests.
- `packages/capabilities/src/core/jefatura/`: `datos.ts` (`equipoDe(ctx, personaId)` y `personaDelUsuario(ctx)`, exportados para otros módulos) y las tres capacidades.
- Regla: una persona P está **directamente** a cargo de un jefe J si el cargo de P reporta al cargo de J y, según el modo del cargo de P: `equipo` (siempre), `asignadas` (P tiene a J como jefe directo) o `instalaciones` (la instalación del vínculo de P está entre las que J tiene a cargo, ADR-022). El equipo de J son sus directas y, hacia abajo, las de cada una (el jefe del jefe ve toda su línea). **Nadie queda invisible:** si a una persona no la tiene nadie directamente (sin jefe asignado, o en una instalación que nadie tiene a cargo), sube por la cadena de cargos hasta el primer nivel que se ve por equipo completo y la ven los jefes de ese nivel.

## 5. Archivos

Nuevos: `packages/domain/src/jefatura/*`, `packages/capabilities/src/core/jefatura/*`, `packages/capabilities/test/jefatura-db.test.ts`, `packages/db/prisma/migrations/20261123100000_core_jefatura_cargo/migration.sql`.

Tocados: `core/cumplimiento/retencion-anonimizar.ts` (limpia la jefatura), `packages/db/prisma/schema/maestros.prisma`, `core/maestros/cargos-vista.ts` (la ficha del cargo muestra su jefatura), `core/index.ts`, `src/index.ts`, `domain/src/index.ts`, instantáneas de paridad y etiquetas de auditoría.

## 6. Modelo de datos y migraciones (aditiva)

- `core.cargos.jefatura_cargo_id` (uuid, opcional) y `core.cargos.jefatura_ve` (`asignadas` por defecto, `equipo`, `instalaciones`; con CHECK).
- `core.personas.jefe_persona_id` (uuid, opcional).
- FK compuestas por empresa (`tenant_id` + id): la jefatura y el jefe son siempre de la misma empresa, aunque alguien salte la capacidad. Para sostenerlas se crean los índices únicos `(tenant_id, id)` en `cargos` y `personas`.
- CHECK: un cargo no es su propia jefatura; una persona no es su propio jefe.
- Sin tablas nuevas: las dos ya tienen RLS + FORCE + `tenant_isolation`. Sin migración de datos. `lock_timeout` de 5 s; los `ALTER TABLE` van primero para tomar de entrada el bloqueo fuerte; los dos índices únicos se crean sobre tablas chicas (cargos: decenas; personas: miles).

## 7. Capacidades

| Capacidad | Qué hace | Permiso |
| --- | --- | --- |
| `core.cargos.set_jefatura` | Define a qué cargo reporta un cargo y cómo lo ven sus jefes. Rechaza ciclos y cargos inactivos. Con vista previa. | `core:estructuras.manage` |
| `core.personas.asignar_jefe` | Asigna (o quita) el jefe directo de hasta 200 personas. El jefe debe tener hoy el cargo que es jefatura del cargo de cada una. Con vista previa. | `core:personas.manage` |
| `core.personas.list_a_cargo` | Lista las personas a cargo de un jefe (directas y por su línea), de a 200. Sin indicar a quién, responde por quien consulta. Lectura auditada. | `core:personas.read` |

`core.cargos.list` y `core.cargos.get` devuelven además `jefaturaCargoId` y `jefaturaVe`.

## 8. Interfaz y responsive

Sin pantallas. Se configura hoy por MCP o API; la pantalla «Quién ve los resultados» llega con CAR-307.

## 9. Seguridad y tenant

- Todo por `ctx.db`; sin SQL crudo. Las escrituras quedan en la auditoría y emiten `core.cargo.actualizado` o `core.persona.actualizada` en la misma transacción.
- `asignar_jefe` aplica el alcance por filas a las personas (`dondePersona`): fuera de alcance responde igual que inexistente.
- `list_a_cargo`: con alcance por filas solo se puede consultar el equipo propio, y **la jefatura nunca amplía ese alcance** (ADR-022): de su equipo ve solo a quienes ya puede ver como persona. Se auditan los ids de la página entregada.
- `asignar_jefe` rechaza personas anonimizadas y toma el mismo bloqueo de fila que la anonimización. Anonimizar a una persona borra su jefe y la quita como jefa de otros (Ley 21.719).
- La base impide referencias entre empresas (FK compuestas), probado.

## 10. Casos límite

- Jefe sin vínculo vigente o cargo sin nadie que le reporte: equipo vacío.
- Persona con jefe asignado cuyo cargo ya no es la jefatura (cambió la jefatura del cargo o el jefe cambió de cargo): la asignación se ignora, no rompe nada.
- Persona inactiva: no aparece en el equipo ni hace de jefe; su gente sube al nivel de arriba.
- Dos llamadas simultáneas que cruzan jefaturas (A→B y B→A) podrían cerrar un ciclo: la regla lo tolera sin colgarse y se corrige con otra llamada.
- Ciclo en los datos (no debería existir): la regla no se cuelga.
- Usuario sin ficha de Persona vinculada: `a_cargo` responde vacío con `jefePersonaId: null`.

## 11. Plan por bloques

1. `core:` migración y esquema de jefatura.
2. `core:` reglas de jefatura en el dominio, con tests.
3. `core:` capacidades de jefatura, paridad, etiquetas y test de base.
4. `docs:` brief, corrección del hallazgo en ADR-094 y hoja de alcance, `ESTADO.md`.

## 12. Tests

- Dominio (8): dos jefes con el mismo cargo, jefe del jefe, por instalaciones, sin equipo, jefe con cargo que no corresponde, ciclos.
- Base real (7): jefatura con vista previa, auditoría, ciclo y cargo de otra empresa; asignación válida e inválida; FK entre empresas; equipos de cada jefe y del gerente; persona sin jefe asignado; anonimización; otra empresa y alcance por filas. No cubre aún el modo `instalaciones` contra la base (sí en dominio) ni la paginación: pendiente.

## 13. Validación

Gate completo local. Sin cambio visual. Migración aplicada por el bot «OPAI 2.0» antes de integrar.

## 14. Criterios de aceptación

- Una jefatura ve solo lo que le corresponde, probado con dos empresas y dos jefes del mismo cargo.
- El jefe del jefe ve toda la línea.
- Cambiar la jefatura de un cargo queda en la auditoría.
- Las tres capacidades existen como herramientas MCP.

## 15. Riesgos y rollback

- Migración aditiva y reversible (sección «Reversión» del SQL). El código anterior ignora las columnas nuevas.
- Si las personas de una empresa no tienen su usuario vinculado, `a_cargo` «por defecto» responde vacío y el modo `instalaciones` no encuentra instalaciones: es carga pendiente de cada empresa, no un error.
- `equipoDe` lee los vínculos vigentes de los cargos que cuelgan del jefe (4 consultas). Para un gerente general son todas las personas activas; aceptable hoy, se revisa con el cierre de período (CAR-312).

## 16. Reporte de ejecución

Se completa en el PR.
