# BRIEF · Hilo H3 — Actividad y Agenda del hilo (CAR-331)

Etapa H3 del plan de la base «Hilo» (`BRIEF-base-hilo.md` §5, ADR-090). Sesión Hilo, 12-nov-2026.

## 1. Objetivo

Que los segmentos **Actividad** y **Agenda** del hilo muestren lo que corresponde a cada persona, con su propio alcance, y que lo mismo se obtenga por `/api/v1` y por MCP.

## 2. Estado actual (verificado en `main` 07b5ed8)

- H1 dejó Actividad y Agenda en versión base: Actividad llama a `core.actividad.list` sin entidad, que exige `core:audit.read` y rechaza a todo actor acotado, así que un supervisor veía «sin permiso». Agenda llama a `core.actividades.tareas` y solo muestra tareas propias.
- Existen lecturas con alcance por filas para las fuentes de la agenda: `core.actividades.tareas` (propias) y `core.documentos.vencimientos` (`documentosEnAlcance`).

## 3. Alcance

- `core.hilo.actividad` (lectura, herramienta MCP `core_hilo_actividad`): la actividad reciente con tres alcances: **empresa** (con auditoría y sin alcance), **instalaciones** (actor acotado: eventos de sus instalaciones, por entidad o por `instalacionId` del input) y **propia** (lo que hizo el actor o un agente a su nombre). Sin instalaciones a cargo no ve nada.
- `core.hilo.agenda` (lectura, herramienta MCP `core_hilo_agenda`): tareas propias con fecha y documentos vencidos o por vencer en `dias` (14 por defecto), en una sola lista ordenada. Cada fuente se suma solo con su permiso y conserva su alcance.
- El hilo usa estas dos capacidades. La presentación de la actividad (`presentarActividad`) se extrae de `core.actividad.list` y la comparten ambas, sin cambiar la salida de la existente.
- **Fuera de este corte (pendiente):** turnos de la pauta y facturas programadas en la Agenda. Finanzas sigue congelado en pantallas hasta cerrar CAR-266 a 269.

## 4. Seguridad y tenant

- Tenant de la sesión; sin `dbAdmin`; consultas por `ctx.db` con RLS.
- Alcance en la consulta (ADR-022), denegar por defecto.
- Lecturas auditadas (NÚCLEO-H): ids de eventos revelados; en la agenda, ids de documentos y de personas cuyo nombre se reveló (mismo criterio que `core.documentos.vencimientos`). El historial salarial sigue auditado con `core.estructuras.read_sensible`.
- La agenda no expone el nombre de archivo (dato externo); muestra el tipo de documento.

## 5. Interfaz

Sin cambio de diseño: mismas filas del hilo. Lo vencido se marca «Vencido»; un día sin hora (documento) no se corre por la zona horaria.

## 6. Tests

- `hilo-actividad-agenda-db.test.ts` (RLS real, dos empresas): empresa, supervisor acotado, sin instalaciones, sin auditoría, y agenda con alcance.
- `datos-hilo.test.ts`: mapeo de la agenda.
- `hilo-h3.spec.ts` (`@preview`): Actividad y Agenda cargan sin error, con capturas.
- Instantánea de herramientas MCP e inventario de paridad actualizados.

## 7. Criterios de aceptación

- La misma lista sale en pantalla, por `/api/v1` y por MCP (misma capacidad).
- Un supervisor solo ve lo de sus instalaciones; otra empresa no ve nada de esta.
- Con el marco clásico nada cambia.

## 8. Riesgos y vuelta atrás

Sin migración. Revertir el PR devuelve el hilo a las lecturas de H1.
