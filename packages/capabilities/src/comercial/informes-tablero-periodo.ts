// Períodos del tablero de reportes comerciales (CAR-27). Puro: fechas civiles aaaa-mm-dd en UTC.

export type Periodo = "mes" | "trimestre" | "anio";

const dia = (d: Date) => d.toISOString().slice(0, 10);
const utc = (anio: number, mes: number, d: number) => new Date(Date.UTC(anio, mes, d));

/** Rango del período en curso (del primer día hasta hoy) y el período anterior completo. */
export function rangosDe(periodo: Periodo, hoy: string) {
  const anio = Number(hoy.slice(0, 4));
  const mes = Number(hoy.slice(5, 7)) - 1;
  const meses = periodo === "mes" ? 1 : periodo === "trimestre" ? 3 : 12;
  const mesInicio = periodo === "anio" ? 0 : mes - (mes % meses);
  const inicio = utc(anio, mesInicio, 1);
  const inicioAnterior = utc(anio, mesInicio - meses, 1);
  return {
    desde: dia(inicio),
    hasta: hoy,
    anterior: { desde: dia(inicioAnterior), hasta: dia(utc(anio, mesInicio, 0)) },
  };
}

/** El mes aaaa-mm de hoy y los `cantidad − 1` siguientes. */
export function mesesDesde(hoy: string, cantidad: number): string[] {
  const anio = Number(hoy.slice(0, 4));
  const mes = Number(hoy.slice(5, 7)) - 1;
  return Array.from({ length: cantidad }, (_, i) => dia(utc(anio, mes + i, 1)).slice(0, 7));
}

/** Primer día de hace `meses` meses (para los motivos de pérdida y los tiempos por etapa). */
export function haceMeses(hoy: string, meses: number): string {
  return dia(utc(Number(hoy.slice(0, 4)), Number(hoy.slice(5, 7)) - 1 - meses, 1));
}
