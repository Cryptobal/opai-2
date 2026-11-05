import { pesos } from "@/lib/fechas";
import { estadoCpqBadge, margenPctTexto, tonoEstadoFicha } from "@/lib/cpq-presentacion";

import type { CotizacionFila } from "./datos";

export function ventaLista(c: CotizacionFila) {
  const pendiente = c.resumenCalculo?.costoPendiente ?? c.version?.ventaMensualClp == null;
  if (pendiente) return "Pendiente";
  return pesos(c.version!.ventaMensualClp!);
}

export function margenLista(c: CotizacionFila, costos: boolean) {
  if (!costos) return null;
  const r = c.resumenCalculo;
  if (!r || r.costoPendiente) return "Pendiente";
  if (!r.calculoConfiable || r.margenEfectivoPct == null) return "—";
  return margenPctTexto(r.margenEfectivoPct);
}

/** Estado de la fila: el de la ficha; si el cálculo guardado no alcanza, el persistido sin inventar más. */
export function estadoLista(c: CotizacionFila) {
  if (c.estadoFicha) return { etiqueta: c.estadoFicha.etiqueta, tono: tonoEstadoFicha(c.estadoFicha.estado) };
  return estadoCpqBadge(c.version?.estado ?? "borrador");
}

/** El margen guardado no es confiable: la lista no lo muestra y pide recalcular abriendo la cotización. */
export const pideRecalcular = (c: CotizacionFila, costos: boolean) =>
  costos && c.resumenCalculo !== undefined && !c.resumenCalculo.costoPendiente && !c.resumenCalculo.calculoConfiable;
