import { pesos } from "@/lib/fechas";
import { margenPctTexto } from "@/lib/cpq-presentacion";

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
  if (r.margenEfectivoPct == null) return "—";
  return margenPctTexto(r.margenEfectivoPct);
}
