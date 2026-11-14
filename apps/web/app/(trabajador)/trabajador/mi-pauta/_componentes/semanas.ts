import { formatearHora, nombreDiaSemana, nombreMesCivil } from "@opai/domain";

/** Turno propio tal como lo devuelve `portal_trabajador.mis_turnos.listar` (CAR-462). */
export type MiTurno = {
  id: string;
  fecha: string;
  inicio: string;
  fin: string;
  horas: number;
  feriado: boolean;
  origen: "pauta" | "jornada_pactada" | "manual";
  instalacion: { id: string; nombre: string };
  puesto: string | null;
};

export type MisTurnos = { zona: string; hoy: string; desde: string; hasta: string; items: MiTurno[]; siguiente: string | null };

export type Semana = { lunes: string; etiqueta: string; turnos: MiTurno[] };

const DIA_MS = 86_400_000;
const aFecha = (dia: string) => new Date(`${dia}T00:00:00Z`);
export const sumarDias = (dia: string, n: number) => new Date(aFecha(dia).getTime() + n * DIA_MS).toISOString().slice(0, 10);

/** ¿Es una fecha civil `aaaa-mm-dd` que existe? (`?desde=2026-02-30` se ignora). */
export function fechaValida(dia: string | undefined): dia is string {
  if (!dia || !/^\d{4}-\d{2}-\d{2}$/.test(dia)) return false;
  const t = Date.parse(`${dia}T00:00:00Z`);
  return !Number.isNaN(t) && new Date(t).toISOString().startsWith(dia);
}

/** Lunes de la semana del día civil `aaaa-mm-dd`. */
export function lunesDe(dia: string): string {
  const semana = (aFecha(dia).getUTCDay() + 6) % 7; // lunes = 0
  return sumarDias(dia, -semana);
}

const mes = nombreMesCivil;
const num = (dia: string) => String(Number(dia.slice(8)));

/** «Semana del 16 al 22 de noviembre» (o «del 30 de noviembre al 6 de diciembre»). */
export function etiquetaSemana(lunes: string): string {
  const domingo = sumarDias(lunes, 6);
  const inicio = mes(lunes) === mes(domingo) ? num(lunes) : `${num(lunes)} de ${mes(lunes)}`;
  return `Semana del ${inicio} al ${num(domingo)} de ${mes(domingo)}`;
}

/** Turnos agrupados por semana (lunes a domingo), en el orden en que llegan. */
export function porSemana(turnos: readonly MiTurno[]): Semana[] {
  const semanas: Semana[] = [];
  for (const t of turnos) {
    const lunes = lunesDe(t.fecha);
    const ultima = semanas.at(-1);
    if (ultima?.lunes === lunes) ultima.turnos.push(t);
    else semanas.push({ lunes, etiqueta: etiquetaSemana(lunes), turnos: [t] });
  }
  return semanas;
}

/** «Lunes 16» desde la fecha civil del turno. */
export function etiquetaDia(dia: string): string {
  const nombre = nombreDiaSemana(dia);
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${num(dia)}`;
}

/** «20:00 a 08:00» en la zona de la empresa. */
export function horario(t: Pick<MiTurno, "inicio" | "fin">, zona: string): string {
  return `${formatearHora(t.inicio, zona)} a ${formatearHora(t.fin, zona)}`;
}

/** Horas con coma decimal y sin ceros sobrantes: «12 h», «7,5 h». */
export const horas = (h: number) => `${String(h).replace(".", ",")} h`;
