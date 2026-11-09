import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { defineCapability } from "../define";
import { instalacionEnAlcance } from "../rondas/comun";
import { PERMISO_PATENTE, PERMISO_READ } from "./comun";

const item = z.object({
  id: uuidSchema,
  entradaEn: z.string(),
  salidaEn: z.string().nullable(),
  tipoRegistro: z.string(),
  nombre: z.string(),
  empresa: z.string().nullable(),
  documento: z.string(),
  patente: z.string().nullable(),
  origen: z.string(),
});

export const registrosListar = defineCapability({
  id: "acceso.registros.listar",
  descripcion:
    "Lista las entradas y salidas de una instalación, de la más reciente a la más antigua; con «en sitio» solo quienes siguen dentro. El documento se devuelve enmascarado; el número completo no se guarda. La patente completa solo se entrega a quien puede verla; para el resto viene vacía.",
  permiso: PERMISO_READ,
  input: z.object({
    instalacionId: uuidSchema,
    soloEnSitio: z.boolean().default(false),
    limite: z.number().int().min(1).max(200).default(50),
  }),
  output: z.array(item),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (salida) => salida.map((r) => r.id),
  async handler(ctx, { instalacionId, soloEnSitio, limite }) {
    await instalacionEnAlcance(ctx, instalacionId);
    const verPatente = ctx.autorizar(PERMISO_PATENTE);
    const filas = await ctx.db.registroAcceso.findMany({
      where: { instalacionId, ...(soloEnSitio ? { salida: null } : {}) },
      orderBy: { horaCorregida: "desc" },
      take: limite,
      include: { salida: { select: { horaCorregida: true } } },
    });
    return filas.map((r) => ({
      id: r.id,
      entradaEn: r.horaCorregida.toISOString(),
      salidaEn: r.salida?.horaCorregida.toISOString() ?? null,
      tipoRegistro: r.tipoRegistro,
      nombre: r.nombre,
      empresa: r.empresa,
      documento: r.mascara,
      patente: verPatente ? r.patente : null,
      origen: r.origen,
    }));
  },
});
