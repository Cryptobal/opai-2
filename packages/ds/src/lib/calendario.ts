// Calendario es-CL del DS: semana desde el lunes, nombres en español, fechas ISO `aaaa-mm-dd`.

export const DIAS_SEMANA = ["L", "M", "M", "J", "V", "S", "D"] as const;
export const NOMBRES_MES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;
const DIAS_NOMBRE = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

export type Dia = { iso: string; dia: number; delMes: boolean };

const dos = (n: number) => String(n).padStart(2, "0");
export const aIso = (a: number, m: number, d: number) => `${a}-${dos(m + 1)}-${dos(d)}`;

/** Hoy en la zona del dispositivo, como ISO. */
export function hoyIso(ahora: Date = new Date()): string {
  return aIso(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
}

/** Mes visible para un ISO (o para hoy si el valor está vacío o no es una fecha). */
export function vistaDe(iso: string, ahora: Date = new Date()): { anio: number; mes: number } {
  const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(iso);
  if (m) return { anio: Number(m[1]), mes: Number(m[2]) - 1 };
  return { anio: ahora.getFullYear(), mes: ahora.getMonth() };
}

/** Mueve la vista `delta` meses (puede cruzar años). */
export function mover(v: { anio: number; mes: number }, delta: number) {
  const t = v.anio * 12 + v.mes + delta;
  return { anio: Math.floor(t / 12), mes: ((t % 12) + 12) % 12 };
}

/** Semanas (lunes a domingo) que cubren el mes; siempre 6 filas para que la altura no salte. */
export function semanas(anio: number, mes: number): Dia[][] {
  const primero = new Date(Date.UTC(anio, mes, 1));
  const desfase = (primero.getUTCDay() + 6) % 7;
  const filas: Dia[][] = [];
  for (let f = 0; f < 6; f++) {
    const fila: Dia[] = [];
    for (let c = 0; c < 7; c++) {
      const d = new Date(Date.UTC(anio, mes, 1 - desfase + f * 7 + c));
      fila.push({
        iso: aIso(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
        dia: d.getUTCDate(),
        delMes: d.getUTCMonth() === mes,
      });
    }
    filas.push(fila);
  }
  return filas;
}

/** «lunes 2 de marzo de 2026», para el nombre accesible de cada día. */
export function nombreDia(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number) as [number, number, number];
  const dow = (new Date(Date.UTC(a, m - 1, d)).getUTCDay() + 6) % 7;
  return `${DIAS_NOMBRE[dow]} ${d} de ${NOMBRES_MES[m - 1]} de ${a}`;
}
