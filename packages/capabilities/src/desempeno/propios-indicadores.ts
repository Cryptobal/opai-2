import { UNIDADES_INDICADOR } from "@opai/domain";

import type { IndicadorGestion } from "../indicadores-gestion";
import type { Contexto } from "../types";
import { indicadoresDeLaEmpresa, PERMISOS_DESEMPENO } from "./comun";
import { aDominio, erroresPara, medirPropio, sujetoDe, type VistaPropio } from "./propios-comun";
import { propiosDe } from "./propios-lectura";

type Unidad = (typeof UNIDADES_INDICADOR)[number];
const esUnidad = (u: string): u is Unidad => UNIDADES_INDICADOR.some((x) => x === u);

/** Un indicador propio publicado, con la misma forma que los del catálogo para medirlo igual. */
function comoIndicador(ctx: Contexto, p: VistaPropio): IndicadorGestion {
  const definicion = aDominio(p.definicion);
  return {
    id: p.indicador,
    nombre: p.nombre,
    descripcion: p.descripcion ?? p.nombre,
    tipo: "resultado",
    unidad: esUnidad(p.unidad) ? p.unidad : "cantidad",
    sentido: p.sentido,
    sujeto: sujetoDe(ctx, definicion),
    metaSugerida: p.metaSugerida,
    origen: "indicador propio de la empresa",
    permiso: PERMISOS_DESEMPENO.scorecardsRead,
    async medir(c, { rango, sujetos }) {
      const valores = await medirPropio(c, definicion, rango);
      const pedidos = sujetos ? new Set(sujetos) : null;
      return [...valores]
        .filter(([sujetoId]) => !pedidos || pedidos.has(sujetoId))
        .map(([sujetoId, valor]) => ({ sujetoId, valor }));
    },
  };
}

/**
 * Indicadores que la empresa puede usar o medir en `periodo`: los del catálogo (núcleo y módulos
 * activos) más sus propios publicados que rigen ese mes. Los archivados solo entran con
 * `conArchivados` (para seguir midiendo meses en que estuvieron en un scorecard).
 */
export async function indicadoresPara(
  ctx: Contexto,
  periodo: string,
  opciones: { conArchivados?: boolean } = {},
): Promise<Map<string, IndicadorGestion>> {
  const mapa = indicadoresDeLaEmpresa(ctx);
  for (const p of await propiosDe(ctx, periodo)) {
    if (p.estado !== "publicado" || p.vigenteDesde > periodo) continue;
    if (p.archivado && !opciones.conArchivados) continue;
    // Si un hecho ya no está disponible (su módulo se apagó), el indicador no se puede medir.
    if (erroresPara(ctx, aDominio(p.definicion), false).length > 0) continue;
    mapa.set(p.indicador, comoIndicador(ctx, p));
  }
  return mapa;
}
