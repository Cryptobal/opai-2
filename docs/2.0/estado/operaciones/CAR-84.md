# CAR-84 · Tickets y solicitudes (PR 2 del Brief 13)

- **Sesión:** Sesión Operaciones
- **PR:** (por abrir) · rama `brief/car-84-avisos-solicitante`
- **Estado:** En PR
- **Migración:** No
- **Apilado sobre / espera:** ninguno

## Qué entra (parte 1: avisos)

- Consumidor `tickets.avisos` (`modules/tickets/consumidor-avisos.ts`), registrado en `apps/web/lib/registro.ts`: aviso en la campana al responsable cuando un ticket se crea o se le reasigna, y a quien lo pidió cuando cambia de estado, se aprueba o se rechaza. Nunca a quien hizo el cambio (ni a la persona detrás de un agente), ni a una membresía suspendida. Idempotente por evento y usuario. Usa el estado y el responsable del evento, no los de ahora. El texto no copia la descripción ni el motivo; enlaza a la ficha.
- Prueba `tickets-avisos-db.test.ts` (5 casos, con dos empresas).
- `docs/2.0/modulos/tickets.md` §8 al día. Novedad para usuarios.

## Qué queda pendiente (resto del PR 2 del Brief 13)

- Correo al solicitante: declarar los comunicables de Tickets (ADR-020, silencio por defecto). Hoy el catálogo comunicable vive solo en el núcleo (`COMUNICABLES_NUCLEO`).
- Vínculo polimórfico del ticket a otras entidades (negocio, instalación).
- Adjuntos vía `core.documentos`.
- Lista de tickets en el portal del supervisor.

## Qué se decidió

- **Aviso directo, no por reglas de Comunicaciones:** que el responsable y quien pidió se enteren es lo esperado en una mesa de ayuda (referente: Zendesk y Linear avisan al asignado y al solicitante sin configurar nada). Por eso no sigue el «silencio por defecto» de ADR-020, que queda para el correo. Es reversible: se apaga quitando el consumidor del registro.
