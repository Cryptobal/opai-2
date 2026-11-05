// Pruebas de módulos (CAR-188, ADR-071 y adenda): qué pruebas vencen, cuáles avisar y qué pasa al vencer.
// Lógica pura sobre las condiciones y los estados de módulo de una empresa.

/** Días de aviso antes del vencimiento de una prueba (decisión de Carlos, 4-nov-2026). */
export const DIAS_DE_AVISO = 7;

/** Días entre dos fechas aaaa-mm-dd (b − a). */
export function diasEntre(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

export type PruebaDe = {
  moduloId: string;
  pruebaHasta: string;
  pasaACobro: boolean;
};

/** Pruebas en curso (módulo en `trial` y condición con fin de prueba), con los días que les quedan. */
export function pruebasEnCurso(
  condiciones: readonly { moduloId: string; pruebaHasta: string | null; pasaACobro: boolean }[],
  estados: ReadonlyMap<string, string>,
  dia: string,
) {
  return condiciones
    .filter((c) => c.pruebaHasta && estados.get(c.moduloId) === "trial")
    .map((c) => ({
      moduloId: c.moduloId,
      pruebaHasta: c.pruebaHasta as string,
      pasaACobro: c.pasaACobro,
      diasRestantes: diasEntre(dia, c.pruebaHasta as string),
    }));
}

/** Al vencer: con «pasa a cobro» el módulo pasa a `activo` (y se cobra); si no, a `solo_lectura`. */
export const estadoAlVencer = (p: Pick<PruebaDe, "pasaACobro">) =>
  p.pasaACobro ? "activo" : "solo_lectura";

/** Una prueba venció cuando su último día ya pasó. */
export const estaVencida = (p: { diasRestantes: number }) => p.diasRestantes < 0;

/** Debe avisarse a Plataforma: faltan `DIAS_DE_AVISO` días o menos y aún no venció. */
export const debeAvisar = (p: { diasRestantes: number }) =>
  p.diasRestantes >= 0 && p.diasRestantes <= DIAS_DE_AVISO;
