// Política «solo completar vacíos»: nunca escribe null ni pisa un valor existente en 2.0.
import { camposDistintos } from "./comun";

export function campoVacio(val: unknown): boolean {
  if (val === null || val === undefined) return true;
  if (typeof val === "string" && val.trim() === "") return true;
  return false;
}

export type ResultadoCompletar<D extends Record<string, unknown>> = {
  patch: Partial<D>;
  campos: string[];
  conflictos: string[];
};

/** Fusiona propuesto en actual solo donde actual está vacío. */
export function completarVacios<D extends Record<string, unknown>>(
  propuesto: D,
  actual: Record<string, unknown>,
): ResultadoCompletar<D> {
  const patch: Partial<D> = {};
  const campos: string[] = [];
  const conflictos: string[] = [];
  for (const k of Object.keys(propuesto)) {
    const pv = propuesto[k];
    const av = actual[k];
    if (campoVacio(pv)) continue;
    if (campoVacio(av)) {
      patch[k as keyof D] = pv as D[keyof D];
      campos.push(k);
    } else if (JSON.stringify(pv) !== JSON.stringify(av)) conflictos.push(k);
  }
  return { patch, campos, conflictos };
}

/** Campos que cambiarían con la política de vacíos (para el plan). */
export function camposCompletarVacios<D extends Record<string, unknown>>(
  propuesto: D,
  actual: Record<string, unknown>,
): { campos: string[]; conflictos: string[] } {
  const r = completarVacios(propuesto, actual);
  return { campos: r.campos, conflictos: r.conflictos };
}

/** Comparación estricta (tests y avisos). */
export function distintosEstricto<D extends Record<string, unknown>>(
  propuesto: D,
  actual: Record<string, unknown>,
): string[] {
  return camposDistintos(propuesto, actual);
}
