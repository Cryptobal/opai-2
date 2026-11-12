# BRIEF CAR-312 · Desempeño: el agente, lo escalado y los avisos bajo la meta

ADR-094 (adenda CAR-312). Hoja de alcance `docs/2.0/diseño/alcance-desempeno.md` (propuestas del agente en el hilo). Apilado sobre CAR-311 (#576).

## 1 Objetivo

Que el agente trabaje con Desempeño igual que una persona, sin poder cambiar una meta solo; que quien quede bajo la meta (y su jefatura) se entere al cerrar el mes; medir cuánto tarda alguien en resolver lo que un agente le escaló, y mostrar qué parte de las acciones de cada persona hizo su agente.

## 2 Estado actual (verificado)

- `desempeno.scorecards.guardar` ya declara `exigeAprobacion: (input) => input.publicar`: un agente que publica deja una aprobación en `core.aprobaciones`, que el hilo muestra en Pendientes (`core.inicio.pendientes`, «aprobaciones de agentes»). Un borrador no la necesita.
- El cierre del mes (CAR-322) guarda el resultado de cada persona con su jefatura directa (`jefePersonaId`) y emite `desempeno.periodo.cerrado`.
- La auditoría (`core.audit_events`) registra `actorType` (`user` o `agent`), `actorId` y `viaUserId` (el usuario por el que actúa el agente).
- `core.aprobaciones` guarda pedido (`createdAt`), decisión (`resueltaEn`, `resueltaPor`) y estado.

## 3 Alcance

- **Propuestas:** se usa la cola de aprobaciones existente (no hay tabla nueva), con prueba de que el agente no publica solo y sí guarda un borrador.
- **Avisos bajo la meta:** si la empresa activa `desempeno.aviso_bajo_meta` (apagado por defecto), el cierre emite dos eventos nuevos, comunicables transaccionales con plantilla de campana editable, y un consumidor propio la manda a la persona y a su jefatura directa, comprobando que puedan ver ese resultado.
- **Indicador `core.respuesta_escalados`:** «Tiempo de respuesta a lo escalado por agentes», oportunidad, horas, menos es mejor, meta 4, por usuario.
- **Parte del agente:** campo `parteAgente` en `desempeno.resultados.ver_persona` y una línea en la pantalla del resultado de la persona.

## 4 Arquitectura

`packages/capabilities/src/desempeno/avisos.ts` emite los eventos dentro de la transacción del cierre (outbox, ADR-029) y define el consumidor; `parte-agente.ts` cuenta filas de auditoría del mes (sin leer su detalle); `core/indicadores-gestion/respuesta-escalados.ts` es el indicador del núcleo. Las plantillas viven en `packages/domain/src/comunicaciones/desempeno.ts`.

## 5 Archivos

`packages/capabilities/src/desempeno/{avisos,parte-agente,ajustes,cierre,index,resultados}.ts`, `packages/capabilities/src/core/indicadores-gestion/{respuesta-escalados,comun}.ts`, `packages/capabilities/src/index.ts`, `packages/domain/src/comunicaciones/{desempeno,index}.ts`, `modules/desempeno/manifest.ts`, `apps/web/lib/registro.ts`, `apps/web/app/(erp)/desempeno/{_componentes/datos.ts,personas/[id]/page.tsx}`, novedad, test `packages/capabilities/test/desempeno-agente-db.test.ts`.

## 6 Modelo de datos y migraciones

Ninguna.

## 7 Capacidades

Sin capacidades nuevas ni cambio en la lista de herramientas MCP. `desempeno.resultados.ver_persona` suma `parteAgente`; el catálogo suma `core.respuesta_escalados`.

## 8 Interfaz y responsive

Una línea de texto en el resultado de la persona («Su agente hizo el X % de sus acciones del mes…»), solo si el agente hizo algo. Un interruptor nuevo en Configuración › Desempeño. Sin componentes nuevos.

## 9 Seguridad y tenant

Todo con `forTenant`. Los avisos no llevan puntaje ni detalle; son transaccionales (las reglas de Comunicaciones no los enrutan); a la persona solo si su cargo le muestra su resultado; destinatarios leídos de la base (nunca del payload), con membresía activa y permiso efectivo `desempeno:resultados.ver`; la jefatura solo cuenta a quienes la jefatura de cargos le deja ver. El indicador excluye las aprobaciones de plataforma. La parte del agente solo cuenta escrituras (no lecturas auditadas) y solo de sus keys personales o su agente interno, sin leer el detalle de ninguna fila.

## 10 Casos límite

Persona sin usuario: `parteAgente` null. Jefatura sin usuario o inactiva: sin aviso. Aprobación vencida sin decisión: no cuenta. Evento repetido: no duplica la campana. Puntaje null (sin hechos): no avisa.

## 11 Plan por bloques

Un commit: indicador, parte del agente, avisos, pantalla, novedad, docs.

## 12 Tests

`desempeno-agente-db.test.ts` (aprobación obligatoria al publicar, indicador con otra empresa, parte del agente sin lecturas ni keys de servicio) y `desempeno-avisos-db.test.ts` (sin avisos con el ajuste apagado; encendido, persona y jefatura, idempotencia, sin puntaje, jefatura sin permiso); catálogo actualizado en `indicadores-gestion.test.ts`.

## 13 Validación

Gate local, `test:db` de Desempeño e indicadores, `preview-e2e` (bloqueado hoy por `qa-e2e` sin Desempeño, igual que toda la cola).

## 14 Criterios de aceptación

El agente no publica un scorecard sin aprobación; con el aviso apagado no llega nada; encendido, llega una campana a la persona y una a su jefatura; el indicador promedia solo lo resuelto; la persona ve la parte de su agente.

## 15 Riesgos y rollback

Sin migración: revertir el PR basta. Riesgos: con el aviso encendido, un evento por persona bajo la meta dentro de la transacción del cierre (van por outbox); la parte del agente recorre la auditoría del mes de la empresa con el índice `(tenant, fecha)` en cada vista de un resultado; el aviso a la jefatura sale de la jefatura directa de la ficha, así que una jefatura solo por cargo (sin jefe en la ficha) no recibe aviso todavía.

## 16 Reporte de ejecución

Ver la descripción del PR.
