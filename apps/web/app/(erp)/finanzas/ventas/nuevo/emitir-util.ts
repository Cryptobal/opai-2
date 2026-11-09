import { validarReferenciaSii } from "@opai/domain";

export type LineaForm = { glosa: string; montoTexto: string };

/** Referencia del catálogo SII en el formulario (801 OC, 802 HES, 803 contrato, 804 resolución, 52 guía). */
export type RefForm = { tipo: string; folioTexto: string; fecha: string; razon: string };

export const REF_VACIA: RefForm = { tipo: "801", folioTexto: "", fecha: "", razon: "" };

/** Primer problema de las referencias (código, folio y fecha reales, no posterior a hoy) o null si están bien. */
export function problemaReferencias(refs: readonly RefForm[], hoyIso: string): string | null {
  for (const r of refs) {
    const folio = Number(r.folioTexto);
    const e = validarReferenciaSii({ codigo: Number(r.tipo), folio: Number.isInteger(folio) ? folio : 0, fecha: r.fecha }, hoyIso);
    if (e) return e;
  }
  return null;
}

export type ItemPreflight = { codigo: string; ok: boolean; mensaje: string; bloqueante: boolean };

export function parseMonto(texto: string): number | null {
  const n = Number(texto.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) return null;
  return n;
}

type EntradaBorrador = {
  cuentaId: string;
  tipoDte: "33" | "34";
  plazo: number;
  lineas: LineaForm[];
  glosa: string;
  referencias?: readonly RefForm[];
  dryRun: boolean;
};

/** Input de `finanzas.ventas.crear_borrador`; las líneas ya deben estar validadas. */
export function construirInputBorrador(e: EntradaBorrador) {
  return {
    cuentaId: e.cuentaId,
    tipoDte: Number(e.tipoDte) as 33 | 34,
    plazoPagoDias: e.plazo,
    lineas: e.lineas.map((l) => ({ glosa: l.glosa.trim(), monto: parseMonto(l.montoTexto)! })),
    ...(e.glosa.trim() ? { glosa: e.glosa.trim() } : {}),
    ...(e.referencias?.length
      ? {
          referencias: e.referencias.map((r) => ({
            tipoDteRef: Number(r.tipo),
            folioRef: Number(r.folioTexto),
            fechaRef: r.fecha,
            ...(r.razon.trim() ? { razonRef: r.razon.trim() } : {}),
          })),
        }
      : {}),
    dryRun: e.dryRun,
  };
}
