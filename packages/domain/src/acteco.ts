// Actividad económica del SII (ACTECO, clasificación CIIU4.CL) de una empresa (CAR-243): varios códigos y uno principal.
// La emisión DTE informa el principal en `<Acteco>`. Lógica pura: el catálogo con las glosas vive aparte
// (`@opai/domain/acteco-catalogo`), solo en el servidor, para no sumar su peso al JS del cliente.

/** Tope de códigos por empresa. El SII admite hasta 4 en el encabezado de un DTE; una empresa puede tener más giros. */
export const ACTECO_MAX_CODIGOS = 20;

/** ACTECO válido: entero de 1 a 999.999 (el SII los publica con 6 dígitos, algunos con cero a la izquierda). */
export const actecoValido = (n: unknown): n is number =>
  typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 999_999;

/** Código con sus 6 dígitos, como lo publica el SII (11101 → «011101»). */
export const formatearActeco = (n: number): string => String(n).padStart(6, "0");

/** Lee un código escrito a mano: solo dígitos (se ignoran espacios y puntos), de 1 a 6. */
export function leerActeco(texto: string): number | null {
  const t = texto.replace(/[\s.]/g, "");
  if (!/^\d{1,6}$/.test(t)) return null;
  const n = Number(t);
  return actecoValido(n) ? n : null;
}

export type ActividadesEmpresa = { codigos: number[]; principal: number | null };

/**
 * Normaliza la selección: sin repetidos, el principal primero y el resto en el orden dado. Devuelve el motivo si no es
 * válida: un código fuera de rango, más de `ACTECO_MAX_CODIGOS`, sin principal habiendo códigos, o un principal que no
 * está en la lista. Una lista vacía (sin principal) es válida: la empresa aún no informa su actividad.
 */
export function normalizarActividades(
  entrada: ActividadesEmpresa,
): { ok: true; valor: ActividadesEmpresa } | { ok: false; motivo: string } {
  const unicos = [...new Set(entrada.codigos)];
  const malo = unicos.find((c) => !actecoValido(c));
  if (malo !== undefined) return { ok: false, motivo: `El código ${malo} no es un ACTECO válido (6 dígitos del SII).` };
  if (unicos.length > ACTECO_MAX_CODIGOS)
    return { ok: false, motivo: `Se aceptan hasta ${ACTECO_MAX_CODIGOS} actividades económicas.` };
  if (unicos.length === 0) {
    return entrada.principal == null
      ? { ok: true, valor: { codigos: [], principal: null } }
      : { ok: false, motivo: "El ACTECO principal debe estar entre los códigos de la empresa." };
  }
  if (entrada.principal == null) return { ok: false, motivo: "Marca cuál es el ACTECO principal." };
  if (!unicos.includes(entrada.principal))
    return { ok: false, motivo: "El ACTECO principal debe estar entre los códigos de la empresa." };
  const p = entrada.principal;
  return { ok: true, valor: { codigos: [p, ...unicos.filter((c) => c !== p)], principal: p } };
}
