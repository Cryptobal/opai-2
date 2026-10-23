/**
 * Dinero en OPAI 2.0.
 *
 * - CLP se representa SIEMPRE como entero (pesos). Nunca float para montos.
 * - UF y porcentajes se representan como enteros escalados (ver `UF_ESCALA`, `PCT_ESCALA`)
 *   para que toda la aritmética sea entera y determinista.
 * - Los redondeos están definidos aquí y en ningún otro lugar.
 */

/** Pesos chilenos, entero. Marca nominal para no mezclar con otros números. */
export type CLP = number & { readonly __marca: "CLP" };

/** UF con 4 decimales, como entero escalado: 1 UF = 10.000 unidades. */
export const UF_ESCALA = 10_000;

/** Porcentaje con 4 decimales, como entero escalado: 100% = 1.000.000 unidades; 19% = 190.000. */
export const PCT_ESCALA = 1_000_000;

/** IVA vigente en Chile, en unidades de `PCT_ESCALA`. */
export const IVA_PCT = 190_000;

function esEnteroFinito(n: number): boolean {
  return Number.isFinite(n) && Number.isInteger(n);
}

/** Convierte un número a CLP validando que sea entero. Lanza si no lo es. */
export function clp(n: number): CLP {
  if (!esEnteroFinito(n)) {
    throw new RangeError(`Monto CLP inválido (debe ser entero): ${n}`);
  }
  return n as CLP;
}

/**
 * Redondeo a peso entero: "mitad hacia arriba" en valor absoluto (0,5 → 1; -0,5 → -1),
 * que es la práctica contable chilena. Nunca usa `Math.round` (que sesga negativos hacia cero).
 */
export function redondearCLP(n: number): CLP {
  if (!Number.isFinite(n)) throw new RangeError(`Monto no finito: ${n}`);
  const signo = n < 0 ? -1 : 1;
  const abs = Math.abs(n);
  const entero = Math.floor(abs);
  const resto = abs - entero;
  const redondeado = resto >= 0.5 - 1e-9 ? entero + 1 : entero;
  return clp(signo * redondeado);
}

/** Suma de montos CLP. */
export function sumarCLP(...montos: readonly CLP[]): CLP {
  return clp(montos.reduce<number>((acc, m) => acc + m, 0));
}

/** Aplica un porcentaje (en unidades de `PCT_ESCALA`) a un monto CLP y redondea a peso. */
export function porcentajeCLP(monto: CLP, pct: number): CLP {
  if (!esEnteroFinito(pct)) throw new RangeError(`Porcentaje inválido: ${pct}`);
  return redondearCLP((monto * pct) / PCT_ESCALA);
}

/** IVA de un neto en CLP. */
export function ivaCLP(neto: CLP, pct: number = IVA_PCT): CLP {
  return porcentajeCLP(neto, pct);
}

/** Convierte UF (escaladas) a CLP dado el valor de la UF del día en CLP (puede tener decimales). */
export function ufACLP(uf: number, valorUfClp: number): CLP {
  if (!esEnteroFinito(uf)) throw new RangeError(`UF inválida (entero escalado): ${uf}`);
  if (!Number.isFinite(valorUfClp) || valorUfClp <= 0) {
    throw new RangeError(`Valor UF inválido: ${valorUfClp}`);
  }
  return redondearCLP((uf * valorUfClp) / UF_ESCALA);
}

/** Formato chileno: `$ 1.850.000`, `-$ 12.300`. Sin decimales. */
export function formatearCLP(monto: CLP): string {
  const abs = Math.abs(monto)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return monto < 0 ? `-$ ${abs}` : `$ ${abs}`;
}
