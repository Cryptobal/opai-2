import { codigoNormalizado, ESTADOS_ACTIVO } from "@opai/domain";
import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { defineCapability } from "../define";
import { noEncontrado } from "../errores";
import { activoSchema, fichaActivoSchema, vistaActivo } from "./activos-comun";
import { camposGuardados, PERMISOS_INVENTARIO } from "./comun";

export const activosList = defineCapability({
  id: "inventario.activos.list",
  descripcion:
    "Lista los activos de la empresa (teléfonos, radios y otros) por código, con su tipo, número de serie y estado. Filtra por tipo, estado o texto en el código o el número de serie. Los dados de baja solo aparecen si se piden.",
  permiso: PERMISOS_INVENTARIO.read,
  input: z.object({
    tipoId: uuidSchema.optional(),
    estado: z.enum(ESTADOS_ACTIVO).optional(),
    q: z.string().trim().max(60).optional().describe("Texto en el código o el número de serie."),
    incluirBaja: z.boolean().default(false),
    cursor: z.string().optional().describe("El `siguiente` de la página anterior."),
    limite: z.number().int().min(1).max(200).default(100),
  }),
  output: z.object({ items: z.array(activoSchema), siguiente: z.string().nullable() }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, { tipoId, estado, q, incluirBaja, cursor, limite }) {
    const texto = q ? codigoNormalizado(q) : "";
    const filas = await ctx.db.inventarioActivo.findMany({
      where: {
        AND: [
          tipoId ? { tipoId } : {},
          estado ? { estado } : incluirBaja ? {} : { estado: { not: "de_baja" } },
          texto
            ? {
                OR: [
                  { codigoNormalizado: { contains: texto } },
                  { numeroSerie: { contains: q ?? "", mode: "insensitive" } },
                ],
              }
            : {},
          cursor ? { codigoNormalizado: { gt: cursor } } : {},
        ],
      },
      orderBy: { codigoNormalizado: "asc" },
      take: limite + 1,
    });
    const pagina = filas.slice(0, limite);
    const tipos = await ctx.db.inventarioTipo.findMany({
      where: { id: { in: [...new Set(pagina.map((f) => f.tipoId))] } },
      select: { id: true, nombre: true },
    });
    const nombre = new Map(tipos.map((t) => [t.id, t.nombre]));
    return {
      items: pagina.map((f) => vistaActivo(f, nombre.get(f.tipoId) ?? "")),
      siguiente: filas.length > limite ? (pagina.at(-1)?.codigoNormalizado ?? null) : null,
    };
  },
});

export const activosGet = defineCapability({
  id: "inventario.activos.get",
  descripcion:
    "Muestra la ficha de un activo: su tipo, código, número de serie, estado, notas, el motivo si se dio de baja y los valores de los campos propios de su tipo con sus nombres.",
  permiso: PERMISOS_INVENTARIO.read,
  input: z.object({ id: uuidSchema }),
  output: fichaActivoSchema,
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, { id }) {
    const f = await ctx.db.inventarioActivo.findFirst({ where: { id } });
    if (!f) throw noEncontrado("El activo");
    const tipo = await ctx.db.inventarioTipo.findFirst({ where: { id: f.tipoId } });
    return { ...vistaActivo(f, tipo?.nombre ?? ""), campos: camposGuardados(tipo?.campos) };
  },
});
