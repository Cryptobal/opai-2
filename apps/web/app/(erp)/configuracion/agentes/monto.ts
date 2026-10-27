/** Interpreta montos es-CL; puntos solo como separadores de miles. */
export function montoUsd(texto: string): number | null {
  const valor = texto.trim();
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,6})?$/.test(valor)) return null;
  const numero = Number(valor.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(numero) && numero > 0 && numero <= 100_000 ? numero : null;
}
