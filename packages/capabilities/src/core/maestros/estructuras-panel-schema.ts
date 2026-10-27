import { aprobacionesList } from "../agentes/aprobaciones";
import { z } from "zod";
import { uuidSchema } from "../esquemas";
import { diaSchema } from "./comun";
import { estructuraSchema } from "./estructuras-vista";
import { estructurasEfectiva } from "./estructuras-efectiva";
import { instalacionesGet, instalacionesList } from "./instalaciones";
import { personasGet, personasList } from "./personas";
import { puestoSchema } from "./puestos-vista";

export const entradaPanel = z.object({
  tipo: z.enum(["instalacion", "persona"]),
  id: uuidSchema,
  fecha: diaSchema.optional(),
  puestoId: uuidSchema.optional(),
  instalacionId: uuidSchema.optional(),
  filtros: z
    .object({
      q: z.string().max(200).optional(),
      cargo: uuidSchema.optional(),
      cuenta: uuidSchema.optional(),
      estado: z.string().max(40).optional(),
      region: z.string().max(80).optional(),
      cursor: uuidSchema.optional(),
    })
    .default({}),
});
export type EntradaPanel = z.infer<typeof entradaPanel>;
export const salidaPanel = z.object({
  aprobaciones: aprobacionesList.output,
  instalacion: instalacionesGet.output.nullable(),
  persona: personasGet.output.nullable(),
  instalaciones: instalacionesList.output,
  personas: personasList.output,
  cuentas: z.array(z.object({ id: z.string(), nombre: z.string() })),
  puestos: z.array(puestoSchema),
  versiones: z.array(estructuraSchema),
  efectiva: estructurasEfectiva.output.nullable(),
});
export type PanelSueldo = z.infer<typeof salidaPanel>;
