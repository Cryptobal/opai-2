// Indicador corto del seguimiento en la tarjeta del tablero de negocios (spec §4, CAR-160): «Seguimiento
// 2 de 4 · hoy», «Vencido», «Pausado» o «Con fallos». Lógica pura sobre el estado y los pasos.
import { fechaLocal } from "./seguimiento-agenda";
import { type EstadoPaso, esPasoPendiente, proximoPaso } from "./seguimiento-estado";

export type TonoIndicador = "neutro" | "info" | "warning" | "danger";
export type IndicadorSeguimiento = { texto: string; tono: TonoIndicador };
type PasoIndicador = { orden: number; estado: EstadoPaso; programadoEn: Date };

/**
 * Lo que muestra la tarjeta para el seguimiento vivo de un negocio, o `null` si no corresponde (sin
 * seguimiento, terminado, cancelado o sin pasos pendientes). Un paso pendiente de un día anterior al de
 * hoy (en la zona del tenant) es «Vencido»; el número es el orden del próximo paso sobre el total.
 */
export function indicadorSeguimiento(
  estado: string,
  pasos: readonly PasoIndicador[],
  ahora: Date,
  zona: string,
): IndicadorSeguimiento | null {
  if (estado === "pausado") return { texto: "Pausado", tono: "neutro" };
  if (estado !== "activo") return null;
  const prox = proximoPaso(pasos);
  if (!prox) return null;
  if (pasos.some((p) => p.estado === "fallido")) return { texto: "Con fallos", tono: "danger" };
  const hoy = fechaLocal(ahora, zona);
  if (pasos.some((p) => esPasoPendiente(p.estado) && fechaLocal(p.programadoEn, zona) < hoy))
    return { texto: "Vencido", tono: "danger" };
  const esHoy = fechaLocal(prox.programadoEn, zona) === hoy;
  return {
    texto: `Seguimiento ${prox.orden} de ${pasos.length}${esHoy ? " · hoy" : ""}`,
    tono: esHoy ? "warning" : "info",
  };
}
