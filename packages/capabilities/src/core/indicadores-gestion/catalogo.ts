import { PERMISOS_CORE } from "@opai/domain";
import { z } from "zod";

import { defineCapability } from "../../define";
import { catalogoPara } from "./comun";
import { describirIndicador, indicadorSchema } from "./esquemas";

export const indicadoresGestionCatalogo = defineCapability({
  id: "core.indicadores_gestion.catalogo",
  descripcion:
    "Catálogo de indicadores de gestión de la empresa: lo que OPAI sabe medir de la gestión de las personas (resultado, calidad y oportunidad), publicado por el núcleo y por cada módulo activo. Dice qué mide cada uno, su unidad, si más o menos es mejor, a quién se atribuye, de qué hechos sale y si quien consulta puede medirlo. No son la UF ni la UTM: para esos valores usa core.indicadores.uf_utm.",
  permiso: PERMISOS_CORE.indicadoresGestionRead,
  input: z.object({
    modulo: z.string().optional().describe("Filtra por el módulo que publica el indicador."),
  }),
  output: z.array(
    indicadorSchema.extend({
      puedeMedir: z
        .boolean()
        .describe(
          "true si quien consulta tiene el permiso del módulo dueño de los hechos (y, si su acceso está acotado a lo propio, el indicador se atribuye al usuario).",
        ),
    }),
  ),
  efecto: "lectura",
  dryRun: false,
  // Catálogo en memoria (manifiestos registrados): no toca la base ni revela datos de personas.
  sinDb: true,
  handler: async (ctx, { modulo }) =>
    catalogoPara(ctx)
      .map((i) => ({ ...describirIndicador(i), puedeMedir: ctx.autorizar(i.permiso) && (ctx.alcance === null || i.sujeto === "usuario"),
      }))
      .filter((i) => !modulo || i.modulo === modulo),
});
