import { diaNumero, minutosDeHora } from "./fechas";

/** Ley 21.561: jornada ordinaria máxima 42 h semanales; vigente desde 2026-04-26 (BCN). */
export const LIMITE_SEMANAL_HORAS = 42;
export const LIMITE_SEMANAL_FUENTE = "Ley 21.561";
export const LIMITE_SEMANAL_VIGENTE_DESDE = "2026-04-26";
// TODO: hacer configurable por empresa con vigencias (PR posterior).

/** Como 1.0: alerta amarilla por encima de esta carga semanal; roja al superar LIMITE_SEMANAL_HORAS. */
export const UMBRAL_AVISO_AMARILLO_SEMANAL_H = 40;

export const LIMITE_MENSUAL = 180;
export const LIMITE_MENSUAL_HORAS = LIMITE_MENSUAL;

const MIN_DESCANSO_HORAS = 12;
const MS_DIA = 86_400_000;

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

function horasTurno(horaInicio: string, horaFin: string): number {
  const ini = minutosDeHora(horaInicio);
  let fin = minutosDeHora(horaFin);
  if (fin <= ini) fin += 1440;
  return (fin - ini) / 60;
}

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

function minutosAbsolutos(fecha: string, hora: string): number {
  return diaNumero(fecha) * 1440 + minutosDeHora(hora);
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
): AlertaHoras[] {
  const alertas: AlertaHoras[] = [];
  const personas = [...new Set(turnos.map((t) => t.personaId))];
  const anchor = semanaAnchor ?? turnos[0]?.fecha ?? inicioSemana(new Date().toISOString().slice(0, 10));

  for (const personaId of personas) {
    const sem = sumarHorasSemana(turnos, personaId, anchor);
    if (sem > UMBRAL_AVISO_AMARILLO_SEMANAL_H) {
      const supera = sem > LIMITE_SEMANAL_HORAS;
      alertas.push({
        personaId,
        tipo: "semanal",
        severidad: supera ? "critica" : "advertencia",
        horas: Math.round(sem * 10) / 10,
        limite: LIMITE_SEMANAL_HORAS,
        mensaje: supera
          ? `Supera el límite semanal de ${LIMITE_SEMANAL_HORAS} h (${Math.round(sem * 10) / 10} h).`
          : `Cerca del límite semanal de ${LIMITE_SEMANAL_HORAS} h (${Math.round(sem * 10) / 10} h).`,
      });
    }

    const mes = sumarHorasMes(turnos, personaId, anchor);
    if (mes > LIMITE_MENSUAL_HORAS) {
      alertas.push({
        personaId,
        tipo: "mensual",
        severidad: "critica",
        horas: Math.round(mes * 10) / 10,
        limite: LIMITE_MENSUAL_HORAS,
        mensaje: `Supera el límite mensual de ${LIMITE_MENSUAL_HORAS} h (${Math.round(mes * 10) / 10} h).`,
      });
    }

    const propios = turnos
      .filter((t) => t.personaId === personaId)
      .map((t) => ({
        inicio: minutosAbsolutos(t.fecha, t.horaInicio),
        fin: (() => {
          let fin = minutosDeHora(t.horaFin);
          const ini = minutosDeHora(t.horaInicio);
          if (fin <= ini) fin += 1440;
          return diaNumero(t.fecha) * 1440 + fin;
        })(),
        fecha: t.fecha,
      }))
      .sort((a, b) => a.inicio - b.inicio);

    for (let i = 1; i < propios.length; i++) {
      const prev = propios[i - 1]!;
      const cur = propios[i]!;
      const descanso = (cur.inicio - prev.fin) / 60;
      if (descanso < MIN_DESCANSO_HORAS) {
        alertas.push({
          personaId,
          tipo: "descanso",
          severidad: "critica",
          mensaje: `Menos de ${MIN_DESCANSO_HORAS} h de descanso entre turnos (${Math.round(descanso * 10) / 10} h entre ${prev.fecha} y ${cur.fecha}).`,
        });
        break;
      }
    }
  }

  return alertas;
}
