import { reglaDeNegocio } from "@opai/capabilities";

/** ADR-073: los ingresos no se ajustan a mano; solo los egresos se planifican a mano. */
export const MENSAJE_SIN_INGRESOS =
  "Los ingresos no se ajustan a mano: salen de las facturas, la cartola y la proyección. Solo los egresos se planifican a mano.";

/** Rechaza escribir a mano en una fila de ingresos (fijar, cumplir, importar). */
export function exigirFilaDeEgreso(fila: { seccion: string }): void {
  if (fila.seccion === "ingreso") throw reglaDeNegocio(MENSAJE_SIN_INGRESOS);
}
