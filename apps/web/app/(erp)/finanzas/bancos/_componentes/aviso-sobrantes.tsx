"use client";

import { formatearNumero } from "@opai/domain";
import { Alerta, Checkbox } from "@opai/ds";

import { fecha } from "@/lib/fechas";

import type { VistaCartolaPreview } from "./tipos-cartola";

const movs = (n: number) => `${n} ${n === 1 ? "movimiento" : "movimientos"}`;

/**
 * CAR-450: lo del banco en línea que la cartola no trae, en su período. Si la cartola cuadra, contarlo además
 * duplica el período; al importar se quita como descarte restaurable (Importaciones › Movimientos borrados).
 */
export function AvisoSobrantes({
  sobrantes,
  quitar,
  onQuitar,
}: {
  sobrantes: VistaCartolaPreview["sobrantesEnLinea"];
  quitar: boolean;
  onQuitar: (v: boolean) => void;
}) {
  if (!sobrantes.length) return null;
  return (
    <Alerta tono="warning" titulo={`${movs(sobrantes.length)} del banco en línea que la cartola no trae`}>
      <p>
        Están dentro del período de la cartola y la cartola cuadra, así que contarlos además duplica el período. Si los
        quitas, quedan en Importaciones › Movimientos borrados y los puedes restaurar.
      </p>
      <ul className="my-2 max-h-32 overflow-auto">
        {sobrantes.slice(0, 20).map((s) => (
          <li key={s.id} className="t-caption">{`${fecha(s.fecha)} · ${formatearNumero(s.monto)} CLP · ${s.glosa}`}</li>
        ))}
      </ul>
      <Checkbox marcado={quitar} onCambiar={onQuitar} etiqueta={`Quitar ${movs(sobrantes.length)} al importar`} />
    </Alerta>
  );
}

/** Se importa si la cartola cuadra (o no trae saldos) y trae algo nuevo o hay sobrantes que quitar (CAR-450). */
export function hayQueImportar(v: VistaCartolaPreview, quitar: boolean): boolean {
  if (v.cuadratura?.cuadra === false) return false;
  return v.aplicados > 0 || (quitar && (v.sobrantesEnLinea?.length ?? 0) > 0);
}
