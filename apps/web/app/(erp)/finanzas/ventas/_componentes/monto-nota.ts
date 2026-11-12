/** CodRef 2 de la nota de crédito: corrige solo texto, sin monto. */
export const CODIGO_CORRIGE_TEXTO = "2";

/** Si la nota solo corrige texto, el formulario no pide monto. */
export function corrigeSoloTexto(codigo: string): boolean {
  return codigo === CODIGO_CORRIGE_TEXTO;
}

/**
 * Monto que se manda al servidor. Corregir texto va con 0: el servidor lo sube al mínimo simbólico de $1
 * (`montoEfectivoNotaCredito`), así que la persona nunca emite por error una corrección de texto por el total.
 */
export function montoParaNota(codigo: string, monto: string): number {
  return corrigeSoloTexto(codigo) ? 0 : Number(monto);
}

/** El monto es válido: no hace falta si solo corrige texto; si no, entero entre 1 y el total. */
export function montoDeNotaValido(codigo: string, monto: string, total: number): boolean {
  if (corrigeSoloTexto(codigo)) return true;
  const valor = Number(monto);
  return Number.isInteger(valor) && valor > 0 && valor <= total;
}
