import type { CeldaPauta, MotivoPpc } from "./tipos";

export type ResumenCobertura = {
  /** Turnos que debían cubrirse en el período (cubiertos + PPC). */
  programados: number;
  cubiertos: number;
  ppc: number;
  /** Porcentaje de cobertura con un decimal; null si no había turnos programados. */
  cobertura: number | null;
  ppcPorMotivo: Partial<Record<MotivoPpc, number>>;
};

/** Resume la cobertura de un conjunto de celdas (de un puesto, una instalación o todas). */
export function resumirCobertura(celdas: readonly CeldaPauta[]): ResumenCobertura {
  let cubiertos = 0;
  let ppc = 0;
  const ppcPorMotivo: Partial<Record<MotivoPpc, number>> = {};
  for (const c of celdas) {
    if (c.estado === "cubierto") cubiertos++;
    else if (c.estado === "ppc") {
      ppc++;
      if (c.motivo) ppcPorMotivo[c.motivo] = (ppcPorMotivo[c.motivo] ?? 0) + 1;
    }
  }
  const programados = cubiertos + ppc;
  const cobertura = programados === 0 ? null : Math.round((cubiertos / programados) * 1000) / 10;
  return { programados, cubiertos, ppc, cobertura, ppcPorMotivo };
}
