import { fechaLocal, instanteLocal } from "../comercial/seguimiento-agenda";

/** Horario de una programación: hora fija "HH:MM" o «cada N min» entre dos horas (rondas.md §4). */
export type HorarioRonda = string | { cadaMin: number; desde: string; hasta: string };
export type ProgramacionRonda = {
  horarios: readonly HorarioRonda[];
  /** Días 0–6 (domingo = 0). Sin días, la programación no genera rondas. */
  diasSemana: readonly number[];
  /** Vigencia en fechas civiles aaaa-mm-dd (inclusive); null = sin límite. */
  vigenciaDesde: string | null;
  vigenciaHasta: string | null;
};

const DIA_MS = 86_400_000;
const minutos = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const hora = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/**
 * Minutos desde la medianoche del día en que arranca cada horario. Un intervalo que cruza la medianoche
 * (22:00–06:00) sigue en el día siguiente: sus minutos pasan de 1440.
 */
function minutosDelDia(horarios: readonly HorarioRonda[]): number[] {
  const r = new Set<number>();
  for (const h of horarios) {
    if (typeof h === "string") {
      r.add(minutos(h));
      continue;
    }
    const desde = minutos(h.desde);
    let hasta = minutos(h.hasta);
    if (hasta < desde) hasta += 1440;
    for (let m = desde; m <= hasta; m += h.cadaMin) r.add(m);
  }
  return [...r].sort((a, b) => a - b);
}

const sumarDia = (fecha: string, dias: number) =>
  new Date(Date.parse(`${fecha}T00:00:00Z`) + dias * DIA_MS).toISOString().slice(0, 10);

/** Instantes en que la programación pide iniciar la ronda dentro de [desde, hasta), en la zona del tenant. */
export function ocurrenciasProgramacion(
  p: ProgramacionRonda,
  desde: Date,
  hasta: Date,
  zona: string,
): Date[] {
  if (p.diasSemana.length === 0 || hasta <= desde) return [];
  const mins = minutosDelDia(p.horarios);
  const salida: Date[] = [];
  // Un día antes por los intervalos que cruzan la medianoche.
  const ultimo = fechaLocal(hasta, zona);
  for (let f = sumarDia(fechaLocal(desde, zona), -1); f <= ultimo; f = sumarDia(f, 1)) {
    if (p.vigenciaDesde && f < p.vigenciaDesde) continue;
    if (p.vigenciaHasta && f > p.vigenciaHasta) continue;
    if (!p.diasSemana.includes(new Date(`${f}T00:00:00Z`).getUTCDay())) continue;
    for (const m of mins) {
      const t = instanteLocal(sumarDia(f, Math.floor(m / 1440)), hora(m % 1440), zona);
      if (t >= desde && t < hasta) salida.push(t);
    }
  }
  return salida.sort((a, b) => a.getTime() - b.getTime());
}
