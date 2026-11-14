import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { cursorDe, pagina } from "../core/maestros/comun";
import { defineCapability } from "../define";
import { dondeInstalacionId, instalacionEnAlcance } from "../rondas/comun";
import { nombresInstalacion, PERMISO_PATENTE, PERMISO_READ, TIPOS_REGISTRO } from "./comun";

const item = z.object({
  id: uuidSchema,
  instalacionId: uuidSchema,
  instalacion: z.string(),
  entradaEn: z.string(),
  salidaEn: z.string().nullable(),
  tipoRegistro: z.string(),
  nombre: z.string(),
  empresa: z.string().nullable(),
  documento: z.string(),
  patente: z.string().nullable(),
  origen: z.string(),
});

/**
 * Registros de acceso (CAR-474): una instalación o todas las del alcance del actor, con cursor (CAR-353).
 * La búsqueda por patente solo vale para quien puede verla; para el resto se busca en nombre y empresa.
 */
export const registrosListar = defineCapability({
  id: "acceso.registros.listar",
  descripcion:
    "Lista las entradas y salidas de una instalación o de todas las que el usuario tiene a cargo, de la más reciente a la más antigua; con «en sitio» solo quienes siguen dentro. Filtra por tipo de registro y busca por nombre, empresa o patente. El documento va enmascarado; la patente completa solo para quien puede verla.",
  permiso: PERMISO_READ,
  input: z.object({
    instalacionId: uuidSchema.optional(),
    soloEnSitio: z.boolean().default(false),
    tipoRegistro: z.enum(TIPOS_REGISTRO).optional(),
    q: z.string().trim().max(80).optional(),
    cursor: z.uuid().optional().describe("Id del último registro de la página anterior."),
    limite: z.number().int().min(1).max(200).default(50),
  }),
  output: z.object({ items: z.array(item), siguiente: z.string().nullable() }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (salida) => salida.items.map((r) => r.id),
  async handler(ctx, input) {
    if (input.instalacionId) await instalacionEnAlcance(ctx, input.instalacionId);
    const verPatente = ctx.autorizar(PERMISO_PATENTE);
    const q = input.q ? { contains: input.q, mode: "insensitive" as const } : null;
    // La patente se guarda normalizada («AB-CD 12» → «ABCD12»): se busca igual de normalizada.
    const qPatente = input.q?.replace(/[\s.-]/g, "").toUpperCase();
    const filas = await ctx.db.registroAcceso.findMany({
      where: {
        AND: [
          dondeInstalacionId(ctx),
          input.instalacionId ? { instalacionId: input.instalacionId } : {},
          input.soloEnSitio ? { salida: null } : {},
          input.tipoRegistro ? { tipoRegistro: input.tipoRegistro } : {},
          q
            ? {
                OR: [
                  { nombre: q },
                  { empresa: q },
                  ...(verPatente && qPatente ? [{ patente: { contains: qPatente } }] : []),
                ],
              }
            : {},
        ],
      },
      orderBy: [{ horaCorregida: "desc" }, { id: "desc" }],
      include: { salida: { select: { horaCorregida: true } } },
      ...cursorDe(input.cursor, input.limite),
    });
    const { items, siguiente } = pagina(filas, input.limite, input.cursor);
    const nombres = await nombresInstalacion(
      ctx,
      items.map((r) => r.instalacionId),
    );
    return {
      siguiente,
      items: items.map((r) => ({
        id: r.id,
        instalacionId: r.instalacionId,
        instalacion: nombres.get(r.instalacionId) ?? "",
        entradaEn: r.horaCorregida.toISOString(),
        salidaEn: r.salida?.horaCorregida.toISOString() ?? null,
        tipoRegistro: r.tipoRegistro,
        nombre: r.nombre,
        empresa: r.empresa,
        documento: r.mascara,
        patente: verPatente ? r.patente : null,
        origen: r.origen,
      })),
    };
  },
});
