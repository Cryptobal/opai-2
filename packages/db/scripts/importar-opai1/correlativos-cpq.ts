// Plan del correlativo CPQ por año (R54): máximo NNN de códigos `CPQ-AAAA-NNN` sin sufijo en el export 1.0.
import type { CotizacionOpai1 } from "./origen";

/** Códigos con sufijo (p. ej. CPQ-2026-159-defe) no cuentan para el siguiente número (cpq.md). */
const RE_CORRELATIVO = /^CPQ-(\d{4})-(\d+)$/i;

export type CorrelativoCpqPropuesto = {
  anio: number;
  ultimoEnExport: number;
  cotizacionesConsideradas: number;
  /** Valor que se fijaría con cpq.correlativos.fijar (dry-run). */
  fijariaUltimo: number;
  omitido: boolean;
  motivo: string | null;
};

export function numeroCorrelativoCpq(code: string): { anio: number; numero: number } | null {
  const m = RE_CORRELATIVO.exec(code.trim());
  if (!m) return null;
  const anio = Number(m[1]);
  const numero = Number(m[2]);
  if (!Number.isInteger(anio) || !Number.isInteger(numero) || numero < 1) return null;
  return { anio, numero };
}

export function planCorrelativosCpq(
  cotizaciones: readonly CotizacionOpai1[],
  ultimoActualPorAnio: ReadonlyMap<number, number>,
  cpqActivo: boolean,
): CorrelativoCpqPropuesto[] {
  if (!cpqActivo) return [];
  const maxPorAnio = new Map<number, { max: number; n: number }>();
  for (const q of cotizaciones) {
    const n = numeroCorrelativoCpq(q.code);
    if (!n) continue;
    const prev = maxPorAnio.get(n.anio);
    if (!prev || n.numero > prev.max) maxPorAnio.set(n.anio, { max: n.numero, n: (prev?.n ?? 0) + 1 });
    else maxPorAnio.set(n.anio, { max: prev.max, n: prev.n + 1 });
  }
  return [...maxPorAnio.entries()]
    .sort(([a], [b]) => a - b)
    .map(([anio, { max, n }]) => {
      const actual = ultimoActualPorAnio.get(anio) ?? 0;
      if (max <= actual) {
        return {
          anio,
          ultimoEnExport: max,
          cotizacionesConsideradas: n,
          fijariaUltimo: actual,
          omitido: true,
          motivo: "correlativo_ya_superior_o_igual",
        };
      }
      return {
        anio,
        ultimoEnExport: max,
        cotizacionesConsideradas: n,
        fijariaUltimo: max,
        omitido: false,
        motivo: null,
      };
    });
}
