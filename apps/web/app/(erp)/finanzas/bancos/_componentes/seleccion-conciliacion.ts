import type { SugerenciaReconocer } from "./lista-sugerencias-reconocer";

/** Documento elegido para conciliar un abono, con el monto que se le asigna. */
export type Elegida = {
  id: string;
  tipo: "documento_emitido" | "documento_recibido";
  etiqueta: string;
  pendiente: number;
  monto: number;
};

export const etiquetaDoc = (
  folio: number | null,
  contraparte: string | null,
  tipoDte: number | null,
) =>
  `${tipoDte === 34 ? "Factura exenta" : tipoDte === 61 ? "Nota de crédito" : "Factura"} ${folio ?? "s/f"}${contraparte ? ` · ${contraparte}` : ""}`;

export const deSugerencia = (s: SugerenciaReconocer): Elegida => ({
  id: s.documentoId,
  tipo: s.tipo,
  etiqueta: etiquetaDoc(s.folio, s.contraparte, s.tipoDte),
  pendiente: Math.abs(s.montoPendiente),
  monto: 0,
});

/**
 * Agrega un documento a la selección con su monto inicial: lo que le falta de pagar, sin pasar de lo que queda del
 * abono. Así un abono que calza con una factura queda listo para confirmar; «Prorratear» y el campo siguen sirviendo
 * para repartir distinto.
 */
export function conMontoInicial(
  elegidas: readonly Elegida[],
  nueva: Elegida,
  abono: number,
): Elegida[] {
  const asignado = elegidas.reduce((suma, e) => suma + e.monto, 0);
  const restante = Math.max(0, abono - asignado);
  return [...elegidas, { ...nueva, monto: Math.min(nueva.pendiente, restante) }];
}
