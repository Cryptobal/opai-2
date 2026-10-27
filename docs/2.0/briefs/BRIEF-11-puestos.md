# BRIEF DE IMPLEMENTACIÓN — 11 PUESTOS, PR 1 (el puesto como posición)

**Repositorio:** `Cryptobal/opai-2` · **Rama de ejecución:** `brief/11-puestos-pr1` (desde `main` actualizado) · **Fecha:** 26-oct-2026 · **Estado:** **aprobado para ejecución** (fuente: «Sí, aprueba las dos hojas con las recomendaciones y lanza» — Carlos, 26-oct-2026 15:12 CLT, transmitido por Chief of Staff; las dos hojas son `docs/2.0/diseño/alcance-puestos.md` y el diseño de Puestos). · **Tarea:** CAR-8 (`Fixes CAR-8` en el PR) · **Alcance aprobado:** `docs/2.0/diseño/alcance-puestos.md` (copia exacta de la hoja, con las 4 respuestas de «Decide Carlos» en su opción recomendada). · **Especificación:** `docs/2.0/modulos/operaciones.md` (Operaciones I). · **Decisiones:** Page «Puestos y guardias OPAI 2.0: propuesta» (cerrada el 25-oct) y feedback de Linear CAR-8. · **Reglas:** ADR-004, ADR-014, ADR-016, ADR-017, ADR-018, ADR-022, ADR-029, ADR-034, ADR-036, ADR-045. · **Diseño:** aprobado, export en `docs/2.0/diseño/export-puestos/` (Claude Design, proyecto `3e9a6632`, DS 2.0 v2 `44e4d7b9`), aprobado por Carlos el 26-oct-2026 20:08 CLT (`t436u`). Reemplaza al export de estilo 1.0 que se sacó del repositorio en `9cdb388` (regla de Carlos del 26-oct-2026 17:18 CLT, ver §7); el recorrido en texto queda en `docs/2.0/referencias/flujo-puestos.md` como referencia de flujo.

> **Ejecución.** Claude ejecuta este brief en la rama `brief/11-puestos-pr1`, un commit por bloque, gate en verde, autorrevisión con un subagente, PR y revisión del «Revisor OPAI 2.0»; integra el bot «OPAI 2.0» con squash (ADR-043 v3). El código se construye en paralelo con el CRM PR 1, pero **Puestos va primero, sin esperar al CRM** (Decisión de Carlos, 26-oct-2026 20:21 CLT, `t443s2067`: «Sí, Puestos primero, sin esperar al CRM»): Puestos se integra sin esperar al CRM PR 1, y la migración del CRM llevará una fecha posterior a `20261028040100` (una migración a la vez: el CRM ordena su migración después de la de Puestos). Se trae `main` con merge cuando haga falta (sin rebase ni force-push). El PR lleva la etiqueta `migracion-pendiente`.

---

## 1. Objetivo

Pasar el puesto de **fila con N cupos** (como en 1.0: nombre, horario y «guardias requeridos» 1..20 en una sola fila) a **1 puesto = 1 posición cubierta**. La dotación se arma con N puestos, cada uno con su estado **PPC «Sin asignar»** visible desde el primer día. El rol pasa a un **catálogo de patrones de turno por tenant** (4×4, 7×7, 14×14, 5×2, 2×5, 3×4) y a un **catálogo de funciones por tenant** (el supervisor es un puesto más). El horario va por tramos (día y, si el puesto rota, noche), con horas semanales y colación guardadas en el puesto.

Se nota que funciona cuando, en una instalación, **todos los puestos se ven y se navegan** a 375, 1024 y 1280 px, **el nombre del patrón se ve claro** y no hay elementos corridos ni superpuestos (CAR-8), con paridad MCP y vista previa.

## 2. Estado actual del repo (verificado el 26-oct-2026)

