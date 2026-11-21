import { z } from "zod";

import {
  DIAS_RETENCION_INTENTO_DENEGADO,
  DIAS_RETENCION_REGISTRO_ACCESO,
  fechaCorte,
} from "@opai/domain";
import type { TenantTx } from "@opai/db";

import { defineTrabajo } from "../trabajos/registro";
import type { Contexto } from "../types";

const LOTE = 200;
const MAX_LOTES = 25;

async function loteSql(
  tx: TenantTx,
  fn: "registros" | "intentos",
  corte: Date,
): Promise<number> {
  const filas =
    fn === "registros"
      ? await tx.$queryRaw<{ n: bigint }[]>`
          SELECT acceso.anonimizar_registros_vencidos(${corte}::timestamptz, ${LOTE}::int) AS n`
      : await tx.$queryRaw<{ n: bigint }[]>`
          SELECT acceso.anonimizar_intentos_vencidos(${corte}::timestamptz, ${LOTE}::int) AS n`;
  return Number(filas[0]?.n ?? 0n);
}

async function correr(
  ctx: Contexto,
  fn: "registros" | "intentos",
  corte: Date,
): Promise<number> {
  let total = 0;
  for (let i = 0; i < MAX_LOTES; i++) {
    const n = await ctx.transaccion((tx) => loteSql(tx, fn, corte));
    total += n;
    if (n < LOTE) break;
  }
  return total;
}

/** Anonimiza registros (90 días) e intentos denegados (180 días) vencidos (R18). */
export const trabajoRetencionAcceso = defineTrabajo({
  tipo: "acceso.retencion.anonimizar",
  descripcion:
    "Anonimiza a diario los registros de acceso y los intentos denegados que superaron su plazo de retención.",
  periodicidad: "diaria",
  payload: z.object({ dia: z.string() }).passthrough(),
  async handler(ctx) {
    if (!ctx.modulosActivos.includes("acceso")) return { registros: 0, intentos: 0 };
    const ahora = new Date();
    const corteReg = fechaCorte(ahora, DIAS_RETENCION_REGISTRO_ACCESO);
    const corteInt = fechaCorte(ahora, DIAS_RETENCION_INTENTO_DENEGADO);
    const registros = corteReg ? await correr(ctx, "registros", corteReg) : 0;
    const intentos = corteInt ? await correr(ctx, "intentos", corteInt) : 0;
    return { registros, intentos };
  },
});