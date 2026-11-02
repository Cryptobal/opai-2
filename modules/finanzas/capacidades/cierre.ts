import { z } from "zod";

import { defineCapability } from "@opai/capabilities";

import { aNumeroSeguro, saldoSchema, semanaSchema } from "./esquemas";
import { PERMISO_VER } from "./permisos";
import { aIso } from "./util";

const cierreSchema = z.object({
  semana: semanaSchema,
  saldoSugerido: saldoSchema,
  saldoBanco: saldoSchema,
  diferencia: saldoSchema,
  motivo: z.string().nullable(),
  sellada: z.boolean(),
});

type FilaCierre = {
  semana: Date | string;
  saldoSugerido: bigint | number;
  saldoBanco: bigint | number;
  motivo: string | null;
  sellada: boolean;
};
const vista = (c: FilaCierre) => {
  const sugerido = aNumeroSeguro(c.saldoSugerido);
  const banco = aNumeroSeguro(c.saldoBanco);
  return {
    semana: aIso(c.semana),
    saldoSugerido: sugerido,
    saldoBanco: banco,
    diferencia: banco - sugerido,
    motivo: c.motivo,
    sellada: c.sellada,
  };
};

/** Solo lectura histórica de sellados previos al flujo v2 (sin sellar ni reabrir). */
export const cierresListar = defineCapability({
  id: "finanzas.cierres.listar",
  descripcion:
    "Lista registros históricos de cierres semanales del flujo (solo lectura; el cierre manual ya no aplica).",
  permiso: PERMISO_VER,
  input: z.object({}),
  output: z.array(cierreSchema),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    return (await ctx.db.flujoCierre.findMany({ orderBy: { semana: "desc" } })).map(vista);
  },
});