1. **Datos:** `model Puesto` (`packages/db/prisma/schema/maestros.prisma`) tiene `cargoId`, `nombre`, `diasTrabajo`/`diasDescanso`, `horaInicio`/`horaFin`, `jornada`, `dotacion` (1..500) y vigencia. No hay catálogo de patrones ni de funciones.
2. **Dominio:** `packages/domain/src/turnos.ts` tiene `intervaloTurno`, `patronValido` y `etiquetaHorario`. No calcula horas semanales ni conoce el catálogo de patrones.
3. **Capacidades:** `core.puestos.{list,get,create,update,set_estado}` en `packages/capabilities/src/core/maestros/puestos.ts` (create/update con `dryRun`). No hay capacidades de patrones ni de funciones.
4. **Pantallas:** `instalaciones/[id]/puestos`, la hoja (`_componentes/hoja-puesto.tsx`, `campos-puesto.tsx`, `puesto-datos.ts`), el resumen (`resumen-instalacion.tsx`) y `nueva/copiar-puestos.tsx` ya pintan la lista y el formulario de puestos con dotación. La vista del supervisor (`supervisor/instalaciones/[id]`) muestra la dotación. Configuración (`configuracion/`) no tiene patrones de turno ni funciones.
5. **e2e:** Playwright con proyectos `telefono` (375), `ipad` (1024) y `desktop` (1280) en `apps/web/playwright.config.ts`.

## 3. Alcance

### Incluido

- **Datos:** `PatronTurno` y `FuncionPuesto` por tenant en el schema `core` (archivo nuevo `puestos.prisma`); al `Puesto` se le agregan `patronId`, `funcionId`, un segundo tramo de horario (noche) para la rotación día/noche, `horasSemanales`, `colación` (minutos y dentro/fuera de la jornada) y el estado de cobertura **PPC** con motivo «Sin asignar». La columna `dotacion` queda **deprecada**, sin borrarla.
- **Migración única** `20261028040000_puestos_posicion`: aditiva, con RLS `tenant_isolation` en las dos tablas nuevas, y con los **6 patrones de fábrica sembrados** por tenant (4×4, 7×7, 14×14, 5×2, 2×5, 3×4).
- **Dominio:** catálogo de los 6 patrones, cálculo de horas semanales, validación de tramos y colación en `turnos.ts` (con tests).
- **Capacidades:** `core.puestos.*` ampliadas (función, patrón, tramos, horas, colación, PPC) con vista previa; `core.patrones.{list,get,create,update,set_activo}` y `core.funciones.{list,get,create,update,set_activo}`, dadas de alta en el registro. Paridad MCP con vista previa en `core.puestos.create`/`update` y `core.patrones.list`; snapshot de herramientas actualizado.
- **Pantallas:** lista de puestos (una fila por posición, con función, patrón, horario/tramos, horas, colación y estado PPC), hoja de crear/editar, resumen de la instalación y copiar posiciones al crear la instalación. La vista del supervisor deja de mostrar la dotación cruda. **Configuración de Patrones de turno y Funciones** entra en este PR, dentro del centro de Configuración (ADR-018), con el diseño aprobado en DS 2.0 (`t436u`, export en `docs/2.0/diseño/export-puestos/`): lista, edición y estados, sobre `core.patrones.*` y `core.funciones.*` (que también quedan en API y MCP). Las funciones base se siembran solo en desarrollo y pruebas para que el selector de la hoja no quede vacío (§7).
- **Script idempotente** (simula por defecto; `--apply --tenant` escribe) que divide los puestos con `dotacion > 1` en N puestos y entrega un reporte. **Lo ejecuta Carlos**, no el PR.

### Excluido (va en PR 2/3 o después)

- Asignar trabajadores (titular y relevo), series de turnos, pauta mensual y diaria, asistencia.
- PPC con más motivos (licencia, permiso…), turnos extra, refuerzos y búsqueda de urgencia (30 km, OS10, descanso).
- Crear puestos desde la cotización ganada (CPQ no existe aún en 2.0).
- La capa de sueldo del puesto y el anexo (Brief 07b): **no se toca** `EstructuraSueldo` ni `VinculoLaboral`.

## 4. Arquitectura

### 4.1 Datos (ADR-036)

- `PatronTurno` (`core.patrones_turno`): `tenantId` (sin `@relation`; la FK va en el SQL), `nombre` (único por tenant, p. ej. «4×4»), `clase` (`ciclico` | `semanal`), `diasTrabajo`/`diasDescanso`, `diasSemana` (días 1..7 para los semanales), `deFabrica`, `activo`, `orden`. Los 6 de fábrica se siembran y **no se eliminan**: se desactivan si no están en uso.
- `FuncionPuesto` (`core.funciones_puesto`): `tenantId` (sin `@relation`), `nombre` (único por tenant), `vertical` (opcional), `activo`, `orden`. El supervisor es una función más.
- `Puesto` suma `patronId`/`funcionId` (FK opcional a los catálogos), `horaInicioNoche`/`horaFinNoche` (tramo de noche de la rotación), `horasSemanales` (`Decimal(5,2)`), `colacionMin`, `colacionFuera` y `cobertura`/`coberturaMotivo` (por defecto `ppc`/`sin_asignar`). El cargo se **conserva** (decisión 3): queda junto a la función.
- Toda tabla con `tenant_id` lleva RLS `tenant_isolation` para `opai_app` (no negociable). No se toca `core.prisma`, `EstructuraSueldo` ni `VinculoLaboral`.

