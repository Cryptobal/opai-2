// Ambiente (certificación o producción) de un CAF, según la evidencia del propio archivo (CAR-196).

import { IDK_CAF_SINTETICO_OPAI2, type CafLectura } from "./caf";

export type AmbienteCaf = "certificacion" | "produccion";

/**
 * Evidencia del propio archivo: el IDK de la llave del SII con que viene firmado el CAF. Correspondencia usada por
 * LibreDTE (IDK_CERTIFICACION = 100, IDK_PRODUCCION = 300), librería de terceros; no es documentación oficial del
 * SII. Cualquier otro IDK queda «sin determinar» (null): nunca se supone un ambiente.
 */
export const IDK_CAF_CERTIFICACION = "100";
export const IDK_CAF_PRODUCCION = "300";

/** Ambiente del CAF según el archivo. Los CAF sintéticos de OPAI 2.0 son de certificación por construcción. */
export function ambienteCafDesdeLectura(lectura: Pick<CafLectura, "idk" | "rutEmisor">): AmbienteCaf | null {
  if (lectura.idk === IDK_CAF_SINTETICO_OPAI2) return "certificacion";
  if (lectura.idk === IDK_CAF_CERTIFICACION) return "certificacion";
  if (lectura.idk === IDK_CAF_PRODUCCION) return "produccion";
  return null;
}

/** Ambiente de un rango ya cargado: el guardado, o el derivado de su IDK si es anterior a la columna. */
export function ambienteCafDeRango(r: { cafAmbiente?: string | null; cafIdk?: string | null }): AmbienteCaf | null {
  if (r.cafAmbiente === "certificacion" || r.cafAmbiente === "produccion") return r.cafAmbiente;
  return ambienteCafDesdeLectura({ idk: r.cafIdk ?? null, rutEmisor: "" });
}

export type ResultadoAmbienteCaf = { ok: true } | { ok: false; motivo: "distinto" | "sin_determinar" };

/** Un CAF solo sirve en el ambiente en que se emite; si no se puede determinar, no se usa (falla cerrado). */
export function cafCompatibleConAmbiente(
  r: { cafAmbiente?: string | null; cafIdk?: string | null },
  ambienteEmision: AmbienteCaf,
): ResultadoAmbienteCaf {
  const a = ambienteCafDeRango(r);
  if (a == null) return { ok: false, motivo: "sin_determinar" };
  return a === ambienteEmision ? { ok: true } : { ok: false, motivo: "distinto" };
}
