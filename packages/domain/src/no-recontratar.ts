// P1 "No recontratar" (Personas y Cargos PR 1). El art. 13 d) de la Ley 19.628, modificada por la
// Ley 21.719, rige desde el 01-12-2026: antes de esa fecha la marca no se activa en producción. Un
// solo lugar decide esto (capacidad, API y MCP comparten la misma capacidad; la UI lo consulta
// igual) para que no se pueda activar antes desde ningún borde.

/** Fecha desde la que rige el art. 13 d) (vigente desde la Ley 21.719, UTC). */
export const VIGENCIA_NO_RECONTRATAR = "2026-12-01T00:00:00Z";

/**
 * Si la marca P1 se puede activar ahora. `produccion` distingue el build real (Vercel) de dev/test;
 * `forzar` es el único escape explícito para tests y e2e que necesitan probarla antes de la fecha.
 */
export function noRecontratarHabilitada(o: {
  ahora: Date;
  produccion: boolean;
  forzar: boolean;
}): boolean {
  if (o.forzar) return true;
  if (!o.produccion) return true;
  return o.ahora >= new Date(VIGENCIA_NO_RECONTRATAR);
}
