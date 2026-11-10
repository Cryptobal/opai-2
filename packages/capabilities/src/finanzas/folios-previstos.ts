// Selección pura de los folios a usar (sin base): CAF activos, vigentes, con folios y del ambiente requerido (CAR-240).

import { cafVencido } from "@opai/domain";

import { reglaDeNegocio } from "../errores";
import { cafSirveParaEmitir, errorSinCafDelAmbiente } from "./caf-ambiente";

type CfgEmision = Parameters<typeof cafSirveParaEmitir>[0];
export type RangoPrevisto = {
  folioDesde: number;
  folioHasta: number;
  folioActual: number;
  cafVenceEn: Date | null;
  cafAmbiente?: string | null;
  cafIdk?: string | null;
};

/**
 * Rangos que sirven para emitir, en orden. Se SALTAN los de otro ambiente (no cortan la búsqueda). Si no queda
 * ninguno, el error dice por qué: sin folios, solo vencidos o solo de otro ambiente.
 */
export function rangosParaEmitir<R extends RangoPrevisto>(
  rangos: readonly R[],
  cfg: CfgEmision,
  hoyIso: string,
  tipoDte: number,
): R[] {
  const conFolios = rangos.filter((r) => r.folioActual <= r.folioHasta);
  const vigentes = conFolios.filter((r) => !cafVencido(r.cafVenceEn?.toISOString().slice(0, 10) ?? null, hoyIso));
  const utiles = vigentes.filter((r) => cafSirveParaEmitir(cfg, r));
  if (utiles.length > 0) return utiles;
  if (vigentes.length > 0) throw errorSinCafDelAmbiente(cfg, tipoDte);
  if (conFolios.length > 0) throw reglaDeNegocio("El CAF vigente está vencido; cargue un CAF nuevo antes de emitir.");
  throw reglaDeNegocio(`No hay folios disponibles para el DTE ${tipoDte}. Cargue un CAF.`);
}

export function seleccionarFoliosPrevistos(
  rangos: readonly RangoPrevisto[],
  cfg: CfgEmision,
  hoyIso: string,
  tipoDte: number,
  cantidad: number,
): number[] {
  const folios: number[] = [];
  for (const r of rangosParaEmitir(rangos, cfg, hoyIso, tipoDte)) {
    for (let f = r.folioActual; f <= r.folioHasta && folios.length < cantidad; f++) folios.push(f);
    if (folios.length >= cantidad) break;
  }
  if (folios.length < cantidad) {
    throw reglaDeNegocio(`No hay folios disponibles para el DTE ${tipoDte}. Cargue un CAF.`);
  }
  return folios;
}
