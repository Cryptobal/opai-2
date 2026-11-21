import { z } from "zod";

import { FRANJA_NOCTURNA_FIN, FRANJA_NOCTURNA_INICIO } from "../domain/horario";

const hora = z
  .string()
  .regex(/^([01]?\d|2[0-3]):([0-5]\d)$/, "Formato HH:MM")
  .describe("Hora en formato 24 h");

/** Ajustes de la Central (ADR-018): el centro de Configuración del núcleo los muestra por ámbito. */
export const ajustesCentral = z.object({
  franja_nocturna_inicio: hora.default(FRANJA_NOCTURNA_INICIO).meta({
    etiqueta: "Inicio de la franja nocturna",
    ayuda: "Cada noche, desde esta hora, el agente de central opera sin turno abierto hasta el fin de la franja.",
    grupo: "Horario",
    ambito: "tenant",
    permiso: "central:config.manage",
    control: "texto",
  }),
  franja_nocturna_fin: hora.default(FRANJA_NOCTURNA_FIN).meta({
    etiqueta: "Fin de la franja nocturna",
    ayuda: "Hora hasta la que el agente opera solo. Fuera de la franja alguien abre turno o queda el responsable de respaldo.",
    grupo: "Horario",
    ambito: "tenant",
    permiso: "central:config.manage",
    control: "texto",
  }),
  whatsapp_tope_mensual_usd: z.number().min(0).max(100_000).default(0).meta({
    etiqueta: "Tope mensual de gasto en WhatsApp (USD)",
    ayuda:
      "Al llegar a este monto el tenant deja de enviar WhatsApp en la cadena y solo usan campana y push. 0 = sin tope. El canal WhatsApp aún no está activo; el tope queda listo para cuando se conecte.",
    grupo: "WhatsApp",
    ambito: "tenant",
    permiso: "central:config.manage",
    control: "numero",
  }),
  responsable_respaldo: z.string().default("").meta({
    etiqueta: "Responsable de respaldo",
    ayuda:
      "Persona a cargo de la central cuando no hay un turno abierto (por ejemplo, el jefe de operaciones). Sin turno ni respaldo, el agente de central solo mira y avisa a los dueños y administradores.",
    grupo: "Humano a cargo",
    ambito: "tenant",
    permiso: "central:config.manage",
    control: "texto",
  }),
  plazo_consulta_min: z.number().int().min(5).max(240).default(15).meta({
    etiqueta: "Plazo para responder una consulta (minutos)",
    ayuda: "Si la central no responde una consulta de terreno en este plazo, la consulta entra a la cola como alerta.",
    grupo: "Mensajes y avisos",
    ambito: "tenant",
    permiso: "central:config.manage",
    control: "numero",
  }),
});
