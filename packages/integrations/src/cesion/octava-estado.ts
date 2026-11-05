// Identificador de la operación (Octava no entrega uno propio) y traducción del código RPETC.
import type { OctavaAmbiente } from "./octava-api";
import type { EstadoCesionRpetc, ResultadoConsultaCesion } from "./tipos";

export type ClaveOperacionOctava = {
  ambiente: OctavaAmbiente;
  rutEmisor: string;
  tipoDte: number;
  folio: number;
};

/** `octava:<ambiente>:<rutEmisor>:<tipo>:<folio>`: alcanza para ConsultaEstadoAEC sin columnas nuevas. */
export const operacionOctavaId = (k: ClaveOperacionOctava) =>
  `octava:${k.ambiente}:${k.rutEmisor}:${k.tipoDte}:${k.folio}`;

export function leerOperacionOctavaId(id: string): ClaveOperacionOctava | null {
  const m = /^octava:([01]):([0-9Kk-]+):(\d+):(\d+)$/.exec(id);
  if (!m) return null;
  return { ambiente: m[1] as OctavaAmbiente, rutEmisor: m[2]!, tipoDte: Number(m[3]), folio: Number(m[4]) };
}

const GLOSAS: Record<string, string> = {
  RSC: "Rechazado por error de schema",
  RFS: "Rechazado por firma de sobre",
  RCR: "Rechazado por error en carátula",
  RDC: "Documento inválido",
  RCS: "Cesión inválida",
  EAN: "Envío anulado",
};

/** EOK = aceptada por el RPETC; vacío o PEN = el SII aún procesa; cualquier otro código es rechazo. */
export function estadoDesdeCodigo(codigo: string | undefined, detalle?: string): ResultadoConsultaCesion {
  const c = (codigo ?? "").trim().toUpperCase();
  if (c === "EOK") return { estado: "aprobada" };
  if (!c || c === "PEN") return { estado: "enviada" };
  const estado: EstadoCesionRpetc = "anulada";
  return { estado, glosa: `${c}: ${detalle?.trim() || GLOSAS[c] || "Rechazada por el RPETC"}` };
}
