import { normalizarRut } from "../../rut";

export const TOLERANCIA_CLP = 1;

export type NivelConciliacion = "saldo_pendiente" | "total" | "sin_calce";

export type SugerenciaConciliacion = {
  documentoId: string;
  tipo: "documento_emitido" | "documento_recibido";
  nivel: NivelConciliacion;
  confianza: number;
  motivo: string;
  montoDocumento: number;
  montoPendiente: number;
  diferencia: number;
};

type DocCandidato = {
  id: string;
  tipo: "documento_emitido" | "documento_recibido";
  montoTotal: number;
  montoPendiente: number;
  rut: string | null;
  glosa: string | null;
  fecha: string | null;
};

export function sugerirConciliacion(
  movimiento: { monto: number; glosa: string; fecha: string },
  docs: DocCandidato[],
  opts?: { montosUnicosVentana?: Map<number, number> },
): SugerenciaConciliacion[] {
  const abs = Math.abs(movimiento.monto);
  const rutGlosa = rutEnGlosa(movimiento.glosa);
  const out: SugerenciaConciliacion[] = [];

  for (const d of docs) {
    const diffPend = Math.abs(d.montoPendiente - abs);
    const diffTotal = Math.abs(d.montoTotal - abs);
    let nivel: NivelConciliacion = "sin_calce";
    if (diffPend <= TOLERANCIA_CLP) nivel = "saldo_pendiente";
    else if (diffTotal <= TOLERANCIA_CLP) nivel = "total";
    if (nivel === "sin_calce") continue;

    let confianza = 0.5;
    let motivo = `Nivel ${nivel === "saldo_pendiente" ? "saldo pendiente" : "total"} (±${TOLERANCIA_CLP} CLP)`;
    if (rutGlosa && d.rut && rutGlosa === normalizarRut(d.rut)) {
      confianza = 1;
      motivo = "RUT en la glosa coincide con el documento";
    } else if (opts?.montosUnicosVentana?.get(abs) === 1) {
      confianza = 0.7;
      motivo = "Monto único en ±15 días";
    }

    out.push({
      documentoId: d.id,
      tipo: d.tipo,
      nivel,
      confianza,
      motivo,
      montoDocumento: d.montoTotal,
      montoPendiente: d.montoPendiente,
      diferencia: diffPend <= TOLERANCIA_CLP ? diffPend : diffTotal,
    });
  }

  return out.sort((a, b) => b.confianza - a.confianza || a.diferencia - b.diferencia);
}

export function rutEnGlosa(glosa: string): string | null {
  const m =
    glosa.match(/\b(\d{1,2}\.?\d{3}\.?\d{3}-[\dkK])\b/i) ?? glosa.match(/\b(\d{7,8}-[\dkK])\b/i);
  return m?.[1] ? normalizarRut(m[1].replace(/\./g, "")) : null;
}
