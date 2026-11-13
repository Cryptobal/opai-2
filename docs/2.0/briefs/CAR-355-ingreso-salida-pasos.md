# CAR-355 · Ingreso y salida de una persona como lista de pasos (parte 1)

Sesión dueña de Personas y Documentos. Brecha alta H-1 de la auditoría de estándares (referente: Rippling). Linear: CAR-355.

## 1. Objetivo

Que crear un vínculo laboral abra una **lista de ingreso** y terminarlo abra una **lista de salida**. Cada paso tiene responsable, plazo y estado, y aparece en la bandeja de su responsable (Mis tareas, Inicio). Todo por pantalla, `/api/v1` y MCP.

## 2. Estado actual (verificado en `main` 7f3c8bb2)

- `core.vinculos.crear` y el importador `contratos` emiten `core.vinculo.creado`. `core.vinculos.terminar` y el traslado de titular de Pauta emiten `core.vinculo.terminado`.
- No existen listas de pasos para el ingreso ni la salida. Los pasos (contrato, firma, uniforme, credencial, curso, devolución, finiquito, corte de acceso) no tienen responsable.
- Las tareas del núcleo (`core.actividades`, tipo `tarea`, con responsables y vencimiento) ya alimentan Mis tareas, Inicio y la Bandeja. El seguimiento de Comercial (CAR-160) ya usa el patrón «paso → tarea del núcleo → consumidor que cierra el paso».

## 3. Alcance

**Entra (parte 1, este PR):**
- Plantilla de pasos de ingreso y de salida por empresa (Configuración › Personas), con valores por vertical cuando la empresa no la define.
- Apertura automática por evento:
  - **Ingreso:** se abre al crearse un vínculo vigente. No se abre en importaciones ni en continuidad, es decir, en un traslado o en una recontratación al día siguiente.
  - **Salida:** se abre al terminar el último vínculo vigente de la persona.
- Cada paso crea una tarea del núcleo asignada a su responsable. Por defecto el responsable es quien registró el vínculo; se puede reasignar.
- Al marcar la tarea como hecha se cierra el paso, y viceversa. Cuando no quedan pasos pendientes, la lista se cierra.
- Tarjeta «Ingreso y salida» en Personas › ficha › Laboral, con los pasos, sus responsables, sus plazos y las acciones hecho, omitir, reabrir y reasignar.
- Capacidades `core.procesos_persona.listar` y `core.procesos_persona.paso_actualizar` (con `preview_` en el MCP).

**Parte 2 (PR apilado `brief/car-355-corte-acceso`):** terminar el último vínculo deja a la persona inactiva (PIN de terreno sin efecto) y suspende la membresía de su usuario en la misma transacción, salvo un owner (queda informado). La salida y el evento `core.vinculo.terminado` traen `accesos` como prueba. Las llaves del módulo Acceso las corta ese módulo con el evento.

**No entra:**
- Corte automático de acceso en el mismo acto de terminar (membresía, credencial de terreno, llaves de Acceso), con prueba.
- Plantillas por cargo.
- Editor visual de la plantilla: en v1 se edita como lista JSON validada, en Configuración.

## 4. Arquitectura

- Tablas propias `core.procesos_persona` y `core.procesos_persona_pasos`, en vez de extender `core.actividad_vinculos` con `persona`. Así no se mezcla la visibilidad comercial de Actividades (ADR-022) con datos laborales. La tarea es la «bandeja»; el paso guarda `actividad_id`.
- El consumidor `core.personas.procesos` escucha `core.vinculo.creado`, `core.vinculo.terminado` y `core.actividad.tarea_completada`/`actualizada`. Es idempotente: tiene un índice único `(vinculo_id, tipo)` y solo toca pasos `por_hacer`.
- La plantilla efectiva se resuelve en este orden: ajuste del tenant (JSON) y, si no existe, `pasosProcesoPorVertical(vertical, tipo)` de `@opai/domain`.

## 5. Archivos

- `packages/domain/src/procesos-persona/procesos.ts` (plantillas por vertical y validación) y su test.
- `packages/db/prisma/schema/procesos-persona.prisma` y la migración `20261214100000_core_procesos_persona`.
- `packages/capabilities/src/core/procesos-persona/`: esquemas, apertura, consumidor, capacidades y ajustes.
- `apps/web/app/(erp)/personas/_componentes/seccion-procesos.tsx` (ficha) y `apps/web/app/(erp)/configuracion/personas/page.tsx` (entrada nueva «Personas» en Configuración › Personas y acceso, con los ajustes del núcleo del grupo Personas).
- Registro: `core/index.ts`, `apps/web/lib/registro.ts`, instantáneas de paridad e inventario MCP.

## 6. Modelo de datos (aditivo)

`core.procesos_persona`: `id`, `tenant_id`, `persona_id` (FK), `vinculo_id` (FK), `tipo` (`ingreso`|`salida`), `estado` (`abierto`|`cerrado`), `cerrado_en`, `created_at`, `updated_at`. Índice único `(vinculo_id, tipo)`.

`core.procesos_persona_pasos`: `id`, `tenant_id`, `proceso_id` (FK, cascade), `orden`, `titulo`, `responsable_id` (usuario, nullable), `vence` (date), `estado` (`por_hacer`|`hecho`|`omitido`), `actividad_id` (nullable), `hecho_en`, `hecho_por_id`, `nota`, `created_at`, `updated_at`.

Ambas tablas llevan RLS `tenant_isolation`, FORCE y grants a `opai_app`.

## 7. Capacidades

- `core.procesos_persona.listar`: lectura, permiso `core:vinculos.read`. Devuelve las listas de la persona con sus pasos.
- `core.procesos_persona.paso_actualizar`: escritura con `dryRun` e idempotencia, permiso `core:vinculos.manage`. Cambia el estado (hecho, omitido o por hacer), el responsable, el plazo o la nota. Sincroniza la tarea.

## 8. Interfaz

Tarjeta «Ingreso y salida» arriba de Laboral (DS `SeccionTarjeta`, `Badge`, `AccionesEntidad`), siguiendo la lista de pasos del seguimiento comercial. El vacío dice: «Sin listas de ingreso o salida. Se abren solas al crear o terminar un vínculo». Va a 375, 1024 y 1280 px.

## 9. Seguridad y tenant

Todo pasa por `forTenant` y RLS. El responsable debe ser miembro de la empresa. El consumidor no confía en el payload para el tenant. Los datos personales no van en los títulos más allá del nombre.

## 10. Casos límite

- Importación de contratos: no abre ingreso (payload `origen: "importacion"`).
- Traslado: no abre salida (queda vigente) ni ingreso (continuidad).
- Vínculo creado por un agente: el responsable es el usuario detrás de su key; sin usuario (sistema), los pasos quedan sin responsable y sin tarea.
- Reabrir una tarea en Mis tareas no reabre su paso: el paso se reabre desde la ficha (y reabre su tarea).
- Dos cambios a la vez sobre un paso: el segundo recibe «conflicto» en vez de pisar al primero.
- Reabrir un paso reabre la tarea (o crea otra si fue borrada).

## 11. Plan por bloques

1. Dominio y migración. 2. Capacidades y consumidor. 3. Ficha. 4. Pruebas `@preview`, novedades, ESTADO y ADR.

## 12–16

Pruebas de dominio, `*-db` (apertura, idempotencia, tarea ↔ paso, aislamiento entre tenants) y `@preview` de la tarjeta. Validación con el gate completo. Criterios: los de §3. Riesgo bajo: la migración es aditiva y el rollback es borrar las dos tablas nuevas. El reporte va en el PR.
