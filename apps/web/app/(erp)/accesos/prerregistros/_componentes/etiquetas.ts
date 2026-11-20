import { formatearFecha } from "@opai/domain";

import type { EstadoDia, Prerregistro } from "./datos";

const hhmm = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/** «09:00 – 13:00» o «Todo el día». */
export function horario(desdeMin: number | null, hastaMin: number | null): string {
  return desdeMin === null || hastaMin === null
    ? "Todo el día"
    : `${hhmm(desdeMin)} – ${hhmm(hastaMin)}`;
}

/** «30-10-2026» o «30-10-2026 al 01-11-2026». */
export function rango(p: Pick<Prerregistro, "desde" | "hasta">): string {
  return p.desde === p.hasta
    ? formatearFecha(p.desde)
    : `${formatearFecha(p.desde)} al ${formatearFecha(p.hasta)}`;
}

export const ESTADO_DIA: Record<
  EstadoDia,
  { etiqueta: string; tono: "info" | "neutro" | "warning" }
> = {
  pendiente: { etiqueta: "Pendiente", tono: "info" },
  no_llego: { etiqueta: "No llegó", tono: "warning" },
  cancelado: { etiqueta: "Cancelado", tono: "neutro" },
};

/** Estado que resume el prerregistro en la lista: cancelado, terminado o con días pendientes. */
export function estadoPrerregistro(p: Prerregistro) {
  if (p.cancelado) return ESTADO_DIA.cancelado;
  return p.dias.some((d) => d.estado === "pendiente") ? ESTADO_DIA.pendiente : ESTADO_DIA.no_llego;
}

/** Primer día que aún sirve para mostrar la invitación (o null si ya no hay). */
export const primerDiaPendiente = (p: Prerregistro) =>
  p.dias.find((d) => d.estado === "pendiente")?.dia ?? null;
