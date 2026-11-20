import { EMPRESA, type EventoComunicable, URL, v } from "./tipos";

const TITULO = v("ticket.titulo", "texto", "Falta linterna", "Asunto del ticket.");
const NUMERO = v("ticket.numero", "texto", "A1B2C3D4", "Número corto del ticket.");

/**
 * Avisos de Tickets por Comunicaciones (CAR-622). Silencio por defecto (ADR-020): solo se envían si la
 * empresa activa la regla. El aviso en campana sigue siendo directo al responsable.
 */
export const COMUNICABLES_TICKETS: readonly EventoComunicable[] = [
  {
    evento: "tickets.ticket.sla_vencido",
    nombre: "SLA de ticket vencido",
    descripcion:
      "Cuando un ticket vivo supera el plazo del tipo, avisa una vez al responsable para que lo atienda.",
    transaccional: false,
    variables: [NUMERO, TITULO, EMPRESA, URL("Ficha del ticket en la bandeja.")],
    plantillas: {
      correo: {
        asunto: "SLA vencido · {{ticket.numero}} · {{ticket.titulo}}",
        cuerpo: "El ticket {{ticket.numero}} («{{ticket.titulo}}») pasó su plazo SLA. Revísalo en {{url}}.",
      },
      inapp: {
        asunto: "SLA vencido · {{ticket.numero}}",
        cuerpo: "«{{ticket.titulo}}» pasó su plazo SLA.",
      },
    },
  },
];