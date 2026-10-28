import { defineModule } from "@opai/capabilities";
import { z } from "zod";
import { capacidades } from "./capacidades";

/** Cliente del registro común, sin herramientas ni lógica de negocio propias (ADR-049). */
export const manifest = defineModule({
  id: "agente",
  nombre: "Agente interno",
  version: "0.1.0",
  dependencias: [],
  permisos: [
    { id: "agente:usar", descripcion: "Usar el agente interno con el acceso propio." },
    { id: "agente:configurar", descripcion: "Configurar el agente interno de la empresa." },
  ],
  navegacion: [],
  configuracion: z.object({
    presupuestoMensualMicro: z
      .string()
      .regex(/^\d{1,18}$/)
      .default("0")
      .meta({
        etiqueta: "Presupuesto mensual del agente (micro-USD)",
        ayuda: "0 = sin límite. Aviso al 80 %; el costo ya incurrido siempre se registra.",
        ambito: "tenant",
        permiso: "agente:configurar",
        soloPersonas: true,
      }),
  }),
  eventos: [],
  capacidades,
});
