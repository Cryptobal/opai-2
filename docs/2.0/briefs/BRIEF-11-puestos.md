# BRIEF DE IMPLEMENTACIÓN — 11 PUESTOS, PR 1 (el puesto como posición)

**Repositorio:** `Cryptobal/opai-2` · **Rama de ejecución:** `brief/11-puestos-pr1` (desde `main` actualizado) · **Fecha:** 26-oct-2026 · **Estado:** **aprobado para ejecución** (fuente: «Sí, aprueba las dos hojas con las recomendaciones y lanza» — Carlos, 26-oct-2026 15:12 CLT, transmitido por Chief of Staff; las dos hojas son `docs/2.0/diseño/alcance-puestos.md` y el diseño de Puestos). · **Tarea:** CAR-8 (`Fixes CAR-8` en el PR) · **Alcance aprobado:** `docs/2.0/diseño/alcance-puestos.md` (copia exacta de la hoja, con las 4 respuestas de «Decide Carlos» en su opción recomendada). · **Especificación:** `docs/2.0/modulos/operaciones.md` (Operaciones I). · **Decisiones:** Page «Puestos y guardias OPAI 2.0: propuesta» (cerrada el 25-oct) y feedback de Linear CAR-8. · **Reglas:** ADR-004, ADR-014, ADR-016, ADR-017, ADR-018, ADR-022, ADR-029, ADR-034, ADR-036, ADR-045. · **Diseño aprobado:** export de Claude Design de Puestos en `docs/2.0/diseño/export-puestos/` (proyecto `4cb4b749-4284-48b5-8e9b-4209f4c86715`).

> **Ejecución.** Claude ejecuta este brief en la rama `brief/11-puestos-pr1`, un commit por bloque, gate en verde, autorrevisión con un subagente, PR y revisión del «Revisor OPAI 2.0»; integra el bot «OPAI 2.0» con squash (ADR-043 v3). El código se construye en paralelo con el CRM PR 1, pero **la migración se integra después de la del CRM** (una migración a la vez): no se pide merge hasta que el CRM PR 1 esté en `main`, y entonces se trae `main` con merge (sin rebase ni force-push). El PR lleva la etiqueta `migracion-pendiente`.

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
- **Migración única** `20261027120000_puestos_posicion`: aditiva, con RLS `tenant_isolation` en las dos tablas nuevas, y con los **6 patrones de fábrica sembrados** por tenant (4×4, 7×7, 14×14, 5×2, 2×5, 3×4).
- **Dominio:** catálogo de los 6 patrones, cálculo de horas semanales, validación de tramos y colación en `turnos.ts` (con tests).
- **Capacidades:** `core.puestos.*` ampliadas (función, patrón, tramos, horas, colación, PPC) con vista previa; `core.patrones.{list,get,create,update,set_activo}` y `core.funciones.{list,get,create,update,set_activo}`, dadas de alta en el registro. Paridad MCP con vista previa en `core.puestos.create`/`update` y `core.patrones.list`; snapshot de herramientas actualizado.
- **Pantallas:** lista de puestos (una fila por posición, con función, patrón, horario/tramos, horas, colación y estado PPC), hoja de crear/editar, resumen de la instalación, copiar posiciones al crear la instalación, y en Configuración dos secciones nuevas: **Patrones de turno** y **Funciones**. La vista del supervisor deja de mostrar la dotación cruda.
- **Script idempotente** con `--dry-run` que divide los puestos con `dotacion > 1` en N puestos y entrega un reporte. **Lo ejecuta Carlos**, no el PR.

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
- Permisos: patrones y funciones usan `core:instalaciones.manage` (editar) y `core:instalaciones.read` (leer), coherente con puestos.

### 4.3 UI (ADR-014, ADR-017, ADR-018, ADR-045)

- Solo tokens y componentes de `@opai/ds`. La fila de puesto muestra el **nombre del patrón** claro, la función, el horario por tramos, las horas semanales y el estado **PPC** como `Badge`. Patrones y funciones se editan en el **centro de Configuración** (ADR-018), nunca en una página por módulo.
- Rendimiento (ADR-045): el shell persiste, el skeleton aparece de inmediato, las consultas por navegación se mantienen ≤ 8.

## 5. Plan por bloques (un commit por bloque)

1. **Brief** (este documento).
2. **Dominio:** catálogo de patrones, horas semanales, tramos y colación en `turnos.ts` + tests.
3. **Datos:** `puestos.prisma`, bloque `Puesto` ampliado y migración `20261027120000_puestos_posicion` con RLS y 6 patrones.
4. **Capacidades:** puestos ampliadas, patrones y funciones, registro, paridad MCP y snapshot.
5. **Pantallas:** lista, hoja, resumen, copiar, Configuración (patrones y funciones) y ajuste de la vista del supervisor.
6. **Script** idempotente `--dry-run` de división de dotación.
7. **e2e CAR-8** (375/1024/1280 con capturas), gate completo y autorrevisión.

## 6. Criterios de aceptación (CAR-8)

- Una instalación con varios puestos: **todos se ven y se navegan** a 375, 1024 y 1280 px; el **nombre del patrón se ve claro**; **no hay elementos corridos ni superpuestos**. Lo comprueba un e2e con capturas en los tres anchos.
- Cada puesto nuevo nace en **PPC «Sin asignar»**.
- Paridad MCP con vista previa en `core.puestos.create`/`update` y `core.patrones.list`.
- Gate en verde: `typecheck · lint · test · test:db`, `build · presupuesto de JS`, `secretos`, `mcp:verificar` y e2e.
