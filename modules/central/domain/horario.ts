/** Franja nocturna de la Central (CAR-751): la empresa fija cuándo el agente opera sin turno abierto. */

const PATRON_HORA = /^([01]?\d|2[0-3]):([0-5]\d)$/;

export const FRANJA_NOCTURNA_INICIO = "20:00";
export const FRANJA_NOCTURNA_FIN = "08:00";

export function parseHoraLocal(texto: string): number | null {
  const m = PATRON_HORA.exec(texto.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Minutos desde medianoche en la zona civil del tenant. */
export function minutosEnZona(instante: Date, zona: string): number {
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone: zona,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(instante);
  const h = Number(p.find((x) => x.type === "hour")?.value ?? 0);
  const min = Number(p.find((x) => x.type === "minute")?.value ?? 0);
  return h * 60 + min;
}

/**
 * Si el instante cae en la franja `[inicio, fin)` en la zona del tenant. Cuando inicio > fin la franja cruza
 * medianoche (p. ej. 20:00–08:00). Inicio igual a fin significa las 24 horas.
 */
export function enFranjaNocturna(instante: Date, inicio: string, fin: string, zona: string): boolean {
  const ahora = minutosEnZona(instante, zona);
  const d = parseHoraLocal(inicio);
  const h = parseHoraLocal(fin);
  if (d === null || h === null) return false;
  if (d === h) return true;
  if (d < h) return ahora >= d && ahora < h;
  return ahora >= d || ahora < h;
}