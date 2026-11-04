import type { SugerenciaReconocer } from "./lista-sugerencias-reconocer";

/** Documento elegido para conciliar un abono, con el monto que se le asigna. */
export type Elegida = {
  id: string;
  tipo: "documento_emitido" | "documento_recibido";
  etiqueta: string;
  pendiente: number;
  monto: number;
};

export const etiquetaDoc = (folio: number | null, contraparte: string | null, tipoDte: number | null) =>
  `${tipoDte === 34 ? "Factura exenta" : tipoDte === 61 ? "Nota de crédito" : "Factura"} ${folio ?? "s/f"}${contraparte ? ` · ${contraparte}` : ""}`;

export const deSugerencia = (s: SugerenciaReconocer): Elegida => ({
  id: s.documentoId,
  tipo: s.tipo,
  etiqueta: etiquetaDoc(s.folio, s.contraparte, s.tipoDte),
  pendiente: Math.abs(s.montoPendiente),
  monto: 0,
});
