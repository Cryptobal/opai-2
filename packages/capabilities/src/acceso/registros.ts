import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { defineCapability } from "../define";
import { dondeInstalacionId } from "../rondas/comun";
import { PERMISO_PATENTE, PERMISO_READ, TIPOS_REGISTRO } from "./comun";
import { inputPaginaAcceso, paginaAlcance, reciente } from "./pagina-alcance";

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
    ...inputPaginaAcceso,
  }),
  output: z.object({ items: z.array(item), siguiente: z.string().nullable() }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (salida) => salida.items.map((r) => r.id),
  async handler(ctx, input) {
    const verPatente = ctx.autorizar(PERMISO_PATENTE);
    const q = input.q ? { contains: input.q, mode: "insensitive" as const } : null;
    // La patente se guarda normalizada («AB-CD 12» → «ABCD12»): se busca igual de normalizada.
    const qPatente = input.q?.replace(/[\s.-]/g, "").toUpperCase();
    return paginaAlcance(
      ctx,
      input,
      () =>
        ctx.db.registroAcceso.findMany({
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
          include: { salida: { select: { horaCorregida: true } } },
          ...reciente(input.cursor, input.limite),
        }),
      (r, instalacion) => ({
        id: r.id,
        instalacionId: r.instalacionId,
        instalacion,
        entradaEn: r.horaCorregida.toISOString(),
        salidaEn: r.salida?.horaCorregida.toISOString() ?? null,
        tipoRegistro: r.tipoRegistro,
        nombre: r.nombre,
        empresa: r.empresa,
        documento: r.mascara,
        patente: verPatente ? r.patente : null,
        origen: r.origen,
      }),
    );
  },
});
