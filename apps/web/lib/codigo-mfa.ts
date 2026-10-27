/** Better Auth genera diez caracteres con caso significativo y un guion tras el quinto. */
export function normalizarCodigoRespaldo(valor: string): string {
  const sinEspacios = valor.replace(/\s+/g, "");
  return /^[a-zA-Z0-9]{10}$/.test(sinEspacios)
    ? `${sinEspacios.slice(0, 5)}-${sinEspacios.slice(5)}`
    : sinEspacios;
}
