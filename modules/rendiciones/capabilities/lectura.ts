import { z } from "zod";

import { defineCapability, prohibido } from "@opai/capabilities";

import { estadoSchema, rendicionSchema, resumenSchema, uuidSchema } from "./esquemas";
import {
  contadoresPropias,
  dondeBusqueda,
  entradaPaginaSchema,
  filtrosListaSchema,
  mapResumenes,
  metaListaLectura,
  rendicionesDePagina,
} from "./pagina-lista";
import { PERMISO_APROBAR, PERMISO_RENDIR, PORTALES_RENDIR, PERMISO_VER_TODAS } from "./permisos";
import { actorId, rendicionDe } from "./util";
import { nombresDe, resumenListaSolicitante, vistaDe } from "./vista";

const filaTodasSchema = resumenSchema.extend({
  solicitanteNombre: z.string().nullable(),
});

export const rendicionesListar = defineCapability({
  id: "rendiciones.rendiciones.listar",
  descripcion:
    "Lista rendiciones según el alcance: «propias», «por_aprobar» o «todas» (con permiso). Búsqueda por código, descripción o quien rinde; filtros y paginación por cursor.",
  permiso: PERMISO_RENDIR,
  portales: PORTALES_RENDIR,
  input: entradaPaginaSchema.merge(filtrosListaSchema).extend({
    alcance: z.enum(["propias", "por_aprobar", "todas"]).default("propias"),
    incluirContadores: z
      .boolean()
      .default(false)
      .describe("Solo con alcance «propias»: totales por estado para las pestañas."),
  }),
  output: z.object({
    items: z.array(filaTodasSchema),
    siguiente: z.string().nullable(),
    contadores: z.record(z.string(), z.number().int()).optional(),
  }),
  ...metaListaLectura,
  async handler(ctx, input) {
    const yo = actorId(ctx);
    if (input.alcance === "todas" && !ctx.autorizar(PERMISO_VER_TODAS)) throw prohibido("No puedes ver las rendiciones de toda la empresa.");
    if (input.alcance === "por_aprobar" && !ctx.autorizar(PERMISO_APROBAR)) throw prohibido("No tienes permiso para aprobar rendiciones.");
    const alcance =
      input.alcance === "propias"
        ? { solicitanteId: yo }
        : input.alcance === "por_aprobar"
          ? { aprobadorId: yo, estado: "enviada" as const }
          : {};
    const { items, siguiente } = await rendicionesDePagina(
      ctx,
      { ...alcance, ...(await dondeBusqueda(ctx, input)) },
      input.cursor,
      input.limite,
    );
    const contadores =
      input.alcance === "propias" && input.incluirContadores && !input.estado
        ? await contadoresPropias(ctx, yo)
        : undefined;
    return {
      siguiente,
      contadores,
      items: await mapResumenes(ctx, items, (f, n) => resumenListaSolicitante(f, n)),
    };
  },
});

export const rendicionesObtener = defineCapability({
  id: "rendiciones.rendiciones.obtener",
  descripcion:
    "Devuelve una rendición con todos sus gastos. La ve quien la rindió, el aprobador asignado o quien puede ver todas las de la empresa; para el resto no existe.",
  permiso: PERMISO_RENDIR,
  portales: PORTALES_RENDIR,
  input: z.object({ id: uuidSchema }),
  output: z.object({ rendicion: rendicionSchema }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => [s.rendicion.id],
  async handler(ctx, input) {
    actorId(ctx);
    const r = await rendicionDe(ctx, input.id);
    return { rendicion: vistaDe(r, await nombresDe(ctx, [r.aprobadorId])) };
  },
});