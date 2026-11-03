// Agenda de un seguimiento: fecha civil de cada paso (días hábiles o corridos) y su instante UTC a la
// hora local del tenant (R7). El día del ancla no cuenta. Lógica pura sobre el calendario hábil del núcleo.
import { type AmbitoHabil, esHabil, sumarDias, sumarDiasHabiles } from "../calendario";
import type { ConfigPlan } from "./seguimiento-plan";

/** Desfase (ms) de la zona respecto de UTC en el instante `t`. */
function desfase(t: number, zona: string): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: zona, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric",
      hour: "numeric", minute: "numeric", second: "numeric",
    }).formatToParts(new Date(t)).map((x) => [x.type, Number(x.value)]),
  ) as Record<string, number>;
  return Date.UTC(p["year"]!, p["month"]! - 1, p["day"]!, p["hour"]!, p["minute"]!, p["second"]!) - Math.floor(t / 1000) * 1000;
}

/** Instante UTC de «fecha aaaa-mm-dd a las HH:mm» en la zona (resuelve el horario de verano). */
export function instanteLocal(fecha: string, hora: string, zona: string): Date {
  const [y, m, d] = fecha.split("-").map(Number) as [number, number, number];
  const [hh, mm] = hora.split(":").map(Number) as [number, number];
  const nominal = Date.UTC(y, m - 1, d, hh, mm);
  const t1 = nominal - desfase(nominal, zona);
  return new Date(nominal - desfase(t1, zona));
}

/** Fecha civil aaaa-mm-dd de un instante en la zona. */
export function fechaLocal(instante: Date, zona: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: zona }).format(instante);
}

/** Con 0 días hábiles, un día no hábil pasa al siguiente hábil; con corridos no se mueve. */
function sumar(base: string, dias: number, conteo: ConfigPlan["conteo"], ambito: AmbitoHabil): string {
  if (conteo === "corridos") return sumarDias(base, dias);
  if (dias === 0) return esHabil(base, ambito) ? base : sumarDiasHabiles(base, 1, ambito);
  return sumarDiasHabiles(base, dias, ambito);
}

export type PasoAgendado = { orden: number; fecha: string; programadoEn: Date };

/** Fechas de todos los pasos del plan para un ancla. `orden` parte en 1. */
export function agendarPasos(
  config: ConfigPlan,
  ancla: Date,
  ambito: AmbitoHabil,
  zona: string,
): PasoAgendado[] {
  const diaAncla = fechaLocal(ancla, zona);
  let previa = diaAncla;
  return config.pasos.map((p, i) => {
    const fecha = sumar(config.desde === "inicio" ? diaAncla : previa, p.dias, config.conteo, ambito);
    previa = fecha;
    return { orden: i + 1, fecha, programadoEn: instanteLocal(fecha, p.hora ?? config.hora, zona) };
  });
}

/** Próximo día hábil (o el mismo, si hoy lo es y la hora aún no pasó) a la hora dada: al reanudar. */
export function proximoMomento(ahora: Date, hora: string, conteo: ConfigPlan["conteo"], ambito: AmbitoHabil, zona: string): Date {
  const hoy = fechaLocal(ahora, zona);
  const hoyOk = (conteo === "corridos" || esHabil(hoy, ambito)) && instanteLocal(hoy, hora, zona) > ahora;
  const fecha = hoyOk ? hoy : conteo === "corridos" ? sumarDias(hoy, 1) : sumarDiasHabiles(hoy, 1, ambito);
  return instanteLocal(fecha, hora, zona);
}

