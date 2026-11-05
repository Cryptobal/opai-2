import {
  avisoSemanalEn,
  DESCANSO_MINIMO_HORAS_DEFECTO,
  LIMITE_MENSUAL_HORAS_DEFECTO,
  limiteSemanalEn,
  type VigenciaJornada,
} from "../jornada-legal";
import { intervaloTurno } from "../turnos";
import { diaNumero } from "./fechas";

const MS_DIA = 86_400_000;

/** Parámetros de las alertas: tope semanal con vigencia (indicador «jornada», ADR-056) y ajustes de Pauta. */
export type OpcionesAlertasHoras = {
  /** Vigencias de la jornada legal; por defecto la tabla de la Ley 21.561. */
  vigencias?: readonly VigenciaJornada[];
  limiteMensualHoras?: number;
  descansoMinimoHoras?: number;
};

export type SeveridadAlertaHoras = "advertencia" | "critica";

export type TurnoAlerta = {
  personaId: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
};

export type AlertaHoras = {
  personaId: string;
  tipo: "semanal" | "mensual" | "descanso";
  severidad: SeveridadAlertaHoras;
  mensaje: string;
  horas?: number;
  limite?: number;
};

const horasTurno = (horaInicio: string, horaFin: string): number =>
  intervaloTurno(horaInicio, horaFin).duracionMin / 60;

function inicioSemana(fecha: string): string {
  const n = diaNumero(fecha);
  const dow = new Date(`${fecha}T00:00:00Z`).getUTCDay();
  const iso = dow === 0 ? 7 : dow;
  return new Date((n - (iso - 1)) * MS_DIA).toISOString().slice(0, 10);
}

function inicioMes(fecha: string): string {
  return `${fecha.slice(0, 7)}-01`;
}

function finMes(fecha: string): string {
  const [y, m] = fecha.split("-").map(Number);
  const ultimo = new Date(Date.UTC(y!, m!, 0)).getUTCDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(ultimo).padStart(2, "0")}`;
}


function sumarHorasSemana(turnos: readonly TurnoAlerta[], personaId: string, anchor: string): number {
  const desde = inicioSemana(anchor);
  const hasta = new Date(diaNumero(desde) * MS_DIA + 6 * MS_DIA).toISOString().slice(0, 10);
  let total = 0;
  for (const t of turnos) {
    if (t.personaId !== personaId) continue;
    if (t.fecha < desde || t.fecha > hasta) continue;
    total += horasTurno(t.horaInicio, t.horaFin);
  }
  return total;
}

function sumarHorasMes(turnos: readonly TurnoAlerta[], personaId: string, anchor: string): number {
  const desde = inicioMes(anchor);
  const hasta = finMes(anchor);
  let total = 0;
  for (const t of turnos) {
    if (t.personaId !== personaId) continue;
    if (t.fecha < desde || t.fecha > hasta) continue;
    total += horasTurno(t.horaInicio, t.horaFin);
  }
  return total;
}

/** Alertas de horas legales (P09): límites semanal/mensual y descanso mínimo entre turnos. */
export function calcularAlertasHoras(
  turnos: readonly TurnoAlerta[],
  semanaAnchor?: string,
  opciones: OpcionesAlertasHoras = {},
): AlertaHoras[] {
  const alertas: AlertaHoras[] = [];
  const personas = [...new Set(turnos.map((t) => t.personaId))];
  const anchor = semanaAnchor ?? turnos[0]?.fecha ?? inicioSemana(new Date().toISOString().slice(0, 10));
  const limiteSemanal = limiteSemanalEn(anchor, opciones.vigencias);
  const avisoSemanal = avisoSemanalEn(anchor, opciones.vigencias);
  const limiteMensual = opciones.limiteMensualHoras ?? LIMITE_MENSUAL_HORAS_DEFECTO;
  const descansoMinimo = opciones.descansoMinimoHoras ?? DESCANSO_MINIMO_HORAS_DEFECTO;
  const redondeo = (h: number) => Math.round(h * 10) / 10;

  for (const personaId of personas) {
    const sem = sumarHorasSemana(turnos, personaId, anchor);
    if (sem > avisoSemanal) {
      const supera = sem > limiteSemanal;
      alertas.push({
        personaId,
        tipo: "semanal",
        severidad: supera ? "critica" : "advertencia",
        horas: redondeo(sem),
        limite: limiteSemanal,
        mensaje: supera
          ? `Supera el límite semanal de ${limiteSemanal} h (${redondeo(sem)} h).`
          : `Cerca del límite semanal de ${limiteSemanal} h (${redondeo(sem)} h).`,
      });
    }

    const mes = sumarHorasMes(turnos, personaId, anchor);
    if (mes > limiteMensual) {
      alertas.push({
        personaId,
        tipo: "mensual",
        severidad: "critica",
        horas: redondeo(mes),
        limite: limiteMensual,
        mensaje: `Supera el límite mensual de ${limiteMensual} h (${redondeo(mes)} h).`,
      });
    }

    const propios = turnos
      .filter((t) => t.personaId === personaId)
      .map((t) => {
        const inicio = diaNumero(t.fecha) * 1440 + intervaloTurno(t.horaInicio, t.horaFin).inicioMin;
        return { inicio, fin: inicio + intervaloTurno(t.horaInicio, t.horaFin).duracionMin, fecha: t.fecha };
      })
      .sort((a, b) => a.inicio - b.inicio);

    for (let i = 1; i < propios.length; i++) {
      const prev = propios[i - 1]!;
      const cur = propios[i]!;
      const descanso = (cur.inicio - prev.fin) / 60;
      if (descanso < descansoMinimo) {
        alertas.push({
          personaId,
          tipo: "descanso",
          severidad: "critica",
          mensaje: `Menos de ${descansoMinimo} h de descanso entre turnos (${redondeo(descanso)} h entre ${prev.fecha} y ${cur.fecha}).`,
        });
        break;
      }
    }
  }

  return alertas;
}
