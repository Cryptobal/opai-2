/** Etiquetas en español de los estados de una venta: ningún estado interno llega a la pantalla (B4). */
type Tono = "neutro" | "info" | "success" | "warning" | "danger";

const ESTADO_DTE: Record<string, { etiqueta: string; tono: Tono }> = {
  borrador: { etiqueta: "Borrador", tono: "neutro" },
  enviado: { etiqueta: "Enviada al SII", tono: "info" },
  aceptado: { etiqueta: "Aceptada por el SII", tono: "success" },
  aceptado_sii: { etiqueta: "Aceptada por el SII", tono: "success" },
  rechazado: { etiqueta: "Rechazada por el SII", tono: "danger" },
  anulado_nc: { etiqueta: "Anulada por nota de crédito", tono: "warning" },
  anulado_nd: { etiqueta: "Nota de crédito anulada por nota de débito", tono: "warning" },
};

const ESTADO_COBRO: Record<string, { etiqueta: string; tono: Tono }> = {
  pendiente: { etiqueta: "Por cobrar", tono: "neutro" },
  pagada_parcial: { etiqueta: "Pago parcial", tono: "warning" },
  pagada: { etiqueta: "Pagada", tono: "success" },
  cedida: { etiqueta: "Cedida", tono: "info" },
  anulada: { etiqueta: "Anulada", tono: "neutro" },
};

const ESTADO_CESION: Record<string, { etiqueta: string; tono: Tono }> = {
  simulado: { etiqueta: "Simulada", tono: "neutro" },
  emitido: { etiqueta: "En curso", tono: "info" },
  solicitado: { etiqueta: "Solicitada", tono: "info" },
  cedido: { etiqueta: "Cedida", tono: "success" },
  rechazado: { etiqueta: "Rechazada", tono: "danger" },
};

/** Si aparece un estado nuevo sin etiqueta, se muestra neutro y sin el código interno. */
const DESCONOCIDO = { etiqueta: "Sin clasificar", tono: "neutro" as Tono };

const FIRMADA = { etiqueta: "Firmada, sin enviar al SII", tono: "warning" as Tono };

/** Con `trackIdSii` (sin `undefined`), una firmada que aún no llega al SII no se presenta como enviada (CAR-270). */
export const estadoDteVenta = (e: string, trackIdSii?: string | null) =>
  e === "enviado" && trackIdSii === null ? FIRMADA : (ESTADO_DTE[e] ?? DESCONOCIDO);

/** Firmada (aunque una NC o ND ya la haya anulado) y sin track ID: falta transmitirla al SII. */
export const porTransmitir = (v: { estadoDte: string; trackIdSii: string | null }) =>
  v.trackIdSii === null && (v.estadoDte === "enviado" || v.estadoDte === "anulado_nc" || v.estadoDte === "anulado_nd");
export const estadoCobroVenta = (e: string) => ESTADO_COBRO[e] ?? DESCONOCIDO;
export const estadoCesionVenta = (e: string) => ESTADO_CESION[e] ?? DESCONOCIDO;

/** Título corto de un documento: «Factura 33 · Folio 1204» o «Borrador · Factura 33». */
export function tituloVenta(v: { folio: number | null; tipoDteNombre: string }): string {
  return v.folio ? `${v.tipoDteNombre} · folio ${v.folio}` : `Borrador · ${v.tipoDteNombre}`;
}
