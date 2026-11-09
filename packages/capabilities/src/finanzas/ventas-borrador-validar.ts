import { montoLineaVenta } from "@opai/domain/ventas-lineas";

import { reglaDeNegocio } from "../errores";
import { hoy } from "../core/maestros/comun";

type LineaBorrador = { monto: number; cantidad?: string | undefined; precioUnitario?: number | undefined; descuentoPct?: number | undefined };

/** Fecha de emisión de un borrador: la elegida (hoy o anterior) o la de hoy. */
export function fechaEmisionBorrador(elegida: string | undefined): string {
  const emision = elegida ?? hoy();
  if (emision > hoy()) throw reglaDeNegocio("La fecha de emisión no puede ser posterior a hoy.");
  return emision;
}

/** Si la línea trae cantidad y precio, su monto debe ser cantidad × precio − descuento (el PDF imprime los tres). */
export function validarMontosDeLineas(lineas: readonly LineaBorrador[]): void {
  lineas.forEach((l, i) => {
    if (l.cantidad === undefined || l.precioUnitario === undefined) return;
    const esperado = montoLineaVenta({
      cantidad: l.cantidad,
      precioUnitario: l.precioUnitario,
      descuentoPct: l.descuentoPct ?? 0,
    });
    if (esperado !== l.monto)
      throw reglaDeNegocio(`El monto de la línea ${i + 1} no cuadra: cantidad × precio − descuento da ${esperado}.`);
  });
}
