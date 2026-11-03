export type LineaForm = { glosa: string; montoTexto: string };

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
    dryRun: e.dryRun,
  };
}
