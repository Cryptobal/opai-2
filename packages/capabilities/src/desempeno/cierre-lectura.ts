import { z } from "zod";

import type { Contexto } from "../types";
import type { DetalleIndicador } from "./calculo";

const detalleSchema = z.array(
  z.object({
    indicador: z.string(),
    nombre: z.string(),
    unidad: z.string().nullable(),
    meta: z.number(),
    peso: z.number(),
    valor: z.number().nullable(),
    logro: z.number().nullable(),
    disponible: z.boolean(),
  }),
);

/** true si el mes ya se cerró: su resultado se lee de lo guardado y no se recalcula. */
export async function estaCerrado(ctx: Contexto, periodo: string): Promise<boolean> {
  const p = await ctx.db.desempenoPeriodoCerrado.findFirst({ where: { periodo }, select: { id: true } });
  return p !== null;
}

type Guardado = {
  cargoId: string;
  scorecardId: string;
  vigenteDesde: string;
  puntaje: number | null;
  cobertura: number;
  indicadores: DetalleIndicador[];
};

function deFila(f: {
  cargoId: string;
  scorecardId: string;
  vigenteDesde: string;
  puntaje: unknown;
  cobertura: unknown;
  indicadores: unknown;
}): Guardado {
  const detalle = detalleSchema.safeParse(f.indicadores);
  return {
    cargoId: f.cargoId,
    scorecardId: f.scorecardId,
    vigenteDesde: f.vigenteDesde,
    puntaje: f.puntaje === null ? null : Number(f.puntaje),
    cobertura: Number(f.cobertura),
    indicadores: detalle.success ? detalle.data : [],
  };
}

/** Resultado guardado de una persona en un mes cerrado; null si ese mes no tuvo resultado. */
export async function personaCerrada(
  ctx: Contexto,
  personaId: string,
  periodo: string,
): Promise<(Guardado & { personaVeResultado: boolean }) | null> {
  const f = await ctx.db.desempenoResultadoCerrado.findFirst({ where: { periodo, personaId } });
  if (!f) return null;
  // Quién ve su propio resultado lo decide la versión del scorecard que rigió ese mes.
  const version = await ctx.db.desempenoScorecard.findFirst({
    where: { id: f.scorecardId },
    select: { personaVeResultado: true },
  });
  return { ...deFila(f), personaVeResultado: version?.personaVeResultado ?? false };
}

/** Resultados guardados de las personas que ese mes tenían el cargo (no las de hoy). */
export async function cargoCerrado(
  ctx: Contexto,
  cargoId: string,
  periodo: string,
): Promise<{ personaId: string; vigenteDesde: string; personaVeResultado: boolean; puntaje: number | null; cobertura: number }[]> {
  const filas = await ctx.db.desempenoResultadoCerrado.findMany({ where: { periodo, cargoId } });
  const versiones = await ctx.db.desempenoScorecard.findMany({
    where: { id: { in: [...new Set(filas.map((f) => f.scorecardId))] } },
    select: { id: true, personaVeResultado: true },
  });
  const ve = new Map(versiones.map((v) => [v.id, v.personaVeResultado]));
  return filas.map((f) => {
    const g = deFila(f);
    return {
      personaId: f.personaId,
      vigenteDesde: g.vigenteDesde,
      personaVeResultado: ve.get(f.scorecardId) ?? false,
      puntaje: g.puntaje,
      cobertura: g.cobertura,
    };
  });
}
