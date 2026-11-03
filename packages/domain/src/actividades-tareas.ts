// Tareas comerciales (CAR-162): agrupación de Mis tareas, texto del vencimiento y posponer.
// Funciones puras: el instante «ahora» y la zona entran como parámetros.

const ZONA = "America/Santiago";
const DIA_MS = 86_400_000;

export type GrupoTarea = "vencidas" | "hoy" | "semana" | "despues" | "sin_fecha";

export const ETIQUETA_GRUPO_TAREA: Readonly<Record<GrupoTarea, string>> = {
  vencidas: "Vencidas",
  hoy: "Hoy",
  semana: "Esta semana",
  despues: "Más adelante",
  sin_fecha: "Sin fecha",
};

/** Día `aaaa-mm-dd` de un instante en la zona. */
export function diaEnZona(instante: Date, zona = ZONA): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: zona }).format(instante);
}

/** Días de calendario entre dos días `aaaa-mm-dd` (b − a). */
function diasEntre(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DIA_MS);
}

/** Desfase de la zona respecto de UTC en minutos para un instante (Chile: −180 o −240). */
function desfaseMinutos(instante: Date, zona: string): number {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: zona,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(instante);
  const n = (t: string) => Number(partes.find((p) => p.type === t)?.value ?? 0);
  const local = Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"));
  return Math.round((local - Math.floor(instante.getTime() / 60_000) * 60_000) / 60_000);
}

/** Instante ISO (UTC) de un día y una hora locales de la zona: «2026-11-03» + «12:00». */
export function instanteEnZona(dia: string, hora: string, zona = ZONA): string {
  const base = Date.parse(`${dia}T${hora}:00Z`);
  if (Number.isNaN(base)) throw new RangeError(`Fecha u hora inválida: ${dia} ${hora}`);
  // Dos pasadas: el desfase del instante aproximado y, si cruza un cambio de hora, el del resultado.
  const primero = base - desfaseMinutos(new Date(base), zona) * 60_000;
  return new Date(base - desfaseMinutos(new Date(primero), zona) * 60_000).toISOString();
}

/** Grupo de Mis tareas: vencidas (antes de ahora), hoy, esta semana (hasta el domingo), más adelante. */
export function grupoDeTarea(
  vencimiento: string | null,
  ahora: Date,
  zona = ZONA,
): GrupoTarea {
  if (!vencimiento) return "sin_fecha";
  const v = new Date(vencimiento);
  if (v.getTime() < ahora.getTime()) return "vencidas";
  const hoy = diaEnZona(ahora, zona);
  const dias = diasEntre(hoy, diaEnZona(v, zona));
  if (dias === 0) return "hoy";
  // Lunes = 1 … domingo = 7: «esta semana» llega hasta el domingo.
  const diaSemana = new Date(`${hoy}T12:00:00Z`).getUTCDay() || 7;
  return dias <= 7 - diaSemana ? "semana" : "despues";
}

export type TonoVencimiento = "danger" | "warning" | "neutro";

/** «Vencida hace 2 días», «Vence hoy 12:00», «Vence mañana», «Vence el 05-11-2026». */
export function textoVencimiento(
  vencimiento: string | null,
  todoElDia: boolean,
  ahora: Date,
  zona = ZONA,
): { texto: string; tono: TonoVencimiento } {
  if (!vencimiento) return { texto: "Sin fecha", tono: "neutro" };
  const v = new Date(vencimiento);
  const hoy = diaEnZona(ahora, zona);
  const dia = diaEnZona(v, zona);
  const dias = diasEntre(hoy, dia);
  const hora = new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: zona,
  }).format(v);
  const conHora = todoElDia ? "" : ` ${hora}`;
  if (v.getTime() < ahora.getTime()) {
    if (dias === 0) return { texto: `Venció hoy${conHora}`, tono: "danger" };
    const n = -dias;
    return { texto: `Vencida hace ${n} ${n === 1 ? "día" : "días"}`, tono: "danger" };
  }
  if (dias === 0) return { texto: `Vence hoy${conHora}`, tono: "warning" };
  if (dias === 1) return { texto: `Vence mañana${conHora}`, tono: "neutro" };
  const [a, m, d] = dia.split("-");
  return { texto: `Vence el ${d}-${m}-${a}`, tono: "neutro" };
}

export type Posponer = "manana" | "tres_dias";

/**
 * Nuevo vencimiento al posponer: mañana o en 3 días respecto de hoy, conservando la hora local del
 * vencimiento (o 09:00 si no tenía).
 */
export function posponerTarea(
  vencimiento: string | null,
  opcion: Posponer,
  ahora: Date,
  zona = ZONA,
): string {
  const horaLocal = vencimiento
    ? new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
        timeZone: zona,
      }).format(new Date(vencimiento))
    : "09:00";
  const hoy = diaEnZona(ahora, zona);
  const destino = new Date(Date.parse(`${hoy}T12:00:00Z`) + (opcion === "manana" ? 1 : 3) * DIA_MS)
    .toISOString()
    .slice(0, 10);
  return instanteEnZona(destino, horaLocal, zona);
}
