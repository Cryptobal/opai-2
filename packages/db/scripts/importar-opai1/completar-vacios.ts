// Política «solo completar vacíos» (CAR-157): una actualización escribe únicamente en campos que
// están vacíos en 2.0. Nunca escribe nulos y nunca pisa un valor existente; si los dos lados traen
// valores distintos es un conflicto que se informa por nombre de campo y no se escribe.

export type Completado = {
  /** Campos (y valores) que se pueden escribir: vacíos en 2.0 y con valor en 1.0. */
  escribir: Record<string, unknown>;
  /** Campos con dos valores distintos (solo nombres, nunca valores). */
  conflictos: string[];
};

const vacio = (v: unknown): boolean =>
  v === null || v === undefined || (typeof v === "string" && v.trim() === "") || (Array.isArray(v) && v.length === 0);

/** Alias legible para tests y reglas de negocio. */
export const campoVacio = vacio;

const normal = (v: unknown) => JSON.stringify(Array.isArray(v) ? [...v].sort() : v);

/**
 * @param equivalentes valor que 2.0 usa como «sin dato» para un campo (p. ej. estado `prospecto`).
 */
export function completarVacios(
  propuesto: Readonly<Record<string, unknown>>,
  actual: Readonly<Record<string, unknown>>,
  equivalentes: Readonly<Record<string, unknown>> = {},
): Completado {
  const escribir: Record<string, unknown> = {};
  const conflictos: string[] = [];
  for (const campo of Object.keys(propuesto).sort()) {
    const nuevo = propuesto[campo];
    if (vacio(nuevo)) continue;
    const previo = actual[campo];
    const sinDato = vacio(previo) || (campo in equivalentes && previo === equivalentes[campo]);
    if (sinDato) {
      // Mismo valor que ya hay (p. ej. prospecto sobre prospecto): no es un cambio.
      if (normal(nuevo) !== normal(previo)) escribir[campo] = nuevo;
    }
    else if (normal(nuevo) !== normal(previo)) conflictos.push(campo);
  }
  return { escribir, conflictos };
}

/** Subconjunto de `datos` con solo las claves pedidas (campos a completar). */
export function soloCampos<D extends Record<string, unknown>>(datos: D, campos: readonly string[]): Partial<D> {
  const salida: Partial<D> = {};
  for (const c of campos) if (c in datos) (salida as Record<string, unknown>)[c] = datos[c];
  return salida;
}
