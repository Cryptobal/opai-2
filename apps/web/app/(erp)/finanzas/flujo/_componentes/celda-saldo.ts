import { formatearClp } from "@opai/domain";
import type { Celda } from "@opai/ds";

import type { SemanaFlujo } from "./datos";

/** Saldo final de una semana, con su tono según el umbral y si viene de la cartola o es proyectado. */
export function celdaSaldo(s: SemanaFlujo): Celda {
  const tono = s.tono === "peligro" ? "danger" : s.tono === "alerta" ? "warning" : "neutro";
  const detalle = s.pasada
    ? "Según cartola"
    : s.tono === "peligro"
      ? "Saldo negativo proyectado"
      : s.tono === "alerta"
        ? "Bajo el umbral"
        : "Proyectado";
  return { texto: formatearClp(s.saldoFinal), tono, detalle };
}
