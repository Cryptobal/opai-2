// Teléfonos de Chile en E.164 ("+56987654321"). Móviles: 9 + 8 dígitos; fijos: código de área + número.

/** Normaliza a E.164 o null. Acepta "+56 9 8765 4321", "987654321", "56987654321", "22 987 6543". */
export function normalizarTelefono(entrada: string): string | null {
  let d = entrada.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("56")) d = d.slice(2);
  if (d.length !== 9 || d.startsWith("0")) return null;
  return `+56${d}`;
}

/** "+56987654321" → "+56 9 8765 4321"; "+56229876543" → "+56 2 2987 6543". */
export function formatearTelefono(e164: string): string {
  const d = e164.replace(/^\+56/, "");
  if (d.length !== 9) return e164;
  return `+56 ${d[0]} ${d.slice(1, 5)} ${d.slice(5)}`;
}
