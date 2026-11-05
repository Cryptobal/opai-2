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
    // Sin venta (sin puestos o en $0) no hay margen que mostrar: «pendiente», no un 0 % en rojo (CAR-192).
    costoPendiente = !p.ventaMensual || Boolean(p.noEnviable);
    if (costoPendiente) return { costoPendiente };
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
