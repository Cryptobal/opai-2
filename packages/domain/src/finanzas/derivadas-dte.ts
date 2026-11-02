// Comprometido DTE al leer (CAR-140, ADR-026): semana de emisión sin arrastre + borradores.

import { signoDte, type TipoDteCompra } from "./compras";
import { lunesDe } from "./flujo-semana";

export type DocumentoDerivadaDte = {
  id: string;
  tipoDte: number;
  folio: number | null;
  fechaEmision: string | null;
  fechaVencimiento: string | null;
  montoTotal: number;
  montoCobrado: number;
  estadoDte: string;
  estadoCobro: string;
  cesionEstado: string | null;
  glosa: string | null;
};

export type CeldaDerivadaDte = {
  documentoId: string;
  semana: string;
  monto: number;
  capa: "comprometido";
  etiqueta: string;
};

function montoPendiente(d: DocumentoDerivadaDte): number {
  return Math.max(0, d.montoTotal - d.montoCobrado);
}

/** Semana ISO (lunes) donde aporta comprometido; null si no aplica a la semana pedida. */
export function semanaComprometidoDte(d: DocumentoDerivadaDte): string | null {
  if (d.cesionEstado === "cedido" || d.estadoCobro === "cedida") return null;
  if (d.estadoDte === "borrador") {
    const ref = d.fechaVencimiento ?? d.fechaEmision;
    return ref ? lunesDe(ref) : null;
  }
  if (!["enviado", "aceptado"].includes(d.estadoDte)) return null;
  if (d.estadoCobro === "pagada" || montoPendiente(d) === 0) return null;
  if (!d.fechaEmision) return null;
  return lunesDe(d.fechaEmision);
}

export function celdasDerivadasDte(
  docs: readonly DocumentoDerivadaDte[],
  semana: string,
): CeldaDerivadaDte[] {
  const out: CeldaDerivadaDte[] = [];
  for (const d of docs) {
    const sem = semanaComprometidoDte(d);
    if (!sem || sem !== semana) continue;
    const pendiente = d.estadoDte === "borrador" ? d.montoTotal : montoPendiente(d);
    if (pendiente <= 0) continue;
    const signo = signoDte(d.tipoDte as TipoDteCompra);
    const folio = d.folio != null ? ` folio ${d.folio}` : "";
    out.push({
      documentoId: d.id,
      semana: sem,
      monto: signo * pendiente,
      capa: "comprometido",
      etiqueta: `DTE ${d.tipoDte}${folio}${d.glosa ? ` · ${d.glosa}` : ""}`,
    });
  }
  return out;
}
