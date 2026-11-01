import { diaNumero, diaSemanaIso, diasDelMes } from "./fechas";
import type { CeldaPauta, ExcepcionPauta, PatronPauta, SeriePauta, TipoExcepcionAusencia } from "./tipos";

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

export type OverlayRegistro = {
  confirmado?: boolean;
  marcaManual?: boolean;
  personaId?: string;
};

export type EntradaMes = {
  anio: number;
  mes: number;
  /** Series de UN puesto, no solapadas. */
  series: readonly SeriePauta[];
  /** Excepciones activas de ese puesto. */
  excepciones: readonly ExcepcionPauta[];
  /** Feriados por fecha → nombre (calendario del Núcleo). */
  feriados: ReadonlyMap<string, string>;
  /** Registros operativos activos por fecha (cobertura confirmada / marca manual). */
  registros?: ReadonlyMap<string, OverlayRegistro>;
};

const AUSENCIAS = new Set<TipoExcepcionAusencia>(["ausencia", "licencia", "vacaciones", "permiso"]);

function aplicarRegistro(celda: CeldaPauta, reg?: OverlayRegistro): CeldaPauta {
  if (!reg) return celda;
  return {
    ...celda,
    ...(reg.confirmado ? { confirmado: true } : {}),
    ...(reg.marcaManual ? { marcaManual: true } : {}),
    ...(reg.personaId !== undefined ? { cubiertoPorId: reg.personaId } : {}),
  };
}

/**
 * Expande serie + excepciones a la grilla del mes de un puesto. Todo lo que se debe cubrir y no se
 * cubre es PPC con motivo (R6): sin titular, o ausencia / licencia / vacaciones / permiso.
 */
export function expandirMes(e: EntradaMes): CeldaPauta[] {
  const porFecha = new Map(e.excepciones.map((x) => [x.fecha, x]));
  return diasDelMes(e.anio, e.mes).map((fecha): CeldaPauta => {
    const feriado = e.feriados.get(fecha) ?? null;
    const base = { fecha, feriado, excepcion: false, motivo: null, titularId: null } as const;
    const reg = e.registros?.get(fecha);
    const exc = porFecha.get(fecha);
    const serie = serieVigente(e.series, fecha);

    if (exc?.tipo === "refuerzo") {
      const celda: CeldaPauta = {
        ...base,
        estado: "cubierto",
        excepcion: true,
        titularId: serie?.titularId ?? null,
        cubiertoPorId: exc.personaId,
        variante: "refuerzo",
      };
      return aplicarRegistro(celda, reg);
    }

    if (!serie) return aplicarRegistro({ ...base, estado: "sin_serie" }, reg);

    const esTurno = trabajaEn(serie.patron, serie.inicioCiclo, fecha);

    if (exc?.tipo === "reemplazo") {
      if (!esTurno) return aplicarRegistro({ ...base, estado: "libre" }, reg);
      const celda: CeldaPauta = {
        ...base,
        estado: "cubierto",
        excepcion: true,
        titularId: serie.titularId,
        cubiertoPorId: exc.personaId,
        variante: "reemplazo",
      };
      return aplicarRegistro(celda, reg);
    }

    if (!esTurno) return aplicarRegistro({ ...base, estado: "libre" }, reg);

    if (exc && AUSENCIAS.has(exc.tipo as TipoExcepcionAusencia)) {
      return aplicarRegistro(
        { ...base, estado: "ppc", motivo: exc.tipo as TipoExcepcionAusencia, excepcion: true, titularId: serie.titularId },
        reg,
      );
    }

    if (!serie.titularId) {
      return aplicarRegistro({ ...base, estado: "ppc", motivo: "sin_titular" }, reg);
    }

    const celda: CeldaPauta = {
      ...base,
      estado: "cubierto",
      titularId: serie.titularId,
      cubiertoPorId: serie.titularId,
    };
    return aplicarRegistro(celda, reg);
  });
}
