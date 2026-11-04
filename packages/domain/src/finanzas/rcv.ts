// Lectura del CSV del Registro de Compras y Ventas (RCV) que el SII deja descargar (texto separado por «;»).
// Formato por verificar con un archivo real: se leen las columnas por el nombre del encabezado, sin
// depender de su orden, y lo que no se reconoce se informa fila por fila (nada se descarta en silencio).
import { TIPOS_DTE_COMPRA } from "./compras";

export type FilaRcv = {
  proveedorRut: string;
  proveedorRazonSocial: string;
  tipoDte: number;
  folio: number;
  fechaEmision: string;
  fechaRecepcion?: string;
  montoExento: number;
  montoNeto: number;
  montoIva: number;
  montoTotal: number;
};
export type ErrorRcv = { linea: number; motivo: string };

const sinTildes = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
type Clave = "tipo" | "rut" | "razon" | "folio" | "emision" | "recepcion" | "exento" | "neto" | "iva" | "total";
const ALIAS: Record<Clave, string[]> = {
  tipo: ["tipo doc", "tipo doc.", "tipo documento"],
  rut: ["rut proveedor", "rut emisor", "rut"],
  razon: ["razon social", "razon social proveedor"],
  folio: ["folio"],
  emision: ["fecha docto", "fecha docto.", "fecha emision", "fecha documento"],
  recepcion: ["fecha recepcion"],
  exento: ["monto exento"],
  neto: ["monto neto"],
  iva: ["monto iva recuperable", "monto iva", "iva recuperable"],
  total: ["monto total"],
};

/** `dd/mm/aaaa` o `aaaa-mm-dd` → `aaaa-mm-dd`; `null` si no es una fecha real. */
export function fechaRcv(t: string): string | null {
  const v = t.trim();
  const dma = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(v);
  const amd = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  const [d, mes, a] = dma ? [dma[1], dma[2], dma[3]] : amd ? [amd[3], amd[2], amd[1]] : [];
  if (!d || !mes || !a) return null;
  const f = new Date(Date.UTC(Number(a), Number(mes) - 1, Number(d)));
  if (f.getUTCFullYear() !== Number(a) || f.getUTCMonth() !== Number(mes) - 1 || f.getUTCDate() !== Number(d)) return null;
  return f.toISOString().slice(0, 10);
}

const entero = (t: string | undefined): number | null => {
  const v = (t ?? "").trim();
  if (v === "") return 0;
  return /^-?\d+$/.test(v.replace(/\./g, "")) ? Number(v.replace(/\./g, "")) : null;
};

/** Lee el CSV del RCV de compras. Devuelve las filas válidas y los errores con su número de línea. */
export function leerRcv(texto: string): { filas: FilaRcv[]; errores: ErrorRcv[] } {
  const lineas = texto.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim() !== "");
  const cab = (lineas[0] ?? "").split(";").map(sinTildes);
  const col = Object.fromEntries(
    (Object.keys(ALIAS) as Clave[]).map((k) => [k, cab.findIndex((c) => ALIAS[k].includes(c))]),
  ) as Record<Clave, number>;
  const faltan = (["tipo", "rut", "folio", "emision", "total"] as const).filter((k) => col[k] < 0);
  if (faltan.length > 0)
    return { filas: [], errores: [{ linea: 1, motivo: "No se reconoce el encabezado del RCV: faltan las columnas de tipo, RUT, folio, fecha y total." }] };
  const filas: FilaRcv[] = [];
  const errores: ErrorRcv[] = [];
  lineas.slice(1).forEach((l, i) => {
    const c = l.split(";");
    const linea = i + 2;
    const at = (k: Clave) => c[col[k]] ?? "";
    const tipo = Number(at("tipo"));
    const folio = Number(at("folio"));
    const emision = fechaRcv(at("emision"));
    const recepcion = fechaRcv(at("recepcion"));
    const montos = [at("exento"), at("neto"), at("iva"), at("total")].map(entero);
    if (!(TIPOS_DTE_COMPRA as readonly number[]).includes(tipo)) return void errores.push({ linea, motivo: `Tipo de documento ${at("tipo") || "vacío"} no entra al libro de compras.` });
    if (!Number.isInteger(folio) || folio < 1) return void errores.push({ linea, motivo: "Folio inválido." });
    if (!emision) return void errores.push({ linea, motivo: "Fecha de emisión inválida." });
    if (!at("rut").trim()) return void errores.push({ linea, motivo: "Falta el RUT del proveedor." });
    if (montos.some((m) => m === null || m < 0)) return void errores.push({ linea, motivo: "Un monto no es un número entero." });
    const [montoExento, montoNeto, montoIva, montoTotal] = montos as number[];
    filas.push({
      proveedorRut: at("rut").trim(),
      proveedorRazonSocial: at("razon").trim(),
      tipoDte: tipo,
      folio,
      fechaEmision: emision,
      ...(recepcion ? { fechaRecepcion: recepcion } : {}),
      montoExento: montoExento as number,
      montoNeto: montoNeto as number,
      montoIva: montoIva as number,
      montoTotal: montoTotal as number,
    });
  });
  return { filas, errores };
}
