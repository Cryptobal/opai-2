// Cálculo puro del resultado operacional por mes (ventas menos compras, sin IVA). Sin base de
// datos: recibe documentos ya leídos. Las notas de crédito restan y las de débito suman (signoDte).
import { signoDte, type TipoDteCompra } from "@opai/domain";

export type DocumentoParaResultado = {
  tipoDte: number;
  /** aaaa-mm-dd con el que se asigna el período (emisión en ventas, recepción en compras). */
  fecha: string;
  montoNeto: number;
  montoExento: number;
  /** Cliente o proveedor, para el ranking. */
  contraparteId: string;
};

export type MesResultado = {
  periodo: string;
  ventasClp: number;
  comprasClp: number;
  resultadoClp: number;
  ventasDocumentos: number;
  comprasDocumentos: number;
};

const sinIva = (d: DocumentoParaResultado) =>
  signoDte(d.tipoDte as TipoDteCompra) * (d.montoNeto + d.montoExento);

/** Lista aaaa-mm desde `desde` hasta `hasta` inclusive. */
export function periodosEntre(desde: string, hasta: string): string[] {
  const out: string[] = [];
  let [a, m] = [Number(desde.slice(0, 4)), Number(desde.slice(5, 7))];
  const fin = Number(hasta.slice(0, 4)) * 12 + Number(hasta.slice(5, 7));
  while (a * 12 + m <= fin) {
    out.push(`${a}-${String(m).padStart(2, "0")}`);
    [a, m] = m === 12 ? [a + 1, 1] : [a, m + 1];
  }
  return out;
}

export function resultadoPorMes(
  periodos: readonly string[],
  ventas: readonly DocumentoParaResultado[],
  compras: readonly DocumentoParaResultado[],
): MesResultado[] {
  return periodos.map((periodo) => {
    const v = ventas.filter((d) => d.fecha.startsWith(periodo));
    const c = compras.filter((d) => d.fecha.startsWith(periodo));
    const ventasClp = v.reduce((s, d) => s + sinIva(d), 0);
    const comprasClp = c.reduce((s, d) => s + sinIva(d), 0);
    return {
      periodo,
      ventasClp,
      comprasClp,
      resultadoClp: ventasClp - comprasClp,
      ventasDocumentos: v.length,
      comprasDocumentos: c.length,
    };
  });
}

/** Mayores contrapartes por monto sin IVA (descendente); desempata por id para ser estable. */
export function ranking(docs: readonly DocumentoParaResultado[], max: number) {
  const por = new Map<string, number>();
  for (const d of docs) por.set(d.contraparteId, (por.get(d.contraparteId) ?? 0) + sinIva(d));
  return [...por.entries()]
    .map(([id, montoClp]) => ({ id, montoClp }))
    .sort((a, b) => b.montoClp - a.montoClp || a.id.localeCompare(b.id))
    .slice(0, max);
}
