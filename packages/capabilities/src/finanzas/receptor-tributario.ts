// Datos tributarios del receptor que el SII exige en una factura, nota de crédito o de débito: giro, dirección y
// comuna. Decisión de Carlos (CAR-240): si faltan, no se rellenan como en OPAI 1.0 («Sin Giro», «Santiago»); se
// bloquea la emisión real con un mensaje que dice qué falta, para que se complete en la ficha del cliente.

const CAMPOS = [
  ["giro", "giro"],
  ["calle", "dirección"],
  ["comuna", "comuna"],
] as const;

type CuentaTributaria = { giro: string | null; calle: string | null; comuna: string | null };

/** Nombres legibles de los datos que le faltan al cliente, en orden: giro, dirección, comuna. */
export function faltantesReceptorTributario(c: CuentaTributaria): string[] {
  return CAMPOS.filter(([campo]) => !c[campo]?.trim()).map(([, nombre]) => nombre);
}

const lista = (xs: readonly string[]) =>
  xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} y ${xs.at(-1) ?? ""}`;

/** Mensaje para la persona; null si no falta nada. */
export function mensajeFaltantesReceptor(c: CuentaTributaria): string | null {
  const f = faltantesReceptorTributario(c);
  if (f.length === 0) return null;
  const [falta, completa] = f.length === 1 ? ["le falta un dato tributario", "Complétalo"] : ["le faltan datos tributarios", "Complétalos"];
  return `Al cliente ${falta}: ${lista(f)}. ${completa} en la ficha del cliente antes de emitir al SII.`;
}
