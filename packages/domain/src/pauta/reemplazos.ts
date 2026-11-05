import { detectarDoblaje, turnosDeSerie, type PuestoTurnos } from "./doblar";
import { limiteSemanalEn, type VigenciaJornada } from "../jornada-legal";
import { intervaloTurno } from "../turnos";
import { serieVigente } from "./expandir";
import { diaNumero } from "./fechas";
import type { PatronPauta, SeriePauta } from "./tipos";

export type GuardiaReemplazo = {
  personaId: string;
  instalacionId: string;
  series: readonly (SeriePauta & {
    puestoId: string;
    puestoNombre: string;
    horaInicio: string;
    horaFin: string;
  })[];
};

export type ObjetivoReemplazo = {
  puestoId: string;
  instalacionId: string;
  fecha: string;
  patron: PatronPauta;
  inicioCiclo: string;
  horaInicio: string;
  horaFin: string;
  /** Duración del turno en horas (desde el puesto). */
  horasTurno: number;
};

export type SugerenciaReemplazo = {
  personaId: string;
  mismaInstalacion: boolean;
  horasSemana: number;
  conflictos: string[];
};

const horasDeTurno = (horaInicio: string, horaFin: string): number =>
  intervaloTurno(horaInicio, horaFin).duracionMin / 60;

function inicioSemanaIso(fecha: string): string {
  const n = diaNumero(fecha);
  const dow = new Date(`${fecha}T00:00:00Z`).getUTCDay();
  const iso = dow === 0 ? 7 : dow;
  return new Date((n - (iso - 1)) * 86_400_000).toISOString().slice(0, 10);
}

function finSemanaIso(fecha: string): string {
  const ini = inicioSemanaIso(fecha);
  return new Date(diaNumero(ini) * 86_400_000 + 6 * 86_400_000).toISOString().slice(0, 10);
}

function turnosPersonaEnSemana(g: GuardiaReemplazo, fecha: string, extra?: PuestoTurnos): number {
  const desde = inicioSemanaIso(fecha);
  const hasta = finSemanaIso(fecha);
  let horas = 0;
  for (const s of g.series) {
    const vig = serieVigente([s], fecha);
    if (!vig) continue;
    const turnos = turnosDeSerie(
      {
        etiqueta: s.puestoNombre,
        patron: s.patron,
        inicioCiclo: s.inicioCiclo,
        horaInicio: s.horaInicio,
        horaFin: s.horaFin,
      },
      desde,
      hasta,
    );
    horas += turnos.length * horasDeTurno(s.horaInicio, s.horaFin);
  }
  if (extra) {
    const turnos = turnosDeSerie(extra, desde, hasta);
    horas += turnos.length * horasDeTurno(extra.horaInicio, extra.horaFin);
  }
  return horas;
}

/**
 * Sugiere guardias para cubrir un turno (A4): prioriza la misma instalación, respeta horas de la
 * jornada semanal del puesto objetivo y explica doblajes u horas de más.
 */
export function sugerirReemplazos(
  guardias: readonly GuardiaReemplazo[],
  objetivo: ObjetivoReemplazo,
  vigencias?: readonly VigenciaJornada[],
): SugerenciaReemplazo[] {
  const limiteSemanalHoras = limiteSemanalEn(objetivo.fecha, vigencias);
  const propuesto: PuestoTurnos = {
    etiqueta: "turno a cubrir",
    patron: objetivo.patron,
    inicioCiclo: objetivo.inicioCiclo,
    horaInicio: objetivo.horaInicio,
    horaFin: objetivo.horaFin,
  };
  const turnoObjetivo = turnosDeSerie(propuesto, objetivo.fecha, objetivo.fecha);

  const candidatos: SugerenciaReemplazo[] = [];
  for (const g of guardias) {
    const conflictos: string[] = [];
    const mismaInstalacion = g.instalacionId === objetivo.instalacionId;

    const propios = g.series.flatMap((s) => {
      const vig = serieVigente([s], objetivo.fecha);
      if (!vig) return [];
      return turnosDeSerie(
        {
          etiqueta: s.puestoNombre,
          patron: s.patron,
          inicioCiclo: s.inicioCiclo,
          horaInicio: s.horaInicio,
          horaFin: s.horaFin,
        },
        objetivo.fecha,
        objetivo.fecha,
      );
    });

    const cruce = detectarDoblaje(turnoObjetivo, propios);
    if (cruce) conflictos.push(`Doblaría con «${cruce.con}» el ${cruce.fecha}.`);

    const horasSemana = turnosPersonaEnSemana(g, objetivo.fecha, propuesto);
    if (horasSemana > limiteSemanalHoras) {
      conflictos.push(`Superaría ${limiteSemanalHoras} h semanales (${Math.round(horasSemana * 10) / 10} h).`);
    }

    if (objetivo.horasTurno <= 0) conflictos.push("El puesto no tiene jornada válida.");

    candidatos.push({ personaId: g.personaId, mismaInstalacion, horasSemana, conflictos });
  }

  return candidatos.sort((a, b) => {
    if (a.conflictos.length !== b.conflictos.length) return a.conflictos.length - b.conflictos.length;
    if (a.mismaInstalacion !== b.mismaInstalacion) return a.mismaInstalacion ? -1 : 1;
    return a.horasSemana - b.horasSemana;
  });
}
