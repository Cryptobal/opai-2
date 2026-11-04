// Apertura de Finanzas desde 1.0 (BRIEF-30 · CAR-168). Lógica pura: valida el contrato
// `finanzas-apertura@1`, arma el plan y calcula las sumas de control. Sin base, sin reloj, sin Next.

export const TIPOS_DTE_APERTURA: ReadonlySet<number> = new Set([33, 34, 56, 61]);

export type SaldoBanco = { banco: string; numeroVisible: string; moneda: string; saldo: number };
export type DocumentoApertura = {
  tipoDte: number;
  folio: number;
  rutReceptor: string;
  fechaEmision: string;
  fechaVencimiento: string | null;
  montoNeto: number;
  montoExento: number;
  montoIva: number;
  montoTotal: number;
  montoCobrado: number;
  glosa: string | null;
};
export type UltimoFolio = { tipoDte: number; ultimoFolio: number };
export type EntradaApertura = {
  saldos: SaldoBanco[];
  documentos: DocumentoApertura[];
  folios: UltimoFolio[];
};
export type Rechazo = { entidad: "saldo" | "documento" | "folio"; clave: string; motivo: string };

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const entero = (n: unknown): n is number => typeof n === "number" && Number.isSafeInteger(n);

/**
 * Saldo pendiente de un documento (nunca negativo). Una NC/ND no genera cuenta por cobrar.
 * Regla de Carlos (4-nov-2026): la nota de débito (56) NO cuenta como deuda, porque anula una NC y
 * la factura original vuelve a estar vigente; la deuda es esa factura, que ya viene en la apertura.
 */
export function saldoPorCobrar(d: Pick<DocumentoApertura, "tipoDte" | "montoTotal" | "montoCobrado">): number {
  if (d.tipoDte !== 33 && d.tipoDte !== 34) return 0;
  return Math.max(0, d.montoTotal - d.montoCobrado);
}

function motivoDocumento(d: DocumentoApertura): string | null {
  if (!TIPOS_DTE_APERTURA.has(d.tipoDte)) return `tipo de DTE ${d.tipoDte} no soportado`;
  if (!entero(d.folio) || d.folio < 1) return "folio inválido";
  if (!d.rutReceptor.trim()) return "sin RUT de receptor";
  if (!FECHA.test(d.fechaEmision)) return "fecha de emisión inválida";
  if (d.fechaVencimiento !== null && !FECHA.test(d.fechaVencimiento)) return "fecha de vencimiento inválida";
  const montos = [d.montoNeto, d.montoExento, d.montoIva, d.montoTotal, d.montoCobrado];
  if (!montos.every(entero) || montos.some((m) => m < 0)) return "montos no enteros o negativos";
  if (d.montoNeto + d.montoExento + d.montoIva > d.montoTotal + 1) return "el total no cubre neto, exento e IVA";
  if (d.montoCobrado > d.montoTotal) return "cobrado mayor que el total";
  return null;
}

/** Separa lo aplicable de lo rechazado, sin duplicar tipo+folio ni cuentas. */
export function validarApertura(e: EntradaApertura): { validas: EntradaApertura; rechazos: Rechazo[] } {
  const rechazos: Rechazo[] = [];
  const saldos: SaldoBanco[] = [];
  const vistosBanco = new Set<string>();
  for (const s of e.saldos) {
    const clave = `${s.banco}/${s.numeroVisible}`;
    if (!s.banco.trim() || !s.numeroVisible.trim()) rechazos.push({ entidad: "saldo", clave, motivo: "banco o número vacío" });
    else if (!entero(s.saldo)) rechazos.push({ entidad: "saldo", clave, motivo: "saldo no entero" });
    else if (vistosBanco.has(clave)) rechazos.push({ entidad: "saldo", clave, motivo: "cuenta repetida" });
    else {
      vistosBanco.add(clave);
      saldos.push(s);
    }
  }
  const documentos: DocumentoApertura[] = [];
  const vistosDoc = new Set<string>();
  for (const d of e.documentos) {
    const clave = `${d.tipoDte}-${d.folio}`;
    const motivo = motivoDocumento(d) ?? (vistosDoc.has(clave) ? "documento repetido" : null);
    if (motivo) rechazos.push({ entidad: "documento", clave, motivo });
    else {
      vistosDoc.add(clave);
      documentos.push(d);
    }
  }
  const folios: UltimoFolio[] = [];
  for (const f of e.folios) {
    if (!TIPOS_DTE_APERTURA.has(f.tipoDte) || !entero(f.ultimoFolio) || f.ultimoFolio < 0)
      rechazos.push({ entidad: "folio", clave: String(f.tipoDte), motivo: "tipo o folio inválido" });
    else folios.push(f);
  }
  return { validas: { saldos, documentos, folios }, rechazos };
}

/** Próximo folio a fijar: nunca retrocede ni deja un folio de 1.0 libre para reutilizar. */
export function proximoFolio(actual: number, ultimoUsado1_0: number): { proximo: number; cambia: boolean } {
  const proximo = Math.max(actual, ultimoUsado1_0 + 1);
  return { proximo, cambia: proximo !== actual };
}

/** Sumas de control de la entrada (1.0) o del resultado (2.0), comparables campo a campo. */
export type SumasControl = { saldos: number; documentos: number; montoTotal: number; porCobrar: number; folios: number };

export function sumasControl(e: EntradaApertura): SumasControl {
  return {
    saldos: e.saldos.reduce((s, x) => s + x.saldo, 0),
    documentos: e.documentos.length,
    montoTotal: e.documentos.reduce((s, d) => s + d.montoTotal, 0),
    porCobrar: e.documentos.reduce((s, d) => s + saldoPorCobrar(d), 0),
    folios: e.folios.length,
  };
}

export function diferenciasControl(origen: SumasControl, destino: SumasControl): string[] {
  return (Object.keys(origen) as (keyof SumasControl)[])
    .filter((k) => origen[k] !== destino[k])
    .map((k) => `${k}: 1.0=${origen[k]} · 2.0=${destino[k]}`);
}
