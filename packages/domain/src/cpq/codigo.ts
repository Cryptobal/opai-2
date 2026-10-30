// Código correlativo de la cotización `CPQ-AAAA-NNN` (cpq.md §4, R54). Lógica pura.

const PATRON = /^CPQ-(\d{4})-(\d{3,})$/;

/** Formatea el código: el número va con al menos 3 dígitos (`CPQ-2026-007`, `CPQ-2026-1234`). */
export function codigoCotizacion(anio: number, numero: number): string {
  if (!Number.isInteger(anio) || anio < 2000 || anio > 9999) throw new Error("Año inválido.");
  if (!Number.isInteger(numero) || numero < 1) throw new Error("Número inválido.");
  return `CPQ-${anio}-${String(numero).padStart(3, "0")}`;
}

/**
 * Lee un código sin sufijo. Los de 1.0 con sufijo (`CPQ-2026-159-defe`) devuelven null: se importan
 * tal cual y no cuentan para el siguiente número (R54).
 */
export function leerCodigoCotizacion(codigo: string): { anio: number; numero: number } | null {
  const m = PATRON.exec(codigo);
  if (!m) return null;
  return { anio: Number(m[1]), numero: Number(m[2]) };
}

/** Siguiente número del año: continúa desde el último (de 2.0 o importado de 1.0, R54). */
export function siguienteNumero(ultimo: number | null | undefined): number {
  return (ultimo ?? 0) + 1;
}
