// Selección pura de los próximos folios (sin base): vencimiento, agotados y ambiente del CAF.

import { cafVencido } from "@opai/domain";

import { reglaDeNegocio } from "../errores";
import { exigirCafDelAmbiente } from "./caf-ambiente";

type CfgEmision = Parameters<typeof exigirCafDelAmbiente>[0];
export type RangoPrevisto = {
  folioDesde: number;
  folioHasta: number;
  folioActual: number;
  cafVenceEn: Date | null;
  cafAmbiente?: string | null;
  cafIdk?: string | null;
};

export function seleccionarFoliosPrevistos(
  rangos: readonly RangoPrevisto[],
  cfg: CfgEmision,
  hoyIso: string,
  tipoDte: number,
  cantidad: number,
): number[] {
  const folios: number[] = [];
  for (const r of rangos) {
    if (cafVencido(r.cafVenceEn?.toISOString().slice(0, 10) ?? null, hoyIso)) continue;
    if (r.folioActual > r.folioHasta) continue;
    exigirCafDelAmbiente(cfg, r);
    for (let f = r.folioActual; f <= r.folioHasta && folios.length < cantidad; f++) folios.push(f);
    if (folios.length >= cantidad) break;
  }
  if (folios.length < cantidad) {
    throw reglaDeNegocio(`No hay folios disponibles para el DTE ${tipoDte}. Cargue un CAF.`);
  }
  return folios;
}
