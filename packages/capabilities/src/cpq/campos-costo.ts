/** Permiso que muestra costo, margen y sueldos de CPQ (R59). `comun.ts` lo reexporta. */
export const PERMISO_COSTOS = "cpq:costos.ver";

/**
 * Lista central de los campos de costo y margen de CPQ (R59): los que las vistas omiten sin
 * `cpq:costos.ver`. La usan la repetición idempotente (`revalidarCostos`) y la redacción del input
 * auditado (`redactarSensibles`), para que la auditoría no sea una vía lateral para ver costos.
 * Todo campo de costo nuevo de una capacidad `cpq.*` se agrega aquí.
 */
export const CAMPOS_COSTO_CPQ = [
  "costoMensual",
  "margenEfectivo",
  "margenObjetivo",
  "modoMargen",
  "sueldoBruto",
  "costoUnitario",
  "margenPropio",
  "motivoPersonas",
] as const;

const CLAVES: ReadonlySet<string> = new Set(CAMPOS_COSTO_CPQ);
const OCULTO = "••••";

/** Si hay un campo de costo en cualquier nivel del valor (objetos y listas anidadas). */
export function contieneCostos(valor: unknown): boolean {
  if (Array.isArray(valor)) return valor.some(contieneCostos);
  if (!valor || typeof valor !== "object") return false;
  return Object.entries(valor).some(([k, v]) => CLAVES.has(k) || contieneCostos(v));
}

function ocultar(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(ocultar);
  if (!valor || typeof valor !== "object") return valor;
  return ocultarCostos(Object.fromEntries(Object.entries(valor)));
}

/** Copia con cada campo de costo presente (en cualquier nivel) reemplazado por `••••`. */
export function ocultarCostos(entrada: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(entrada).map(([k, v]) => [k, CLAVES.has(k) && v != null ? OCULTO : ocultar(v)]),
  );
}
