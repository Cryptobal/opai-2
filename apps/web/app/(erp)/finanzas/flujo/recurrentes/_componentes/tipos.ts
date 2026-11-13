// Gasto recurrente tal como lo devuelve `finanzas.recurrentes.listar` (CAR-349) y su formato en pantalla.
export type Unidad = "clp" | "uf" | "pct_ventas";
export type PoliticaUf = "dia_cuota" | "fin_de_mes" | "fin_mes_anterior" | "inicio_de_mes" | "dia_fijo";
export type Recurrente = {
  id: string;
  filaId: string;
  concepto: string;
  unidad: Unidad;
  politicaUf: PoliticaUf;
  ufDiaFijo: number | null;
  monto: number;
  frecuencia: "semanal" | "quincenal" | "mensual";
  diaDelMes: number | null;
  inicio: string;
  fin: string | null;
  repeticiones: number | null;
  ventanaAntes: number;
  ventanaDespues: number;
  nota: string | null;
  activa: boolean;
  claveOrigen: string | null;
};
export type FilaEgreso = { id: string; etiqueta: string; seccion: string; activa: boolean };

const decimales = (n: number) => n.toLocaleString("es-CL", { maximumFractionDigits: 4 });

/** Monto legible según su unidad: pesos, UF (escala 10.000) o % de ventas (escala 10.000). */
export function montoLegible(r: Pick<Recurrente, "unidad" | "monto">): string {
  if (r.unidad === "uf") return `${decimales(r.monto / 10_000)} UF`;
  if (r.unidad === "pct_ventas") return `${decimales(r.monto / 10_000)} % de las ventas`;
  return `$ ${r.monto.toLocaleString("es-CL")}`;
}

/** Texto escrito por la persona → entero en la escala de la unidad, o null si no es un número válido. */
export function montoEscrito(unidad: Unidad, texto: string): number | null {
  let t = texto.replace(/[$%\sUF]/gi, "");
  if (unidad === "clp" || t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  const n = Math.round(unidad === "clp" ? Number(t) : Number(t) * 10_000);
  if (n <= 0 || (unidad === "pct_ventas" && n > 1_000_000)) return null;
  return n;
}

/** Monto en la escala → texto editable (12,5 para 125.000 en UF). */
export const montoEditable = (r: Pick<Recurrente, "unidad" | "monto">) =>
  r.unidad === "clp" ? String(r.monto) : decimales(r.monto / 10_000);

const DIA = (d: number | null) => (d === -1 ? "el último día" : `el día ${d}`);
/** «Mensual, el día 5» / «Semanal desde el 3 nov». */
export function cuando(r: Recurrente): string {
  if (r.frecuencia === "mensual") return `Mensual, ${DIA(r.diaDelMes ?? Number(r.inicio.slice(8, 10)))}`;
  return r.frecuencia === "semanal" ? "Cada semana" : "Cada dos semanas";
}

export const POLITICAS: { valor: PoliticaUf; etiqueta: string }[] = [
  { valor: "dia_cuota", etiqueta: "UF del día de la cuota" },
  { valor: "fin_de_mes", etiqueta: "UF del último día del mes" },
  { valor: "fin_mes_anterior", etiqueta: "UF del último día del mes anterior" },
  { valor: "inicio_de_mes", etiqueta: "UF del primer día del mes" },
  { valor: "dia_fijo", etiqueta: "UF de un día fijo del mes" },
];
