/** Bloques ordenables de la plantilla de cotización (sin HTML libre). */
export const BLOQUES_COTIZACION = [
  "encabezado",
  "datos_empresa",
  "resumen_comercial",
  "detalle_secciones",
  "condiciones",
  "pie",
] as const;

export type BloqueCotizacion = (typeof BLOQUES_COTIZACION)[number];

export type BloqueConfig = { id: BloqueCotizacion; activo: boolean };

export const BASES_PLANTILLA = ["clasica", "ejecutiva", "compacta"] as const;
export type BasePlantilla = (typeof BASES_PLANTILLA)[number];

export const TIPOGRAFIAS = ["inter", "helvetica", "times"] as const;
export type TipografiaDocumento = (typeof TIPOGRAFIAS)[number];

const def = (ids: BloqueCotizacion[], off: BloqueCotizacion[] = []): BloqueConfig[] =>
  BLOQUES_COTIZACION.map((id) => ({ id, activo: ids.includes(id) && !off.includes(id) }));

/** Orden y activación por defecto de cada plantilla base (layout desacoplado del PDF). */
export const BLOQUES_POR_BASE: Record<BasePlantilla, BloqueConfig[]> = {
  clasica: def([...BLOQUES_COTIZACION]),
  ejecutiva: def(["encabezado", "resumen_comercial", "detalle_secciones", "condiciones", "pie"], ["datos_empresa"]),
  compacta: def(["encabezado", "resumen_comercial", "detalle_secciones", "pie"], ["datos_empresa", "condiciones"]),
};

export function normalizarBloques(base: BasePlantilla, entrada?: BloqueConfig[]): BloqueConfig[] {
  const plantilla = BLOQUES_POR_BASE[base];
  if (!entrada?.length) return plantilla;
  const map = new Map(entrada.map((b) => [b.id, b.activo]));
  return BLOQUES_COTIZACION.map((id) => ({
    id,
    activo: map.get(id) ?? plantilla.find((p) => p.id === id)?.activo ?? true,
  }));
}

export function parseBloquesJson(json: string, base: BasePlantilla): BloqueConfig[] {
  try {
    const raw = JSON.parse(json) as BloqueConfig[];
    if (!Array.isArray(raw)) return BLOQUES_POR_BASE[base];
    return normalizarBloques(base, raw);
  } catch {
    return BLOQUES_POR_BASE[base];
  }
}
