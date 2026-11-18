/** Lo que la vigilancia de Rondas necesita de una ronda en curso o ya cerrada (CAR-501). */
export type RondaVigilada = {
  inicio: Date;
  cierre: Date | null;
  tiempoMaxMin: number;
  tiempoMaxTramoMin: number | null;
  /** Puntos obligatorios de la plantilla en su orden. */
  obligatorios: readonly string[];
  marcas: readonly { puntoId: string; hora: Date }[];
};

const MIN_MS = 60_000;
const enVentana = (t: Date, desde: Date, hasta: Date) => t >= desde && t < hasta;

/**
 * Hora en que la ronda superó su tiempo máximo, si ocurrió dentro de [desde, hasta) sin que se cerrara antes.
 * Una ronda cerrada después del plazo también estuvo atrasada.
 */
export function atrasoDeRonda(r: RondaVigilada, desde: Date, hasta: Date): Date | null {
  const vence = new Date(r.inicio.getTime() + r.tiempoMaxMin * MIN_MS);
  if (r.cierre && r.cierre <= vence) return null;
  return enVentana(vence, desde, hasta) ? vence : null;
}

/**
 * Tramos vencidos dentro de [desde, hasta): desde el inicio o la última marca pasó más que el tiempo máximo por
 * tramo sin otra marca ni cierre, con puntos obligatorios pendientes. Cada tramo vencido señala el primer punto
 * obligatorio pendiente (en el orden de la plantilla).
 */
export function tramosVencidos(
  r: RondaVigilada,
  desde: Date,
  hasta: Date,
): { vence: Date; puntoId: string }[] {
  if (!r.tiempoMaxTramoMin) return [];
  const tramo = r.tiempoMaxTramoMin * MIN_MS;
  const marcas = [...r.marcas].sort((a, b) => a.hora.getTime() - b.hora.getTime());
  const salida: { vence: Date; puntoId: string }[] = [];
  const hechos = new Set<string>();
  let previo = r.inicio;
  for (let i = 0; i <= marcas.length; i++) {
    const m = marcas[i];
    const siguiente = m?.hora ?? r.cierre;
    const pendiente = r.obligatorios.find((p) => !hechos.has(p));
    if (!pendiente) break;
    const vence = new Date(previo.getTime() + tramo);
    if ((!siguiente || siguiente > vence) && enVentana(vence, desde, hasta))
      salida.push({ vence, puntoId: pendiente });
    if (!m) break;
    hechos.add(m.puntoId);
    previo = m.hora;
  }
  return salida;
}
