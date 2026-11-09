"use client";

import { Campo, Input } from "@opai/ds";

/**
 * Fecha de emisión de la factura. La capacidad la fija sola al emitir (el día de hoy), así que aquí solo se
 * muestra; no se puede elegir otra.
 */
export function EmitirFechaEmision({ hoyIso }: { hoyIso: string }) {
  const [a, m, d] = hoyIso.split("-");
  return (
    <Campo
      etiqueta="Fecha de emisión"
      htmlFor="emit-fecha"
      ayuda="Se fija al emitir, con el día de hoy."
    >
      <Input id="emit-fecha" readOnly value={`${d}-${m}-${a}`} className="t-numeric" />
    </Campo>
  );
}
