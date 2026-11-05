import type { Contexto } from "@opai/capabilities";

import type { EstadoLista } from "../persistencia/lista-estado";
import { PERMISO_COSTOS } from "./permisos";

/**
 * Resumen de cálculo de la lista (solo con costos). Margen y semáforo salen únicamente de un cálculo
 * guardado confiable; si no lo es, `calculoConfiable: false` y la lista muestra «—» / «Recalcular», nunca
 * un 0 % inventado (CAR-192). El semáforo exige además un mínimo configurado por la empresa.
 */
export function resumenListaDesdeVersion(
  ctx: Contexto,
  v: { ventaMensualClp: number | null },
  est: EstadoLista | undefined,
  minimoConfigurado: boolean,
) {
  if (!ctx.autorizar(PERMISO_COSTOS)) return undefined;
  const c = est?.calculo ?? null;
  // Sin venta (sin puestos o en $0) no hay margen que mostrar: «pendiente», no un 0 % en rojo.
  const costoPendiente = c ? !c.ventaMensual || c.noEnviable : v.ventaMensualClp == null;
  if (costoPendiente) return { costoPendiente, calculoConfiable: true };
  if (!est?.calculoConfiable || !c) return { costoPendiente, calculoConfiable: false };
  return {
    costoPendiente,
    calculoConfiable: true,
    ...(minimoConfigurado ? { semaforo: c.semaforo } : {}),
    margenEfectivoPct: c.margenEfectivoPct,
  };
}
