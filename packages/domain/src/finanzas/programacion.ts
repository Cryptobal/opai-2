// Programación de facturación recurrente (BRIEF-26 · CAR-159): períodos, fechas de generación,
// corte con 1.0 y fecha de la UF según la política. Lógica pura; fechas «aaaa-mm-dd» en UTC.

export const FRECUENCIAS_PROGRAMACION = ["mensual", "quincenal", "semanal", "anual"] as const;
export type FrecuenciaProgramacion = (typeof FRECUENCIAS_PROGRAMACION)[number];

export const POLITICAS_UF = [
  "RUN_DAY",
  "LAST_DAY_PREV_MONTH",
  "FIRST_DAY_MONTH",
  "LAST_DAY_MONTH",
  "CUSTOM_DAY",
] as const;
export type PoliticaUf = (typeof POLITICAS_UF)[number];

export type AgendaProgramacion = {
  frecuencia: FrecuenciaProgramacion;
  /** 1–31, o -1 para el último día del mes. Si el mes es más corto, el último día. */
  diaGeneracion: number;
  /** 0 = domingo … 6 = sábado (semanal y quincenal). */
  diaSemana: number | null;
  /** 1–12 (anual). */
  mesDelAnio: number | null;
  /** Inicio efectivo: la fecha de inicio o, si no hay, el día en que se creó la programación. */
  fechaInicio: string;
  fechaFin: string | null;
};

/** Lo que ya se facturó en 1.0: nada antes de la fecha de corte ni hasta `ultimoPeriodo10`. */
export type CorteProgramacion = { fechaCorte: string | null; ultimoPeriodo10: string | null };

const DIA_MS = 86_400_000;
const aMs = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const aIso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const dos = (n: number) => String(n).padStart(2, "0");
const MAX_ITERACIONES = 2000;

export const sumarDiasIso = (iso: string, dias: number) => aIso(aMs(iso) + dias * DIA_MS);

export function ultimoDiaDelMes(anio: number, mes: number): number {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}

/** Fecha del mes con el día pedido (-1 = último); un día mayor al del mes cae en el último. */
export function fechaDelMes(anio: number, mes: number, dia: number): string {
  const ultimo = ultimoDiaDelMes(anio, mes);
  const d = dia === -1 || dia > ultimo ? ultimo : Math.max(1, dia);
  return `${anio}-${dos(mes)}-${dos(d)}`;
}

const diaSemanaDe = (iso: string) => new Date(aMs(iso)).getUTCDay();

/** Primera fecha ≥ `iso` que cae en el día de semana `dia`. */
function alinearSemana(iso: string, dia: number): string {
  return sumarDiasIso(iso, (dia - diaSemanaDe(iso) + 7) % 7);
}

function mensuales(a: AgendaProgramacion, ini: string, fin: string): string[] {
  const out: string[] = [];
  let anio = Number(ini.slice(0, 4));
  let mes = Number(ini.slice(5, 7));
  const mesAnual = a.mesDelAnio ?? Number(a.fechaInicio.slice(5, 7));
  for (let i = 0; i < MAX_ITERACIONES; i++) {
    const f = fechaDelMes(anio, mes, a.diaGeneracion);
    if (f.slice(0, 7) > fin.slice(0, 7)) break;
    if ((a.frecuencia === "mensual" || mes === mesAnual) && f >= ini && f <= fin) out.push(f);
    mes += 1;
    if (mes > 12) {
      mes = 1;
      anio += 1;
    }
  }
  return out;
}

function porSemanas(a: AgendaProgramacion, ini: string, fin: string): string[] {
  const paso = a.frecuencia === "semanal" ? 7 : 14;
  const ancla = alinearSemana(a.fechaInicio, a.diaSemana ?? diaSemanaDe(a.fechaInicio));
  const saltos = Math.max(0, Math.ceil((aMs(ini) - aMs(ancla)) / (paso * DIA_MS)));
  const out: string[] = [];
  for (let k = saltos; out.length < MAX_ITERACIONES; k++) {
    const f = sumarDiasIso(ancla, k * paso);
    if (f > fin) break;
    if (f >= ini) out.push(f);
  }
  return out;
}

/** Fechas de generación de la agenda dentro de [desde, hasta], respetando inicio y fin. */
export function fechasGeneracion(a: AgendaProgramacion, desde: string, hasta: string): string[] {
  const ini = a.fechaInicio > desde ? a.fechaInicio : desde;
  const fin = a.fechaFin && a.fechaFin < hasta ? a.fechaFin : hasta;
  if (ini > fin) return [];
  return a.frecuencia === "mensual" || a.frecuencia === "anual"
    ? mensuales(a, ini, fin)
    : porSemanas(a, ini, fin);
}

/** Clave del período: «aaaa-mm» en mensual y anual; la fecha en semanal y quincenal (como 1.0). */
export function periodoProgramacion(frecuencia: FrecuenciaProgramacion, fecha: string): string {
  return frecuencia === "mensual" || frecuencia === "anual" ? fecha.slice(0, 7) : fecha;
}

/** Falso si el período ya lo cubre 1.0: antes de la fecha de corte o hasta `ultimoPeriodo10`. */
export function permitidoPorCorte(fecha: string, c: CorteProgramacion): boolean {
  if (c.fechaCorte && fecha < c.fechaCorte) return false;
  const u = c.ultimoPeriodo10;
  return !(u && fecha.slice(0, u.length) <= u);
}

export type PeriodoProgramacion = { periodo: string; fecha: string };

/**
 * Períodos de la agenda en [inicio, hasta] que el corte permite y que no están en `hechos`, en orden.
 * `limite` corta la lista (los pendientes se generan de a poco, nunca cientos de una vez).
 */
export function periodosProgramacion(
  a: AgendaProgramacion,
  corte: CorteProgramacion,
  opciones: { hasta: string; hechos: ReadonlySet<string>; limite: number; desde?: string },
): PeriodoProgramacion[] {
  const out: PeriodoProgramacion[] = [];
  for (const fecha of fechasGeneracion(a, opciones.desde ?? a.fechaInicio, opciones.hasta)) {
    if (out.length >= opciones.limite) break;
    const periodo = periodoProgramacion(a.frecuencia, fecha);
    if (permitidoPorCorte(fecha, corte) && !opciones.hechos.has(periodo)) out.push({ periodo, fecha });
  }
  return out;
}

/** Próxima fecha de generación sin corrida (puede ser pasada si una generación quedó pendiente). */
export function proximaEjecucion(
  a: AgendaProgramacion,
  corte: CorteProgramacion,
  hechos: ReadonlySet<string>,
  hoy: string,
): string | null {
  const hasta = sumarDiasIso(hoy, 800);
  return periodosProgramacion(a, corte, { hasta, hechos, limite: 1 })[0]?.fecha ?? null;
}

/** Fecha cuya UF se usa para valorizar el período, según la política de la programación. */
export function fechaUfDe(politica: string | null, diaUf: number | null, fechaGeneracion: string): string {
  const anio = Number(fechaGeneracion.slice(0, 4));
  const mes = Number(fechaGeneracion.slice(5, 7));
  switch (politica) {
    case "LAST_DAY_PREV_MONTH":
      return sumarDiasIso(`${anio}-${dos(mes)}-01`, -1);
    case "FIRST_DAY_MONTH":
      return `${anio}-${dos(mes)}-01`;
    case "LAST_DAY_MONTH":
      return fechaDelMes(anio, mes, -1);
    case "CUSTOM_DAY":
      return fechaDelMes(anio, mes, diaUf ?? 1);
    default:
      return fechaGeneracion;
  }
}
