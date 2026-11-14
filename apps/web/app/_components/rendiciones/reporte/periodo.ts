/** Período y agrupación del reporte de rendiciones (CAR-179), leídos de la URL (server-first, ADR-037). */

export const RUTA_REPORTE = "/rendiciones/reporte";
export const AGRUPAR = [
  { id: "persona", etiqueta: "Persona" },
  { id: "categoria", etiqueta: "Categoría" },
  { id: "centro", etiqueta: "Centro de costo" },
] as const;
export type AgruparReporte = (typeof AGRUPAR)[number]["id"];

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export type FiltrosReporte = { mes: string; agrupar: AgruparReporte };

/** Mes actual en Chile (aaaa-mm). */
export function mesActual(ahora = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(ahora).slice(0, 7);
}

export function filtrosDe(q: Record<string, string | string[] | undefined>, ahora = new Date()): FiltrosReporte {
  const mes = typeof q["mes"] === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(q["mes"]) ? q["mes"] : mesActual(ahora);
  const por = q["por"];
  const agrupar = AGRUPAR.find((a) => a.id === por)?.id ?? "persona";
  return { mes, agrupar };
}

/** Primer y último día del mes (aaaa-mm-dd). */
export function periodoDeMes(mes: string): { desde: string; hasta: string } {
  const [y, m] = mes.split("-").map(Number) as [number, number];
  const ultimo = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { desde: `${mes}-01`, hasta: `${mes}-${String(ultimo).padStart(2, "0")}` };
}

export function mesVecino(mes: string, delta: number): string {
  const [y, m] = mes.split("-").map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** «Noviembre 2026». */
export function etiquetaMes(mes: string): string {
  const [y, m] = mes.split("-").map(Number) as [number, number];
  const nombre = MESES[m - 1] ?? "";
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${y}`;
}

export function hrefReporte(f: FiltrosReporte): string {
  return `${RUTA_REPORTE}?mes=${f.mes}&por=${f.agrupar}`;
}

export function hrefExcel(mes: string): string {
  const { desde, hasta } = periodoDeMes(mes);
  return `/api/rendiciones/reporte/excel?desde=${desde}&hasta=${hasta}`;
}
