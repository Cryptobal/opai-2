import { defineModule } from "@opai/capabilities";
import { z } from "zod";

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
  configuracion: z.object({}),
  eventos: [],
  capacidades: [],
});
