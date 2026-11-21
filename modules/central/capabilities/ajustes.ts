import { z } from "zod";

/** Ajustes de la Central (ADR-018): el centro de Configuración del núcleo los muestra por ámbito. */
export const ajustesCentral = z.object({
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
