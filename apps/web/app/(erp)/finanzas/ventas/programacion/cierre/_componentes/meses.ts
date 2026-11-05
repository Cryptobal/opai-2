// Utilidades de período del cierre (sin dependencias de servidor: las usa la pantalla cliente).
export const RUTA_CIERRE = "/finanzas/ventas/programacion/cierre";

/** Mes anterior o siguiente de un `AAAA-MM`. */
export function mesVecino(periodo: string, delta: number): string {
  const [a, m] = periodo.split("-").map(Number) as [number, number];
  const d = new Date(Date.UTC(a, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
