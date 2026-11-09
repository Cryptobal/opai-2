// Casos sintéticos de Asistencia · Face ID (CAR-89) para validar la presencia en la Pauta en una empresa `qa-…`.
// Todo ficticio: personas «QA Caso NN», RUT generados, rostros simulados `rostro:<token>`. Fuente única del seed
// (`seed-asistencia-qa.ts`), del test de base y del manifiesto (`docs/2.0/qa/asistencia-face-id/manifiesto.md`).
// La marca lleva siempre la hora del servidor (hecho regulado, no se puede fechar hacia atrás): los turnos se anclan
// al instante de la siembra, y la hora de las marcas es la de la siembra.
export type EstadoPresencia = "presente" | "incompleto" | "sin_marca" | "ausente" | "sin_turno";
export type CasoQa = {
  id: string;
  titulo: string;
  /** Inicio y duración del turno respecto del instante de la siembra (minutos; negativo = antes). */
  inicioMin: number;
  duracionMin: number;
  /** Marcas que se registran al sembrar (en orden). */
  marcas: readonly ("entrada" | "salida")[];
  metodo: "rut_pin" | "rostro";
  esperado: EstadoPresencia;
  /** Cuántas veces se reintenta cada marca con la misma clave (idempotencia); 1 = una sola vez. */
  intentos: number;
};

const H = 60;
export const CASOS_QA: readonly CasoQa[] = [
  { id: "QA-01", titulo: "Presente con RUT + PIN", inicioMin: -2 * H, duracionMin: 8 * H, marcas: ["entrada", "salida"], metodo: "rut_pin", esperado: "presente", intentos: 1 },
  { id: "QA-02", titulo: "Presente con rostro (debe verse igual que QA-01)", inicioMin: -2 * H, duracionMin: 8 * H, marcas: ["entrada", "salida"], metodo: "rostro", esperado: "presente", intentos: 1 },
  { id: "QA-03", titulo: "Solo entrada: sin salida", inicioMin: -2 * H, duracionMin: 8 * H, marcas: ["entrada"], metodo: "rut_pin", esperado: "incompleto", intentos: 1 },
  { id: "QA-04", titulo: "Turno ya terminado sin ninguna marca: ausente", inicioMin: -30 * H, duracionMin: 8 * H, marcas: [], metodo: "rut_pin", esperado: "ausente", intentos: 1 },
  { id: "QA-05", titulo: "Entrada 45 min tarde: presente con atraso", inicioMin: -45, duracionMin: 8 * H, marcas: ["entrada", "salida"], metodo: "rut_pin", esperado: "presente", intentos: 1 },
  { id: "QA-06", titulo: "Turno en curso sin marca todavía", inicioMin: -H, duracionMin: 8 * H, marcas: [], metodo: "rut_pin", esperado: "sin_marca", intentos: 1 },
  { id: "QA-07", titulo: "Reintento con la misma clave: una sola marca por entrada y salida", inicioMin: -2 * H, duracionMin: 8 * H, marcas: ["entrada", "salida"], metodo: "rut_pin", esperado: "presente", intentos: 3 },
];

/** Fecha (YYYY-MM-DD) y hora (HH:mm) en Santiago de un instante: la zona solo se usa para presentar. */
export function enSantiago(d: Date): { fecha: string; hora: string } {
  const f = (o: Intl.DateTimeFormatOptions, loc: string) => new Intl.DateTimeFormat(loc, { timeZone: "America/Santiago", ...o }).format(d);
  return { fecha: f({}, "en-CA"), hora: f({ hour: "2-digit", minute: "2-digit", hour12: false }, "es-CL") };
}