### 4.2 Capacidades (ADR-004, ADR-022, ADR-029, ADR-034)

- Toda consulta y mutación es capacidad; UI, API y MCP invocan la misma. Las escrituras aceptan `dryRun` e `idempotencyKey` y emiten su evento de dominio por outbox.
- Permisos (tras el #47, roles y permisos finos): patrones y funciones tienen permisos propios, separando lectura, edición y desactivación — `core:patrones.read` / `core:patrones.manage` / `core:patrones.desactivar` y `core:funciones.read` / `core:funciones.manage` / `core:funciones.desactivar`. Las páginas nuevas de Configuración y las capacidades `core.patrones.*` / `core.funciones.*` los usan. viewer lee (comodín `*:*.read`); supervisor no edita; owner/admin/gerente gestionan.

### 4.3 UI (ADR-014, ADR-017, ADR-018, ADR-045)

- Solo tokens y componentes de `@opai/ds`. La fila de puesto muestra el **nombre del patrón** claro, la función, el horario por tramos, las horas semanales y el estado **PPC** como `Badge`. Patrones y funciones se editan en el **centro de Configuración** (ADR-018), nunca en una página por módulo.
- Rendimiento (ADR-045): el shell persiste, el skeleton aparece de inmediato, las consultas por navegación se mantienen ≤ 8.

## 5. Plan por bloques (un commit por bloque)

1. **Brief** (este documento).
2. **Dominio:** catálogo de patrones, horas semanales, tramos y colación en `turnos.ts` + tests.
3. **Datos:** `puestos.prisma`, bloque `Puesto` ampliado y migración `20261028040000_puestos_posicion` con RLS y 6 patrones.
4. **Capacidades:** puestos ampliadas, patrones y funciones, registro, paridad MCP y snapshot.
5. **Pantallas:** lista, hoja, resumen, copiar, Configuración (patrones y funciones) y ajuste de la vista del supervisor.
6. **Script** idempotente `--dry-run` de división de dotación.
7. **e2e CAR-8** (375/1024/1280 con capturas), gate completo y autorrevisión.

## 6. Criterios de aceptación (CAR-8)

- Una instalación con varios puestos: **todos se ven y se navegan** a 375, 1024 y 1280 px; el **nombre del patrón se ve claro**; **no hay elementos corridos ni superpuestos**. Lo comprueba un e2e con capturas en los tres anchos.
- Cada puesto nuevo nace en **PPC «Sin asignar»**.
- Paridad MCP con vista previa en `core.puestos.create`/`update` y `core.patrones.list`.
- Gate en verde: `typecheck · lint · test · test:db`, `build · presupuesto de JS`, `secretos`, `mcp:verificar` y e2e.

**Estado de los criterios (26-oct-2026, tras la revisión 5658390255):**

| Criterio | Estado |
|---|---|
| Todos los puestos se ven y se navegan a 375, 1024 y 1280 px, sin elementos corridos ni superpuestos | Cumplido en la lista de la instalación; el e2e revisa además a 375 px que la línea secundaria no se corte (`scrollWidth <= clientWidth`) |
| El nombre del patrón se ve claro | **Cumplido:** se ve en cada puesto (lista, hoja y supervisor) y en Configuración → Patrones de turno, con el diseño aprobado en DS 2.0 (`t436u`) |
| Cada puesto nuevo nace en PPC «Sin asignar» | Cumplido |
| Paridad MCP con vista previa (`core.puestos.create`/`update`, `core.patrones.list`) | Cumplido |
| Gate en verde | `mcp:verificar` es posterior al despliegue (necesita `OPAI_MCP_KEY`); el resto, en el PR |

## 7. Cambios tras la revisión (26-oct-2026)

Origen: hallazgos de Diseño y QA (2 bloqueantes, 17:16 CLT), revisión del «Revisor OPAI 2.0» 5658390255 (PEDIR CAMBIOS sobre `037707f`) y la regla de Carlos, textual: «nunca copiar el diselo de 1.0, se debe usar el design system aprobado https://claude.ai/design/p/44e4d7b9-7464-4771-bff8-07fcff4d573d» (Carlos, 26-oct-2026 17:18 CLT, transmitida en el encargo del PR #49).

1. **Diseño (QA B1 y regla de Carlos):** se sacó del repositorio el export de estilo 1.0 (`9cdb388`) y, tras la corrección del PR #49, se agregó el export aprobado en DS 2.0 (Claude Design, proyecto `3e9a6632`, DS 2.0 v2 `44e4d7b9`; aprobado por Carlos el 26-oct-2026 20:08 CLT, `t436u`), en `docs/2.0/diseño/export-puestos/` y solo como referencia visual. Ningún componente, token ni clase de la rama viene de ahí: la rama no toca `packages/ds` y el estilo sale solo del DS 2.0 de `main`. La Configuración de Patrones y Funciones ya **no se aplaza**: entra en este PR con ese diseño.
2. **Línea del puesto a 375 px (QA B2):** horario y horas semanales en el tono terciario del DS, con trozos que bajan de renglón en vez de cortarse; en teléfono el badge dice «PPC» y el lector de pantalla lee «PPC · Sin asignar». Un puesto inactivo muestra «Inactivo» (neutro) y va al final. El aviso de medianoche es una `Alerta` de tono info.
3. **Integridad en la base (Revisor 1 y 4):** migración nueva `20261028040100_puestos_integridad`: el trigger `mismo_tenant` de `core.puestos` cubre también `funcion_id` y `patron_id`; el ciclo del puesto se copia de su patrón con `FOR SHARE`; y un patrón con puestos no cambia su estructura. Se hizo como migración aparte (no editando la anterior) porque la rama Neon del preview ya pudo aplicar la primera. Decisión del constructor (Claude), sujeta a revisión.
4. **Reglas de capacidades (Revisor 3 y 4):** `dotacion` ya no se recibe por API ni MCP (queda en 1; el valor histórico se lee). Un patrón con puestos no cambia clase, ciclo ni días. Los patrones semanales derivan trabajo y descanso de los días marcados (sin repetir, uno a seis) y los cíclicos no aceptan días de la semana. La función o el patrón se exigen activos solo cuando cambian.
5. **Horas semanales (Revisor 5):** la hoja solo envía las horas si el usuario las escribió; si cambia el patrón, el horario o la colación sin haberlas tocado, el campo se vacía y el servidor las recalcula. `horasSemanales: null` pide recalcular.
6. **Script de división (Revisor 2):** exige `--tenant` con `--apply`, copia las estructuras de sueldo de nivel puesto con sus ítems, escribe un respaldo con el mapa original → copias y la dotación original, divide cada puesto en su transacción con compare-and-set sobre `dotacion` y tiene pruebas contra Postgres.
7. **Funciones base (Revisor 6, opción b):** `seed:dev-tenant` siembra Guardia, Supervisor y Nochero en seguridad (y equivalentes por vertical), solo en desarrollo y pruebas, sin pisar las existentes. En producción el tenant arma su catálogo por `core.funciones.*`.

## 8. QA de diseño del PR #49 (informe `informe-29e1c93.md`)

Diseño y QA revisó el head `29e1c93` sin bloqueantes salvo H1. Un commit encima arregla el BLOQUEANTE y los no bloqueantes H2–H10, todo con el DS 2.0 (`t436u`):

1. **H1 (BLOQUEANTE) · lista de puestos al diseño.** Desde tablet (≥768 px) se usa la `Table` del DS (como `resumen-instalacion.tsx`) con columnas **Puesto · Función · Horario** (con badge «+1 día» cuando cruza medianoche) **· Patrón · Cobertura · Estado**, con buscador «Nombre del puesto» (`?q=`), chips **Todos / Solo PPC / Inactivos** (`?filtro=`), subtítulo con los conteos y «Nuevo puesto» como botón primario de la cabecera (oculto en el vacío). En teléfono se mantienen las filas (CAR-8) y se suman el buscador y los chips.
2. **Desvío decidido (H1).** La columna **«Dotación N de M»** del diseño no aplica con **1 puesto = 1 posición**: se muestra como **«Cobertura»** (Cubierto / PPC · Sin asignar). Decisión tomada en la QA del informe citado; anotada aquí y en `docs/2.0/ESTADO.md`.
3. **H2–H8.** Confirmación con `Dialog` antes de desactivar un puesto; hoja con subtítulo «instalación · cuenta», «Guardar cambios», «Término» y el horario antes del patrón; la **jornada** se deriva del horario (rota ⇒ rotativa; noche si el tramo empieza ≥ 18:00) en vez de un radio que podía contradecir la rotación; alerta si fallan los catálogos de patrones o funciones; «Clase» de un patrón en uso como texto; medidas fuera de escala reemplazadas por tokens del DS; la vista de ciclo de la hoja no desborda a 375 px.
4. **H9–H10.** `flujo-puestos.md` y `PR-BODY.md` al día; e2e de los estados vacío y oscuro de la lista de puestos, confirmando que los specs de CAR-8 corren en CI (ya no se saltan por falta de `DATABASE_URL_TEST`).

## 9. Autorrevisión antes del último push (decisiones del constructor, Claude)

1. **BLOQUEANTE de alcance corregido.** `core.patrones.list` (el `groupBy` de puestos activos) y `core.patrones.get`/`conteoPuestosPatron` contaban **todos** los puestos activos del tenant, sin aplicar el alcance por filas del supervisor (B3, ADR-022, `docs/2.0/briefs/...07c...`): un supervisor acotado a una instalación veía en «puestos activos» también los de instalaciones ajenas. Corregido agregando `AND: [dondePuesto(ctx)]` (el mismo filtro que ya usan `core.puestos.list/get`) a ambas consultas; fail-closed, igual que el resto del alcance (sin instalaciones a cargo, el conteo es cero, nunca el total del tenant). Pruebas negativas nuevas: `alcance-db.test.ts` («el conteo de puestosActivos en patrones respeta el alcance del supervisor») y `puestos-db.test.ts` («el conteo de puestosActivos de un patrón no cruza tenants»). La autorrevisión con un subagente encontró la misma fuga, con el mismo patrón de código, en `core.funciones.list/get` (`funciones.ts`/`funciones-vista.ts`), expuesta igual al supervisor por `core:funciones.read`: corregida igual, con la misma prueba en `alcance-db.test.ts`. `cargos-vista.ts` tiene el mismo conteo sin filtrar, pero hoy el supervisor no tiene `core:estructuras.read` (el permiso de `core.cargos.*`), así que no hay fuga práctica con los roles actuales; se deja sin tocar y anotado en `docs/2.0/ESTADO.md` para revisar si algún rol futuro obtiene ese permiso.
2. **Carrera verificada entre cambiar un patrón y elegirlo en un puesto.** Se comprobó con dos transacciones Postgres manuales (antes de corregir) que desactivar un patrón (`core.patrones.set_activo`) en paralelo con elegirlo en un puesto nuevo (`core.puestos.create`) SÍ deja un puesto con un patrón ya inactivo: la lectura de `activo` en `componer` (`puestos-ayuda.ts`) es anterior a la transacción de escritura y no tiene lock, así que un `set_activo` concurrente que comitea entre esa lectura y el `INSERT` no se nota. Se cierra con un advisory lock por patrón dentro de la transacción (`bloquearPatron`, `pg_advisory_xact_lock(hashtextextended(id,1))`, el mismo idioma que `bloquearCaso` de `incidentes-comun.ts`), tomado por `core.patrones.set_activo` y por `patronSigueActivo` (nueva relectura con lock dentro de la transacción de `core.puestos.create`/`update`, solo cuando el puesto ELIGE el patrón). **No se tocó el trigger `puesto_ciclo_del_patron`** (20261028040100) para este chequeo: ese trigger también corre desde `packages/db/scripts/dividir-dotacion-nucleo.ts`, que copia un puesto preservando su `patronId` tal cual (incluido uno ya inactivo) al dividir la dotación; exigir "activo" en el trigger habría roto esa división, que es un INSERT legítimo y no una elección nueva del usuario. El cambio de **estructura** (clase, ciclo, días) no necesitó un lock nuevo: ya queda serializado por el mismo `FOR SHARE` del trigger más `patron_en_uso_inmutable` (ambos toman el lock de la misma fila de `patrones_turno`), confirmado con una prueba de concurrencia que fuerza el orden exacto y no encontró ninguna forma a medio camino. Sin migración nueva. Pruebas de concurrencia (orden forzado con transacciones manuales) en `puestos-db.test.ts`.
3. Gate completo en verde (`typecheck · lint · test · test:db`, `build · presupuesto de JS`) y el e2e de Puestos (`puestos-car8.spec.ts`) a 375/1024/1280 px contra el servidor del propio worktree.
