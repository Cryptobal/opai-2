import { diaNumero, diaSemanaIso, diasDelMes } from "./fechas";
import type { CeldaPauta, ExcepcionPauta, PatronPauta, SeriePauta } from "./tipos";

/** ¿El patrón trabaja ese día? Cíclico: fase desde el inicio de ciclo; semanal: días fijos. */
export function trabajaEn(patron: PatronPauta, inicioCiclo: string, fecha: string): boolean {
  if (patron.clase === "semanal") return patron.diasSemana.includes(diaSemanaIso(fecha));
  const ciclo = patron.diasTrabajo + patron.diasDescanso;
  if (ciclo <= 0) return false;
  const dif = diaNumero(fecha) - diaNumero(inicioCiclo);
  return (((dif % ciclo) + ciclo) % ciclo) < patron.diasTrabajo;
}

/** La serie vigente de un puesto en una fecha (las vigencias no se solapan). */
export function serieVigente(series: readonly SeriePauta[], fecha: string): SeriePauta | null {
  return series.find((s) => s.desde <= fecha && (s.hasta === null || s.hasta >= fecha)) ?? null;
}

export type EntradaMes = {
  anio: number;
  mes: number;
  /** Series de UN puesto, no solapadas. */
  series: readonly SeriePauta[];
  /** Excepciones activas de ese puesto. */
  excepciones: readonly ExcepcionPauta[];
  /** Feriados por fecha → nombre (calendario del Núcleo). */
  feriados: ReadonlyMap<string, string>;
};

/**
 * Expande serie + excepciones a la grilla del mes de un puesto. Todo lo que se debe cubrir y no se
 * cubre es PPC con motivo (R6): sin titular, o ausencia / licencia / vacaciones / permiso.
 */
export function expandirMes(e: EntradaMes): CeldaPauta[] {
  const porFecha = new Map(e.excepciones.map((x) => [x.fecha, x]));
  return diasDelMes(e.anio, e.mes).map((fecha): CeldaPauta => {
    const feriado = e.feriados.get(fecha) ?? null;
    const base = { fecha, feriado, excepcion: false, motivo: null, titularId: null } as const;
    const serie = serieVigente(e.series, fecha);
    if (!serie) return { ...base, estado: "sin_serie" };
    if (!trabajaEn(serie.patron, serie.inicioCiclo, fecha)) return { ...base, estado: "libre" };
    const exc = porFecha.get(fecha);
    if (exc) return { ...base, estado: "ppc", motivo: exc.tipo, excepcion: true, titularId: serie.titularId };
    if (!serie.titularId) return { ...base, estado: "ppc", motivo: "sin_titular" };
    return { ...base, estado: "cubierto", titularId: serie.titularId };
  });
}
