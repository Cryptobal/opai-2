import { periodoSiguiente } from "@opai/domain";
import { z } from "zod";

import { moduloDeIndicador, type IndicadorGestion } from "../indicadores-gestion";
import { indicadoresDeclarados } from "../core/indicadores-gestion";
import { hoyEn, zonaDelTenant } from "../core/turnos/comun";
import type { Contexto } from "../types";

/** Permisos del módulo Desempeño (declarados en su manifiesto). */
export const PERMISOS_DESEMPENO = {
  scorecardsRead: "desempeno:scorecards.read",
  scorecardsManage: "desempeno:scorecards.manage",
  /** Ver el resultado propio y el de las personas a cargo. */
  resultadosVer: "desempeno:resultados.ver",
  /** Ver el resultado de cualquier persona de la empresa (gerencia y quien administra). */
  resultadosVerTodos: "desempeno:resultados.ver_todos",
} as const;

export type Meses = { zona: string; actual: string; siguiente: string };

/** Mes en curso y mes siguiente ("aaaa-mm") en la zona de la empresa. */
export async function mesesDe(ctx: Contexto): Promise<Meses> {
  const zona = await zonaDelTenant(ctx);
  const actual = hoyEn(zona).slice(0, 7);
  const [anio, mes] = actual.split("-").map(Number) as [number, number];
  const s = periodoSiguiente(anio, mes);
  return { zona, actual, siguiente: `${s.anio}-${String(s.mes).padStart(2, "0")}` };
}

/**
 * Indicadores que la empresa puede poner en un scorecard: los del núcleo y los de sus módulos
 * activos. No depende de quién consulta: el scorecard es una configuración de la empresa.
 */
export function indicadoresDeLaEmpresa(ctx: Contexto): Map<string, IndicadorGestion> {
  const activos = indicadoresDeclarados().filter((i) => {
    const modulo = moduloDeIndicador(i.id);
    return modulo === "core" || ctx.modulosActivos.includes(modulo);
  });
  return new Map(activos.map((i) => [i.id, i]));
}

export const itemSchema = z.object({
  indicador: z.string().describe("Id del indicador en el catálogo de indicadores de gestión."),
  meta: z.number().describe("Meta mensual, en la unidad del indicador."),
  peso: z.number().describe("Peso en el puntaje, en puntos porcentuales."),
});

export const scorecardSchema = z.object({
  id: z.string(),
  cargoId: z.string(),
  vigenteDesde: z.string().describe("Primer mes en que rige (aaaa-mm)."),
  estado: z.enum(["borrador", "publicado"]),
  personaVeResultado: z.boolean(),
  personaVeRanking: z.boolean(),
  sumaPesos: z.number().describe("Debe ser 100 para publicar."),
  indicadores: z.array(itemSchema),
});
export type VistaScorecard = z.infer<typeof scorecardSchema>;

type FilaScorecard = {
  id: string;
  cargoId: string;
  vigenteDesde: string;
  estado: string;
  personaVeResultado: boolean;
  personaVeRanking: boolean;
  indicadores: readonly { indicador: string; meta: unknown; peso: number; orden: number }[];
};

export function vistaScorecard(s: FilaScorecard): VistaScorecard {
  const indicadores = [...s.indicadores]
    .sort((a, b) => a.orden - b.orden)
    .map((i) => ({ indicador: i.indicador, meta: Number(i.meta), peso: i.peso }));
  return {
    id: s.id,
    cargoId: s.cargoId,
    vigenteDesde: s.vigenteDesde,
    estado: s.estado === "publicado" ? "publicado" : "borrador",
    personaVeResultado: s.personaVeResultado,
    personaVeRanking: s.personaVeRanking,
    sumaPesos: indicadores.reduce((total, i) => total + i.peso, 0),
    indicadores,
  };
}

/** Todas las versiones del scorecard de un cargo, con sus indicadores. */
export async function versionesDe(ctx: Contexto, cargoId: string): Promise<VistaScorecard[]> {
  const filas = await ctx.db.desempenoScorecard.findMany({
    where: { cargoId },
    include: { indicadores: true },
  });
  return filas.map(vistaScorecard);
}
