# CAR-84 · Tickets y solicitudes (PR 2 del Brief 13)

- **Sesión:** Sesión Operaciones
- **PR:** #811 · rama `brief/car-84-avisos-solicitante`
- **Estado:** En PR
- **Migración:** PR #811 no; PR «instalación del ticket» sí: `20270101110000_tickets_instalacion` (se integra después de `20270101100000_pauta_visitas`, #816)
- **Apilado sobre / espera:** el PR «instalación del ticket» va apilado sobre #811

## Qué entra (parte 1: avisos)

- Consumidor `tickets.avisos` (`modules/tickets/consumidor-avisos.ts`), registrado en `apps/web/lib/registro.ts`: aviso en la campana al responsable cuando un ticket se crea o se le reasigna, y a quien lo pidió cuando cambia de estado, se aprueba o se rechaza. Nunca a quien hizo el cambio (ni a la persona detrás de un agente), ni a una membresía suspendida. Idempotente por evento y usuario. Usa el estado y el responsable del evento, no los de ahora. El texto no copia la descripción ni el motivo; enlaza a la ficha.
- Prueba `tickets-avisos-db.test.ts` (5 casos, con dos empresas).
- `docs/2.0/modulos/tickets.md` §8 al día. Novedad para usuarios.

## Qué entra (parte 2: instalación del ticket, apilado sobre #811)

- Columna opcional `tickets.tickets.instalacion_id` con FK a `core.instalaciones` y el trigger de mismo tenant ampliado.
- `tickets.tickets.crear` acepta `instalacionId` (de esta empresa, no archivada y dentro del alcance de quien crea; si no, NOT_FOUND); `listar` filtra por instalación; la ficha y la bandeja devuelven `instalacionId`.
- Prueba `tickets-instalacion-db.test.ts`: filtro, otra empresa, alcance del supervisor y trigger de la base.

## Qué entra (parte 3: instalación en pantalla, apilado sobre el PR de la parte 2)

- «Nuevo ticket» trae el campo opcional «Instalación» (buscador con las instalaciones activas del alcance de quien crea, vía `core.instalaciones.list`); si no ve ninguna, el campo no aparece.
- La ficha muestra la instalación, leída con `core.instalaciones.get`: si quien mira no la tiene en su alcance, no se muestra el nombre.
- Prueba `@preview` `tickets-instalacion-preview.spec.ts` y novedad para usuarios.

## Qué queda pendiente (resto del PR 2 del Brief 13)

- Correo al solicitante: declarar los comunicables de Tickets (ADR-020, silencio por defecto). Hoy el catálogo comunicable vive solo en el núcleo (`COMUNICABLES_NUCLEO`).
- Vínculo a un negocio (Comercial): Tickets no depende de Comercial; se decide cuando haya un caso real.
- Decidir si la bandeja «Todos» de un supervisor con `tickets:tickets.ver_todos` se acota a sus instalaciones (hoy ve todos, como antes de este PR).
- Adjuntos vía `core.documentos`: espera CAR-496 (Documentos acepta el tipo `ticket`).
- Lista de tickets en el portal del supervisor.

## Qué se decidió

- **Aviso directo, no por reglas de Comunicaciones:** que el responsable y quien pidió se enteren es lo esperado en una mesa de ayuda (referente: Zendesk y Linear avisan al asignado y al solicitante sin configurar nada). Por eso no sigue el «silencio por defecto» de ADR-020, que queda para el correo. Es reversible: se apaga quitando el consumidor del registro.
