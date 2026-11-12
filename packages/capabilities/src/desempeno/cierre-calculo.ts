import { periodoSiguiente, versionVigente } from "@opai/domain";
import type { Prisma } from "@opai/db";

import type { Contexto } from "../types";
import { type DetalleIndicador, resultadosDe } from "./calculo";
import { versionesDe } from "./comun";

/** "2026-12" → "2027-01". */
export function mesSiguiente(periodo: string): string {
  const s = periodoSiguiente(Number(periodo.slice(0, 4)), Number(periodo.slice(5, 7)));
  return `${s.anio}-${String(s.mes).padStart(2, "0")}`;
}

export type FilaCierre = {
  personaId: string;
  cargoId: string;
  jefePersonaId: string | null;
  scorecardId: string;
  vigenteDesde: string;
  puntaje: number | null;
  cobertura: number;
  indicadores: DetalleIndicador[];
};

/**
 * Resultado de cada persona en `periodo`, para guardarlo al cerrar el mes. Cuenta a quienes tuvieron
 * un vínculo laboral que tocó el mes (vigente o ya terminado); si cambió de cargo dentro del mes,
 * cuenta el último cargo que tuvo. Solo entran los cargos con scorecard publicado para ese mes.
 */
export async function calcularCierre(ctx: Contexto, periodo: string, zona: string): Promise<FilaCierre[]> {
  const desde = new Date(`${periodo}-01T00:00:00Z`);
  const hasta = new Date(`${mesSiguiente(periodo)}-01T00:00:00Z`);
  const vinculos = await ctx.db.vinculoLaboral.findMany({
    where: {
      inicio: { lt: hasta },
      OR: [{ termino: null }, { termino: { gte: desde } }],
      persona: { anonimizadaEn: null },
    },
    select: { personaId: true, cargoId: true, inicio: true },
    orderBy: { inicio: "asc" },
  });
  // El último vínculo que tocó el mes manda: se recorre en orden y se sobrescribe.
  const cargoDe = new Map<string, string>();
  for (const v of vinculos) cargoDe.set(v.personaId, v.cargoId);
  const porCargo = new Map<string, string[]>();
  for (const [personaId, cargoId] of cargoDe) porCargo.set(cargoId, [...(porCargo.get(cargoId) ?? []), personaId]);

  const filas: FilaCierre[] = [];
  for (const [cargoId, ids] of porCargo) {
    const scorecard = versionVigente(await versionesDe(ctx, cargoId), periodo);
    if (!scorecard) continue;
    const personas = await ctx.db.persona.findMany({
      where: { id: { in: ids } },
      select: { id: true, usuarioId: true, jefePersonaId: true },
    });
    const resultados = await resultadosDe(ctx, scorecard, personas, periodo, zona);
    for (const p of personas) {
      const r = resultados.get(p.id);
      filas.push({
        personaId: p.id,
        cargoId,
        jefePersonaId: p.jefePersonaId,
        scorecardId: scorecard.id,
        vigenteDesde: scorecard.vigenteDesde,
        puntaje: r?.puntaje ?? null,
        cobertura: r?.cobertura ?? 0,
        indicadores: r?.indicadores ?? [],
      });
    }
  }
  return filas;
}

/** Fila lista para `createMany` de `desempeno.resultados_cerrados`. */
export function filaParaGuardar(
  tenantId: string,
  periodo: string,
  f: FilaCierre,
): Prisma.DesempenoResultadoCerradoCreateManyInput {
  return {
    tenantId,
    periodo,
    personaId: f.personaId,
    cargoId: f.cargoId,
    jefePersonaId: f.jefePersonaId,
    scorecardId: f.scorecardId,
    vigenteDesde: f.vigenteDesde,
    puntaje: f.puntaje === null ? null : Math.round(f.puntaje * 100) / 100,
    cobertura: Math.round(f.cobertura * 100) / 100,
    indicadores: f.indicadores,
  };
}
