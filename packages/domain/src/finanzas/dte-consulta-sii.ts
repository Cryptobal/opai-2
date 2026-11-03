// Sondeo SII (CAR-140, paridad 1.0): backoff 15 min × 2 h y luego diario hasta 7 días.

const MS_15MIN = 15 * 60_000;
const MS_2H = 2 * 60 * 60_000;
const MS_DIA = 24 * 60 * 60_000;
const MS_7D = 7 * MS_DIA;

/** Próxima consulta tras `intentosCompletados`; null si ya no corresponde sondear. */
export function proximaConsultaDteSii(creadoEn: Date, intentosCompletados: number): Date | null {
  const limite = creadoEn.getTime() + MS_7D;
  const n = intentosCompletados + 1;
  if (n <= 8) {
    const t = creadoEn.getTime() + n * MS_15MIN;
    return t <= limite ? new Date(t) : null;
  }
  const t = creadoEn.getTime() + MS_2H + (n - 8) * MS_DIA;
  return t <= limite ? new Date(t) : null;
}

export function consultaDteAgotada(creadoEn: Date, intentosCompletados: number): boolean {
  return proximaConsultaDteSii(creadoEn, intentosCompletados) === null;
}
