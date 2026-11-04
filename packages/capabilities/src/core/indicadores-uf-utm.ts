import { z } from "zod";

import { defineCapability } from "../define";
import { aFecha, dia, diaSchema, hoy } from "./maestros/comun";

const valorSchema = z.object({
  fecha: z.string().describe("Día desde el cual rige el valor publicado (aaaa-mm-dd)."),
  exacta: z.boolean().describe("true si hay un valor publicado para exactamente el día pedido."),
});

/** Valor numérico seguro de lo publicado, o null si no es un entero positivo. */
const entero = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
};

export const indicadoresUfUtm = defineCapability({
  id: "core.indicadores.uf_utm",
  descripcion:
    "Valor de la UF y de la UTM publicados por el SII para un día (por defecto hoy). La UF va en centavos de CLP enteros (por ejemplo 3912345 = $39.123,45) y la UTM en CLP enteros. Si no hay UF publicada para ese día exacto devuelve la última anterior marcada como no exacta; nunca inventa un valor.",
  permiso: null,
  input: z.object({ fecha: diaSchema.optional().describe("Día aaaa-mm-dd. Por defecto, hoy.") }),
  output: z.object({
    fecha: z.string(),
    uf: valorSchema.extend({ centavosClp: z.number().int() }).nullable(),
    utm: valorSchema.extend({ clp: z.number().int() }).nullable(),
  }),
  efecto: "lectura",
  dryRun: false,
  // Indicadores públicos y globales: no tocan datos de personas ni de la empresa.
  auditarLectura: () => [],
  async handler(ctx, input) {
    const fecha = input.fecha ?? hoy();
    const [uf, utm] = await Promise.all(
      (["uf", "utm"] as const).map(async (clave) => {
        const ind = await ctx.db.indicadorLegal.findFirst({
          where: { clave },
          select: { id: true },
        });
        if (!ind) return null;
        const fila = await ctx.db.valorPublicado.findFirst({
          where: { indicadorId: ind.id, estado: "vigente", vigenteDesde: { lte: aFecha(fecha) } },
          orderBy: { vigenteDesde: "desc" },
          select: { valorJson: true, vigenteDesde: true },
        });
        const valor = fila ? entero(fila.valorJson) : null;
        if (!fila || valor === null) return null;
        const desde = dia(fila.vigenteDesde) ?? fecha;
        // La UTM rige todo el mes; la UF es diaria.
        const exacta = clave === "uf" ? desde === fecha : desde.slice(0, 7) === fecha.slice(0, 7);
        return { fecha: desde, exacta, valor };
      }),
    );
    return {
      fecha,
      uf: uf ? { fecha: uf.fecha, exacta: uf.exacta, centavosClp: uf.valor } : null,
      utm: utm ? { fecha: utm.fecha, exacta: utm.exacta, clp: utm.valor } : null,
    };
  },
});
