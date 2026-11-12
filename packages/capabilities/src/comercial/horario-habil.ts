// Horario hábil para el plazo de primera respuesta (CAR-299, decisión de Carlos del 11-nov-2026):
// lunes a viernes, de 8:00 a 18:00 en la zona de la empresa. Lógica pura.
export const INICIO_HABIL_MIN = 8 * 60;
export const FIN_HABIL_MIN = 18 * 60;
export const ZONA_POR_DEFECTO = "America/Santiago";

const DIAS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function localDe(fecha: Date, zona: string): { dia: number; min: number } {
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: zona,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(fecha);
  const v = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return { dia: DIAS.indexOf(v("weekday")), min: Number(v("hour")) * 60 + Number(v("minute")) };
}

/** ¿Cae el instante dentro del horario hábil (lun–vie, 8:00 a 18:00 locales)? */
export function esHabil(fecha: Date, zona = ZONA_POR_DEFECTO): boolean {
  const { dia, min } = localDe(fecha, zona);
  return dia >= 1 && dia <= 5 && min >= INICIO_HABIL_MIN && min < FIN_HABIL_MIN;
}

/**
 * Instante en que se cumplen `horas` hábiles desde `desde`. Fuera de horario, el reloj arranca en la
 * próxima apertura. Avanza por tramos y recalcula la hora local cada vez, así tolera el cambio de hora.
 */
export function sumarHorasHabiles(desde: Date, horas: number, zona = ZONA_POR_DEFECTO): Date {
  let t = desde.getTime();
  let resta = Math.round(horas * 60);
  for (let i = 0; i < 5000; i += 1) {
    const { dia, min } = localDe(new Date(t), zona);
    if (dia === 0 || dia === 6 || min >= FIN_HABIL_MIN) {
      t += (24 * 60 - min) * 60_000; // hasta la medianoche local; luego se recalcula
    } else if (min < INICIO_HABIL_MIN) {
      t += (INICIO_HABIL_MIN - min) * 60_000;
    } else {
      const tramo = Math.min(resta, FIN_HABIL_MIN - min);
      t += tramo * 60_000;
      resta -= tramo;
      if (resta <= 0) return new Date(t);
    }
  }
  return new Date(t);
}
