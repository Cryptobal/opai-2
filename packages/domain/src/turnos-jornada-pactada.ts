// Turnos esperados de las empresas sin Pauta activa: salen de la jornada pactada del vínculo laboral
// y de la jornada DT de la persona. Nunca se inventa: sin datos suficientes se devuelve un aviso.

import { rangoDias } from "./pauta/fechas";
import { trabajaEn } from "./pauta/expandir";
import type { PatronPauta } from "./pauta/tipos";
import { horaValida } from "./turnos";
import { intervaloEsperado } from "./turnos-instantes";
import type { TurnoEsperadoDerivado } from "./turnos-esperados";

export type JornadaPactada = {
  personaId: string;
  instalacionId: string;
  puestoId: string | null;
  /** Primer día del vínculo; ancla la fase de un ciclo (4×4, 7×7…). */
  inicioVinculo: string;
  terminoVinculo: string | null;
  /** Texto libre del vínculo o de la jornada DT, p. ej. "5x2 08:00-17:00". */
  distribucion: string | null;
  /** Horario del puesto, si el vínculo lo tiene; respaldo cuando el texto no trae horas. */
  horarioPuesto: { horaInicio: string; horaFin: string } | null;
  colacionMin: number;
};

export type DistribucionLeida = {
  patron: PatronPauta;
  horaInicio: string | null;
  horaFin: string | null;
};

const REGEX = /^(\d{1,2})\s*[x×]\s*(\d{1,2})(?:\s+(\d{1,2}:\d{2})\s*[-–a]\s*(\d{1,2}:\d{2}))?$/i;
const norm = (h: string) => (h.length === 4 ? `0${h}` : h);

/** Lee "5x2", "4x4 08:00-20:00". Con 5×2 y 2×5 usa los días de la semana de fábrica; el resto es cíclico. */
export function leerDistribucion(texto: string | null): DistribucionLeida | null {
  const m = texto ? REGEX.exec(texto.trim()) : null;
  if (!m) return null;
  const trabajo = Number(m[1]);
  const descanso = Number(m[2]);
  if (!(trabajo >= 1 && descanso >= 1 && trabajo + descanso <= 56)) return null;
  const semanal = trabajo + descanso === 7 && ((trabajo === 5 && descanso === 2) || (trabajo === 2 && descanso === 5));
  const patron: PatronPauta = semanal
    ? { clase: "semanal", diasTrabajo: trabajo, diasDescanso: descanso, diasSemana: trabajo === 5 ? [1, 2, 3, 4, 5] : [6, 7] }
    : { clase: "ciclico", diasTrabajo: trabajo, diasDescanso: descanso, diasSemana: [] };
  const hi = m[3] ? norm(m[3]) : null;
  const hf = m[4] ? norm(m[4]) : null;
  if ((hi && !horaValida(hi)) || (hf && !horaValida(hf))) return null;
  return { patron, horaInicio: hi, horaFin: hf };
}

export type AvisoJornada = { personaId: string; motivo: "distribucion_ilegible" | "sin_horario" };

export type ResultadoJornada = { turnos: TurnoEsperadoDerivado[]; avisos: AvisoJornada[] };

export function derivarTurnosDeJornada(
  jornadas: readonly JornadaPactada[],
  desde: string,
  hasta: string,
  zona: string,
  esFeriado: (fecha: string) => boolean = () => false,
): ResultadoJornada {
  const turnos: TurnoEsperadoDerivado[] = [];
  const avisos: AvisoJornada[] = [];
  for (const j of jornadas) {
    const d = leerDistribucion(j.distribucion);
    if (!d) {
      avisos.push({ personaId: j.personaId, motivo: "distribucion_ilegible" });
      continue;
    }
    const hi = d.horaInicio ?? j.horarioPuesto?.horaInicio ?? null;
    const hf = d.horaFin ?? j.horarioPuesto?.horaFin ?? null;
    if (!hi || !hf) {
      avisos.push({ personaId: j.personaId, motivo: "sin_horario" });
      continue;
    }
    for (const fecha of rangoDias(desde, hasta)) {
      if (fecha < j.inicioVinculo || (j.terminoVinculo && fecha > j.terminoVinculo)) continue;
      if (!trabajaEn(d.patron, j.inicioVinculo, fecha)) continue;
      const { inicio, fin } = intervaloEsperado(fecha, hi, hf, zona);
      turnos.push({
        personaId: j.personaId, fecha, inicio, fin,
        instalacionId: j.instalacionId, puestoId: j.puestoId,
        origen: "jornada_pactada", referencia: `jornada:${j.personaId}`, colacionMin: j.colacionMin,
        feriado: esFeriado(fecha),
      });
    }
  }
  return { turnos, avisos };
}

