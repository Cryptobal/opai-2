/** Formatos y cortes de texto del PDF de cotización. */
import { formatearClp } from "@opai/domain";

export function formatoVenta(venta: number | null, borrador?: boolean): string {
  if (venta == null) return borrador ? "Borrador sin precio" : "Pendiente";
  return `${formatearClp(venta)} CLP`;
}

export function formatoVentaLinea(venta: number | null | undefined, borrador?: boolean): string {
  if (venta == null || venta === undefined) return borrador ? "Borrador sin precio" : "—";
  return formatearClp(venta);
}

export function etiquetaTipo(tipo: string): string {
  if (tipo === "puesto") return "Puesto";
  if (tipo === "item") return "Ítem";
  if (tipo === "adicional") return "Adicional";
  return tipo;
}

export function partirParrafos(texto: string): string[] {
  return texto
    .split(/\n+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .flatMap((p) => (p.length > 110 ? partirLinea(p, 110) : [p]));
}

function partirLinea(texto: string, max: number): string[] {
  const out: string[] = [];
  let rest = texto;
  while (rest.length > max) {
    let corte = rest.lastIndexOf(" ", max);
    if (corte < 20) corte = max;
    out.push(rest.slice(0, corte).trim());
    rest = rest.slice(corte).trim();
  }
  if (rest) out.push(rest);
  return out;
}
