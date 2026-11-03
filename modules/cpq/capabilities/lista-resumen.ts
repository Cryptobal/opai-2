import type { Contexto } from "@opai/capabilities";

import { PERMISO_COSTOS } from "./permisos";

export function resumenListaDesdeVersion(
  ctx: Contexto,
  v: { ventaMensualClp: number | null; calculoCongeladoJson: string | null },
) {
  if (!ctx.autorizar(PERMISO_COSTOS)) return undefined;
  let costoPendiente = v.ventaMensualClp == null;
  if (!v.calculoCongeladoJson) return { costoPendiente };
  try {
    const p = JSON.parse(v.calculoCongeladoJson) as {
      ventaMensual?: number | null;
      semaforo?: "verde" | "amarillo" | "rojo";
      margenEfectivoPct?: number;
      noEnviable?: boolean;
    };
    costoPendiente = p.ventaMensual == null || Boolean(p.noEnviable);
    return {
      costoPendiente,
      ...(p.semaforo ? { semaforo: p.semaforo } : {}),
      ...(p.margenEfectivoPct != null && p.margenEfectivoPct >= 0
        ? { margenEfectivoPct: p.margenEfectivoPct }
        : {}),
    };
  } catch {
    return { costoPendiente };
  }
}
