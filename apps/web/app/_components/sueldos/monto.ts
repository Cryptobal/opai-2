export const TOPE_MONTO = 100_000_000;
export const ERROR_MONTO = "Solo pesos enteros, sin decimales ni signo";

export function parsearMonto(valor: string): number | null {
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)$/.test(valor)) return null;
  const monto = Number(valor.replaceAll(".", ""));
  return Number.isSafeInteger(monto) && monto <= TOPE_MONTO ? monto : null;
}

export function errorMonto(valor: string): string | undefined {
  if (!valor || parsearMonto(valor) !== null) return undefined;
  return /^(?:\d+|\d{1,3}(?:\.\d{3})+)$/.test(valor)
    ? "Máximo 100.000.000 pesos por concepto"
    : ERROR_MONTO;
}
