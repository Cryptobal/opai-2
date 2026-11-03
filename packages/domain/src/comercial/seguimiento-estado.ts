// Estados y transiciones del seguimiento y de sus pasos (modulos/seguimiento-comercial.md §7). Puro.
export type EstadoSeguimiento = "activo" | "pausado" | "terminado" | "cancelado";
export type EstadoPaso = "programado" | "por_hacer" | "por_preparar" | "hecho" | "omitido" | "fallido" | "cancelado";
export type AccionSeguimiento = "pausar" | "reanudar" | "cancelar" | "terminar";
export type AccionPaso = "activar" | "hacer" | "omitir" | "fallar" | "reintentar" | "cancelar" | "posponer";

const SEG: Record<EstadoSeguimiento, Partial<Record<AccionSeguimiento, EstadoSeguimiento>>> = {
  activo: { pausar: "pausado", cancelar: "cancelado", terminar: "terminado" },
  pausado: { reanudar: "activo", cancelar: "cancelado", terminar: "terminado" },
  terminado: {},
  cancelado: {},
};
const PENDIENTES: readonly EstadoPaso[] = ["programado", "por_hacer", "por_preparar", "fallido"];
const PASO: Record<AccionPaso, { desde: readonly EstadoPaso[]; hacia: EstadoPaso }> = {
  activar: { desde: ["programado"], hacia: "por_hacer" },
  hacer: { desde: ["programado", "por_hacer", "por_preparar"], hacia: "hecho" },
  omitir: { desde: ["programado", "por_hacer", "por_preparar", "fallido"], hacia: "omitido" },
  fallar: { desde: ["programado", "por_hacer"], hacia: "fallido" },
  reintentar: { desde: ["fallido"], hacia: "por_hacer" },
  cancelar: { desde: PENDIENTES, hacia: "cancelado" },
  posponer: { desde: ["programado", "por_hacer", "por_preparar"], hacia: "programado" },
};

export const transicionSeguimiento = (e: EstadoSeguimiento, a: AccionSeguimiento) => SEG[e][a] ?? null;
export const transicionPaso = (e: EstadoPaso, a: AccionPaso) => (PASO[a].desde.includes(e) ? PASO[a].hacia : null);
export const esPasoPendiente = (e: EstadoPaso) => PENDIENTES.includes(e);
export const esSeguimientoVivo = (e: EstadoSeguimiento) => e === "activo" || e === "pausado";

export type EstadoVisible = "activo" | "con_atrasos" | "pausado" | "con_fallos" | "terminado" | "cancelado";

/** Estado que ve el vendedor (piso de 1.0): atrasos = un paso por hacer ya vencido; fallos = un paso fallido. */
export function estadoVisible(
  e: EstadoSeguimiento,
  pasos: readonly { estado: EstadoPaso; programadoEn: Date }[],
  ahora: Date,
): EstadoVisible {
  if (e !== "activo") return e;
  if (pasos.some((p) => p.estado === "fallido")) return "con_fallos";
  if (pasos.some((p) => (p.estado === "por_hacer" || p.estado === "por_preparar") && p.programadoEn < ahora)) return "con_atrasos";
  return "activo";
}

/** Primer paso pendiente (por orden) o null. */
export function proximoPaso<T extends { estado: EstadoPaso; orden: number }>(pasos: readonly T[]): T | null {
  return [...pasos].sort((a, b) => a.orden - b.orden).find((p) => esPasoPendiente(p.estado)) ?? null;
}
