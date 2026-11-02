/** Huella de deduplicación de movimientos bancarios (paridad 1.0). */
export function claveDedupe(input: {
  fecha: string;
  monto: number;
  glosa: string;
  referencia?: string | null;
  suelta?: boolean;
}): string {
  const g = normalizarGlosa(input.glosa);
  const base = `${input.fecha}|${input.monto}|${g}`;
  if (input.suelta) return base;
  const ref = (input.referencia ?? "").trim();
  return `${base}|${ref}`;
}

export function normalizarGlosa(glosa: string): string {
  return glosa.trim().replace(/\s+/g, " ").toUpperCase();
}

/** Misma operación si el saldo posterior al movimiento coincide. */
export function mismoSaldoDespues(a: bigint | number | null | undefined, b: bigint | number | null | undefined): boolean {
  if (a == null || b == null) return false;
  return BigInt(a) === BigInt(b);
}
