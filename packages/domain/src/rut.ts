// RUT chileno (módulo 11). Forma canónica en base de datos: "16234567-8" (sin puntos, DV en
// mayúscula). Formato visible: "16.234.567-8".

/** Dígito verificador del cuerpo numérico ("0"–"9" o "K"). */
export function digitoVerificador(cuerpo: string): string {
  let suma = 0;
  let factor = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const resto = 11 - (suma % 11);
  return resto === 11 ? "0" : resto === 10 ? "K" : String(resto);
}

/**
 * Normaliza cualquier escritura ("16.234.567-8", "16234567-8", "162345678", " 16 234 567 k ")
 * a la forma canónica, o null si no es un RUT válido.
 */
export function normalizarRut(entrada: string): string | null {
  const limpio = entrada.replace(/[^0-9kK]/g, "").toUpperCase();
  if (limpio.length < 2 || limpio.length > 9) return null;
  const cuerpo = limpio.slice(0, -1).replace(/^0+/, "");
  const dv = limpio.slice(-1);
  if (!/^\d{1,8}$/.test(cuerpo) || Number(cuerpo) < 100_000) return null;
  return digitoVerificador(cuerpo) === dv ? `${cuerpo}-${dv}` : null;
}

export function rutValido(entrada: string): boolean {
  return normalizarRut(entrada) !== null;
}

/** "16234567-8" → "16.234.567-8". Si no es válido, devuelve la entrada sin cambios. */
export function formatearRut(entrada: string): string {
  const rut = normalizarRut(entrada);
  if (!rut) return entrada;
  const [cuerpo, dv] = rut.split("-") as [string, string];
  return `${cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}-${dv}`;
}
