/** Monto CLP entero tal como se escribe en Chile: «1.234» es mil doscientos treinta y cuatro (hallazgo 13). */
export function parsearMontoUi(
  texto: string,
): { ok: true; monto: number } | { ok: false; error: string } {
  const t = texto.trim();
  if (!t) return { ok: false, error: "Escribe un monto." };
  if (!/^\d+(\.\d{3})*$/.test(t) && !/^\d+$/.test(t))
    return {
      ok: false,
      error: "Usa números enteros, con punto de miles opcional (ej. 1.234.567). Sin comas ni decimales.",
    };
  const monto = Number(t.replace(/\./g, ""));
  if (!Number.isSafeInteger(monto) || monto > 1_000_000_000_000)
    return { ok: false, error: "El monto es demasiado grande." };
  return { ok: true, monto };
}
