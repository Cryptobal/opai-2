// Utilidades de semana ISO compartidas entre flujo y ventas (sin dependencia de modules/).

const DIA_MS = 86_400_000;
const aMs = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const aIso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Lunes de la semana ISO que contiene la fecha «aaaa-mm-dd». */
export function lunesDe(iso: string): string {
  const ms = aMs(iso);
  const dia = (new Date(ms).getUTCDay() + 6) % 7;
  return aIso(ms - dia * DIA_MS);
}
