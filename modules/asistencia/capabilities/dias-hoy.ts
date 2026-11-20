import { z } from "zod";

import { defineCapability } from "@opai/capabilities";

import { PORTALES } from "./dias-capacidades";
import { uuid } from "./esquemas";
import { alcanceMarcas } from "./lecturas";
import { ESTADOS_HOY, itemSchema } from "./dias-hoy-tipos";
import { hoyZona, idsBusqueda, itemsResumenDia, paginaItems, resumenItems } from "./dias-hoy-helpers";

/** «Asistencia de hoy»: presentes, sin marca, atrasos y correcciones pendientes de los turnos del día. */
export const hoyListar = defineCapability({
  id: "asistencia.dias.hoy",
  descripcion:
    "Muestra la asistencia de hoy de los turnos esperados: quién está presente, quién no marcó, atrasos al segundo, jornadas incompletas y correcciones pendientes, con el resumen del día. Busca por nombre de persona o instalación. Paginada por cursor (personaId de la fila anterior).",
  permiso: null,
  portales: PORTALES,
  input: z.object({
    instalacionId: uuid.optional(),
    estado: z.enum(ESTADOS_HOY).optional(),
    q: z.string().trim().max(100).optional(),
    cursor: z.string().uuid().optional(),
    limite: z.number().int().min(1).max(200).default(50),
  }),
  output: z.object({
    fecha: z.string(),
    zona: z.string(),
    resumen: z.object({
      turnos: z.number().int(),
      presentes: z.number().int(),
      sinMarca: z.number().int(),
      ausentes: z.number().int(),
      incompletos: z.number().int(),
      atrasos: z.number().int(),
    }),
    items: z.array(itemSchema),
    siguiente: z.string().nullable(),
  }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => [...new Set(s.items.map((d) => d.personaId))],
  async handler(ctx, i) {
    const alcance = await alcanceMarcas(ctx);
    const { zona, hoy, ahora } = await hoyZona(ctx);
    const busqueda = i.q ? await idsBusqueda(ctx, i.q, undefined) : null;
    if (busqueda && !busqueda.personaIds.length && !busqueda.instalacionIds.length) {
      return {
        fecha: hoy,
        zona,
        resumen: { turnos: 0, presentes: 0, sinMarca: 0, ausentes: 0, incompletos: 0, atrasos: 0 },
        items: [],
        siguiente: null,
      };
    }
    const resumenItems_ = await itemsResumenDia(ctx, hoy, ahora, zona, alcance, i.instalacionId, busqueda);
    const resumen = resumenItems(resumenItems_);
    const { items, siguiente } = paginaItems(resumenItems_, i.estado, i.cursor, i.limite);
    return { fecha: hoy, zona, resumen, items, siguiente };
  },
});